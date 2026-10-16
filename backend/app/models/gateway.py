from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class GatewaySetting(Base):
    __tablename__ = "gateway_settings"

    id = Column(Integer, primary_key=True, index=True)
    gateway_name = Column(String, unique=True, index=True, nullable=False) # 'pagarme', 'asaas', 'nowpayments'
    is_active = Column(Boolean, default=False, nullable=False)
    environment = Column(String, default="sandbox", nullable=False) # 'sandbox', 'production'
    api_key = Column(String, nullable=True)
    public_key = Column(String, nullable=True)
    webhook_secret = Column(String, nullable=True)
    merchant_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class SplitRecipient(Base):
    __tablename__ = "split_recipients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    document = Column(String, nullable=True)
    pix_key = Column(String, nullable=True)
    pix_key_type = Column(String, nullable=True) # 'cpf', 'cnpj', 'email', 'phone', 'random'
    crypto_wallet = Column(String, nullable=True)
    crypto_network = Column(String, nullable=True, default="polygon")
    external_recipient_id = Column(String, nullable=True)
    default_percentage = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
