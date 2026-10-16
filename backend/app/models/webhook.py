from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class ProductWebhook(Base):
    """
    Representa uma URL de webhook cadastrada para um produto específico.
    Dispara eventos de ciclo de vida do pedido para plataformas externas.
    """
    __tablename__ = "product_webhooks"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=True, default="")  # Nome amigável do webhook (ex: n8n, Make, Área de Membros)
    url = Column(String(500), nullable=False)
    events = Column(Text, nullable=False, default="[]")  # JSON string com lista de eventos (ex: ["order.approved", ...])
    secret_key = Column(String(100), nullable=True)  # Chave secreta opcional para validação HMAC-SHA256
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="webhooks")


class WebhookDispatchLog(Base):
    """
    Histórico detalhado de disparos de webhooks externos.
    Registra data, payload, status HTTP retornado e permite retentativas.
    """
    __tablename__ = "webhook_dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    webhook_id = Column(Integer, ForeignKey("product_webhooks.id", ondelete="SET NULL"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    event = Column(String(50), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    payload = Column(Text, nullable=False)
    response_status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    success = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    dispatched_at = Column(DateTime, default=utc_now, nullable=False)
