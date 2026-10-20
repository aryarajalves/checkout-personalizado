from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from datetime import datetime, timezone
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class BlacklistEntry(Base):
    """
    Entrada da Lista Negra (Blacklist) para bloqueio preventivo de fraudes e chargebacks.
    Tipos suportados: 'cpf', 'email', 'phone', 'ip'.
    """
    __tablename__ = "blacklist_entries"

    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(String(20), nullable=False, index=True) # 'cpf', 'email', 'phone', 'ip'
    value = Column(String(255), nullable=False, index=True) # Normalizado
    reason = Column(String(500), nullable=True) # Motivo do bloqueio
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class CardAttemptLog(Base):
    """
    Registro em tempo real de tentativas de pagamento com cartão de crédito.
    Usado pelo Velocity Check para barrar ataques de carding (tentativas excessivas).
    """
    __tablename__ = "card_attempt_logs"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), nullable=True, index=True)
    cpf = Column(String(20), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    device_fingerprint = Column(String(255), nullable=True)
    order_code = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, index=True) # 'declined', 'blocked', 'approved'
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class SecuritySettings(Base):
    """
    Configurações globais de segurança da conta.
    Padrão: 5 tentativas em 10 minutos (Velocity Check).
    """
    __tablename__ = "security_settings"

    id = Column(Integer, primary_key=True, default=1)
    velocity_threshold = Column(Integer, default=5, nullable=False)
    velocity_window_minutes = Column(Integer, default=10, nullable=False)
    auto_blacklist_on_chargeback = Column(Boolean, default=True, nullable=False)
    is_velocity_enabled = Column(Boolean, default=True, nullable=False)
    is_blacklist_enabled = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
