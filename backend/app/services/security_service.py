"""
Serviço do Escudo Anti-Carding, Velocity Check e Blacklist Própria (#10).
Fornece proteção preventiva contra testes automatizados de cartões clonados e chargebacks.
"""
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime, timezone, timedelta
import re
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.security import BlacklistEntry, CardAttemptLog, SecuritySettings
from app.models.order import Order
from app.schemas.security import (
    BlacklistEntryCreate,
    BlacklistEntryUpdate,
    SecuritySettingsUpdate,
)


def normalize_security_value(entry_type: str, val: str) -> str:
    """Normaliza o valor da entrada de acordo com seu tipo."""
    if not val:
        return ""
    clean = str(val).strip()
    if entry_type == "cpf":
        return re.sub(r"\D", "", clean)
    if entry_type == "email":
        return clean.lower()
    if entry_type == "phone":
        return re.sub(r"[\s\(\)\-]", "", clean)
    if entry_type == "ip":
        return clean.split(",")[0].strip()
    return clean


def get_security_settings(db: Session) -> SecuritySettings:
    """Obtém as configurações de segurança ou cria o registro padrão."""
    settings = db.query(SecuritySettings).filter(SecuritySettings.id == 1).first()
    if not settings:
        settings = SecuritySettings(
            id=1,
            velocity_threshold=5,
            velocity_window_minutes=10,
            auto_blacklist_on_chargeback=True,
            is_velocity_enabled=True,
            is_blacklist_enabled=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_security_settings(db: Session, data: SecuritySettingsUpdate) -> SecuritySettings:
    """Atualiza as configurações de segurança."""
    settings = get_security_settings(db)
    if data.velocity_threshold is not None:
        settings.velocity_threshold = data.velocity_threshold
    if data.velocity_window_minutes is not None:
        settings.velocity_window_minutes = data.velocity_window_minutes
    if data.auto_blacklist_on_chargeback is not None:
        settings.auto_blacklist_on_chargeback = data.auto_blacklist_on_chargeback
    if data.is_velocity_enabled is not None:
        settings.is_velocity_enabled = data.is_velocity_enabled
    if data.is_blacklist_enabled is not None:
        settings.is_blacklist_enabled = data.is_blacklist_enabled

    db.commit()
    db.refresh(settings)
    logger.info(f"Configurações de segurança atualizadas: threshold={settings.velocity_threshold}, window={settings.velocity_window_minutes}min")
    return settings


def check_is_blacklisted(
    db: Session,
    cpf: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Verifica se qualquer identificador do cliente consta ativo na Blacklist.
    Retorna (is_blocked, motivo_do_bloqueio).
    """
    settings = get_security_settings(db)
    if not settings.is_blacklist_enabled:
        return False, None

    checks = []
    if cpf:
        checks.append(("cpf", normalize_security_value("cpf", cpf)))
    if email:
        checks.append(("email", normalize_security_value("email", email)))
    if phone:
        checks.append(("phone", normalize_security_value("phone", phone)))
    if ip_address:
        checks.append(("ip", normalize_security_value("ip", ip_address)))

    for entry_type, normalized_val in checks:
        if not normalized_val:
            continue
        entry = (
            db.query(BlacklistEntry)
            .filter(
                BlacklistEntry.entry_type == entry_type,
                BlacklistEntry.value == normalized_val,
                BlacklistEntry.is_active == True,
            )
            .first()
        )
        if entry:
            reason = entry.reason or "Identificador bloqueado na Blacklist."
            logger.warning(f"🚫 Tentativa de compra bloqueada pela Blacklist [{entry_type.upper()}]: {normalized_val} (Motivo: {reason})")
            return True, f"Acesso não autorizado para este {entry_type.upper()}: {reason}"

    return False, None


def check_velocity_limit(
    db: Session,
    ip_address: Optional[str] = None,
    cpf: Optional[str] = None,
    email: Optional[str] = None,
) -> Tuple[bool, int, str]:
    """
    Verifica o Velocity Check em tempo real.
    Se houver 5 ou mais tentativas recusadas/bloqueadas nos últimos 10 minutos para
    o mesmo IP, CPF ou E-mail, bloqueia preventivamente novas tentativas no cartão.
    Retorna (is_blocked, total_falhas, mensagem).
    """
    settings = get_security_settings(db)
    if not settings.is_velocity_enabled:
        return False, 0, ""

    threshold = settings.velocity_threshold or 5
    window_minutes = settings.velocity_window_minutes or 10
    now_utc = datetime.now(timezone.utc)
    window_start = now_utc - timedelta(minutes=window_minutes)

    norm_cpf = normalize_security_value("cpf", cpf) if cpf else None
    norm_email = normalize_security_value("email", email) if email else None
    norm_ip = normalize_security_value("ip", ip_address) if ip_address else None

    filters = []
    if norm_ip:
        filters.append(CardAttemptLog.ip_address == norm_ip)
    if norm_cpf:
        filters.append(CardAttemptLog.cpf == norm_cpf)
    if norm_email:
        filters.append(CardAttemptLog.email == norm_email)

    if not filters:
        return False, 0, ""

    failed_count = (
        db.query(func.count(CardAttemptLog.id))
        .filter(
            CardAttemptLog.created_at >= window_start,
            CardAttemptLog.status.in_(["declined", "blocked"]),
            or_(*filters),
        )
        .scalar()
        or 0
    )

    if failed_count >= threshold:
        msg = (
            f"Múltiplas tentativas de cartão recusadas recentemente ({failed_count} tentativas nos últimos {window_minutes} minutos). "
            f"Por motivos de segurança, o pagamento com cartão está temporariamente suspenso. Conclua seu pedido via Pix ou Cripto."
        )
        logger.warning(f"🛡️ Velocity Check disparado: {failed_count} falhas >= {threshold} (IP={norm_ip}, CPF={norm_cpf}, Email={norm_email})")
        return True, failed_count, msg

    return False, failed_count, ""


def log_card_attempt(
    db: Session,
    ip_address: Optional[str] = None,
    cpf: Optional[str] = None,
    email: Optional[str] = None,
    status: str = "declined",
    reason: Optional[str] = None,
    order_code: Optional[str] = None,
    device_fingerprint: Optional[str] = None,
) -> CardAttemptLog:
    """Registra uma tentativa de pagamento com cartão para auditoria e velocity check."""
    norm_cpf = normalize_security_value("cpf", cpf) if cpf else None
    norm_email = normalize_security_value("email", email) if email else None
    norm_ip = normalize_security_value("ip", ip_address) if ip_address else None

    attempt = CardAttemptLog(
        ip_address=norm_ip,
        cpf=norm_cpf,
        email=norm_email,
        device_fingerprint=device_fingerprint,
        order_code=order_code,
        status=status,
        reason=reason,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def add_blacklist_entry(db: Session, data: BlacklistEntryCreate) -> BlacklistEntry:
    """Adiciona ou reativa uma entrada na Blacklist."""
    norm_val = normalize_security_value(data.entry_type, data.value)
    if not norm_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor informado para bloqueio é inválido.",
        )

    existing = (
        db.query(BlacklistEntry)
        .filter(
            BlacklistEntry.entry_type == data.entry_type,
            BlacklistEntry.value == norm_val,
        )
        .first()
    )
    if existing:
        existing.is_active = True
        existing.reason = data.reason or existing.reason
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        logger.info(f"Entrada de Blacklist reativada: {data.entry_type}={norm_val}")
        return existing

    new_entry = BlacklistEntry(
        entry_type=data.entry_type,
        value=norm_val,
        reason=data.reason,
        is_active=data.is_active,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    logger.info(f"Nova entrada criada na Blacklist: {data.entry_type}={norm_val}")
    return new_entry


def update_blacklist_entry(db: Session, entry_id: int, data: BlacklistEntryUpdate) -> BlacklistEntry:
    """Atualiza status ou motivo de uma entrada da Blacklist."""
    entry = db.query(BlacklistEntry).filter(BlacklistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada de Blacklist não encontrada.")

    if data.reason is not None:
        entry.reason = data.reason
    if data.is_active is not None:
        entry.is_active = data.is_active
    entry.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(entry)
    return entry


def delete_blacklist_entry(db: Session, entry_id: int) -> bool:
    """Remove uma entrada da Blacklist."""
    entry = db.query(BlacklistEntry).filter(BlacklistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada de Blacklist não encontrada.")

    db.delete(entry)
    db.commit()
    logger.info(f"Entrada de Blacklist removida (ID {entry_id}): {entry.entry_type}={entry.value}")
    return True


def list_blacklist_entries(
    db: Session,
    search: Optional[str] = None,
    entry_type: Optional[str] = None,
    active_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[BlacklistEntry]:
    """Lista as entradas da Blacklist com filtros."""
    query = db.query(BlacklistEntry)
    if active_only:
        query = query.filter(BlacklistEntry.is_active == True)
    if entry_type:
        query = query.filter(BlacklistEntry.entry_type == entry_type)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(or_(BlacklistEntry.value.ilike(s), BlacklistEntry.reason.ilike(s)))

    return query.order_by(BlacklistEntry.created_at.desc()).offset(offset).limit(limit).all()


def handle_auto_blacklist_chargeback(db: Session, order: Order) -> List[BlacklistEntry]:
    """Bloqueia automaticamente CPF, e-mail e telefone do cliente após ocorrência de chargeback."""
    settings = get_security_settings(db)
    if not settings.auto_blacklist_on_chargeback:
        return []

    created_entries = []
    reason = f"Bloqueio automático por Chargeback no pedido {order.order_code}"

    if order.customer_cpf:
        entry = add_blacklist_entry(db, BlacklistEntryCreate(entry_type="cpf", value=order.customer_cpf, reason=reason))
        created_entries.append(entry)

    if order.customer_email:
        entry = add_blacklist_entry(db, BlacklistEntryCreate(entry_type="email", value=order.customer_email, reason=reason))
        created_entries.append(entry)

    if order.customer_phone:
        entry = add_blacklist_entry(db, BlacklistEntryCreate(entry_type="phone", value=order.customer_phone, reason=reason))
        created_entries.append(entry)

    logger.warning(f"🚨 Auto-blacklist por chargeback aplicado para o pedido {order.order_code}: {len(created_entries)} itens adicionados.")
    return created_entries
