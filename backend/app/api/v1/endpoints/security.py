"""
Endpoints administrativos e de verificação para o Escudo Anti-Carding, Velocity Check e Blacklist (#10).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.schemas.security import (
    BlacklistEntryCreate,
    BlacklistEntryUpdate,
    BlacklistEntryResponse,
    SecuritySettingsResponse,
    SecuritySettingsUpdate,
    CardAttemptLogResponse,
    SecurityStatusCheckResponse,
)
from app.services import security_service

router = APIRouter()


# ==============================================================================
# 1. Configurações Globais de Segurança (Velocity Check & Auto-Blacklist)
# ==============================================================================

@router.get("/settings", response_model=SecuritySettingsResponse)
def get_security_settings_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna as configurações atuais do Escudo Anti-Carding e Blacklist."""
    return security_service.get_security_settings(db)


@router.put("/settings", response_model=SecuritySettingsResponse)
def update_security_settings_endpoint(
    payload: SecuritySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza as regras de threshold e janelas do Velocity Check e auto-blacklist."""
    return security_service.update_security_settings(db, payload)


# ==============================================================================
# 2. Gestão da Blacklist (Lista Negra Própria)
# ==============================================================================

@router.get("/blacklist", response_model=List[BlacklistEntryResponse])
def list_blacklist_endpoint(
    search: Optional[str] = Query(None, description="Busca por valor ou motivo"),
    entry_type: Optional[str] = Query(None, description="Filtro por tipo: 'cpf', 'email', 'phone', 'ip'"),
    active_only: bool = Query(False, description="Exibir apenas entradas ativas"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista as entradas cadastradas na Blacklist com suporte a filtros e busca."""
    return security_service.list_blacklist_entries(
        db,
        search=search,
        entry_type=entry_type,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )


@router.post("/blacklist", response_model=BlacklistEntryResponse, status_code=status.HTTP_201_CREATED)
def create_blacklist_entry_endpoint(
    payload: BlacklistEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adiciona um novo identificador (CPF, E-mail, Telefone ou IP) à Blacklist."""
    return security_service.add_blacklist_entry(db, payload)


@router.put("/blacklist/{entry_id}", response_model=BlacklistEntryResponse)
def update_blacklist_entry_endpoint(
    entry_id: int,
    payload: BlacklistEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza o motivo ou ativa/desativa uma entrada da Blacklist."""
    return security_service.update_blacklist_entry(db, entry_id, payload)


@router.delete("/blacklist/{entry_id}", status_code=status.HTTP_200_OK)
def delete_blacklist_entry_endpoint(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove definitivamente uma entrada da Blacklist."""
    security_service.delete_blacklist_entry(db, entry_id)
    return {"message": "Entrada removida da Blacklist com sucesso."}


# ==============================================================================
# 3. Auditoria de Tentativas de Cartão (Logs do Velocity Check)
# ==============================================================================

@router.get("/card-attempts", response_model=List[CardAttemptLogResponse])
def list_card_attempts_endpoint(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o histórico das últimas tentativas de cartão registradas pelo sistema."""
    from app.models.security import CardAttemptLog
    return (
        db.query(CardAttemptLog)
        .order_by(CardAttemptLog.created_at.desc())
        .limit(limit)
        .all()
    )


# ==============================================================================
# 4. Rota Pública de Verificação de Segurança (Usada pelo Checkout)
# ==============================================================================

@router.get("/check-status", response_model=SecurityStatusCheckResponse)
def check_client_security_status_endpoint(
    request: Request,
    cpf: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Verifica o status de segurança do cliente para orientar a interface do checkout:
    Informa se o cartão está bloqueado pelo Velocity Check ou se há bloqueio de Blacklist.
    """
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip:
        client_ip = request.client.host if request.client else "127.0.0.1"

    is_bl, bl_reason = security_service.check_is_blacklisted(
        db, cpf=cpf, email=email, phone=phone, ip_address=client_ip
    )
    is_vel, fail_count, vel_msg = security_service.check_velocity_limit(
        db, ip_address=client_ip, cpf=cpf, email=email
    )

    is_card_allowed = not (is_bl or is_vel)
    message = bl_reason if is_bl else (vel_msg if is_vel else None)

    return SecurityStatusCheckResponse(
        is_card_allowed=is_card_allowed,
        is_blacklisted=is_bl,
        is_velocity_blocked=is_vel,
        failed_attempts_in_window=fail_count,
        message=message,
    )
