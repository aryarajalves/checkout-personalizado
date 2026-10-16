from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class CustomProposal(Base):
    __tablename__ = "custom_proposals"

    id = Column(Integer, primary_key=True, index=True)
    proposal_code = Column(String(50), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_cpf = Column(String(30), nullable=True)

    amount_brl = Column(Float, nullable=False)
    payment_method_allowed = Column(String(50), nullable=False, default="all") # 'all', 'pix', 'credit_card', 'hybrid_pix_card', 'hybrid_two_cards'
    custom_pix_amount_brl = Column(Float, nullable=True)
    custom_card_amount_brl = Column(Float, nullable=True)
    max_installments = Column(Integer, nullable=False, default=12)

    closer_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="active", index=True) # 'active', 'paid', 'expired', 'canceled'

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relacionamentos
    product = relationship("Product")
    offer = relationship("ProductOffer")
    order = relationship("Order", foreign_keys=[order_id])
