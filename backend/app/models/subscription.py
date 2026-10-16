"""
Modelos de Assinaturas e Cobrança Recorrente (Subscriptions & Invoices).
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_subscription_code() -> str:
    """Gera código único para a assinatura (ex: SUB-20261016-A1B2)."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"SUB-{date_str}-{random_suffix}"


def generate_invoice_code() -> str:
    """Gera código amigável para fatura (ex: INV-20261016-C3D4)."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"INV-{date_str}-{random_suffix}"


class Subscription(Base):
    """
    Representa uma assinatura de cobrança recorrente vinculada a um produto/oferta.
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscription_code = Column(String(50), unique=True, index=True, default=generate_subscription_code, nullable=False)

    # Dados do Assinante
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), index=True, nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_phone_ddi = Column(String(10), default="55", nullable=True)
    customer_document = Column(String(30), nullable=True)

    # Vínculo com Produto e Oferta
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    offer_id = Column(Integer, ForeignKey("product_offers.id"), nullable=True)

    # Parâmetros da Recorrência
    billing_cycle = Column(String(20), default="monthly", nullable=False) # monthly, quarterly, semiannual, annual
    amount_brl = Column(Float, nullable=False)
    status = Column(String(30), default="active", index=True, nullable=False) # active, canceled, past_due, paused

    # Integração com Gateway (Pagar.me V5)
    gateway = Column(String(30), default="pagarme", nullable=False)
    gateway_subscription_id = Column(String(100), nullable=True)
    gateway_plan_id = Column(String(100), nullable=True)
    card_last_four = Column(String(10), nullable=True)
    card_brand = Column(String(30), nullable=True)

    # Datas de Ciclo e Controle
    current_cycle = Column(Integer, default=1, nullable=False)
    start_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    next_billing_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    cancel_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else ""

    @property
    def offer_name(self) -> str:
        return self.offer.name if self.offer else ""

    # Relacionamentos
    product = relationship("Product")
    offer = relationship("ProductOffer")
    invoices = relationship("SubscriptionInvoice", back_populates="subscription", cascade="all, delete-orphan", order_by="desc(SubscriptionInvoice.created_at)")


class SubscriptionInvoice(Base):
    """
    Fatura individual gerada para cada ciclo de cobrança da assinatura.
    """
    __tablename__ = "subscription_invoices"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    invoice_code = Column(String(50), unique=True, index=True, default=generate_invoice_code, nullable=False)

    cycle_number = Column(Integer, default=1, nullable=False)
    amount_brl = Column(Float, nullable=False)
    status = Column(String(30), default="paid", index=True, nullable=False) # paid, pending, failed, canceled

    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    gateway_charge_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relacionamentos
    subscription = relationship("Subscription", back_populates="invoices")
    order = relationship("Order")
