from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String, unique=True, index=True, nullable=False) # Ex: ORD-20261015-ABCD
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False, index=True)
    customer_phone = Column(String, nullable=False)
    customer_phone_ddi = Column(String(10), nullable=True, default="55")
    customer_cpf = Column(String, nullable=True)
    amount_brl = Column(Float, nullable=False, default=0.0)
    amount_usd = Column(Float, nullable=True)
    payment_method = Column(String, nullable=False, default="pix") # 'pix', 'credit_card', 'crypto'
    status = Column(String, nullable=False, default="pending", index=True) # 'pending', 'paid', 'failed', 'refunded', 'canceled'
    gateway_name = Column(String, nullable=False, default="pagarme") # 'pagarme', 'nowpayments'
    external_transaction_id = Column(String, nullable=True, index=True)
    qr_code_base64 = Column(Text, nullable=True)
    qr_code_text = Column(Text, nullable=True)
    crypto_wallet_address = Column(String, nullable=True)
    crypto_network = Column(String, nullable=True)
    crypto_currency = Column(String, nullable=True)
    crypto_amount = Column(Float, nullable=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True, index=True)
    coupon_code = Column(String(50), nullable=True)
    discount_amount_brl = Column(Float, nullable=True, default=0.0)
    discount_amount_usd = Column(Float, nullable=True, default=0.0)
    original_amount_brl = Column(Float, nullable=True)
    original_amount_usd = Column(Float, nullable=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id", ondelete="SET NULL"), nullable=True, index=True)
    affiliate_code = Column(String(50), nullable=True, index=True)
    affiliate_commission_brl = Column(Float, nullable=True, default=0.0)
    affiliate_commission_usd = Column(Float, nullable=True, default=0.0)

    # Parâmetros UTM e Rastreamento de Tráfego
    utm_source = Column(String(100), nullable=True, index=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(150), nullable=True, index=True)
    utm_content = Column(String(150), nullable=True)
    utm_term = Column(String(100), nullable=True)
    src = Column(String(100), nullable=True, index=True)
    sck = Column(String(100), nullable=True)

    hybrid_type = Column(String(30), nullable=True) # 'pix_card', 'two_cards'
    proposal_id = Column(Integer, ForeignKey("custom_proposals.id", ondelete="SET NULL"), nullable=True)

    expires_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product")
    offer = relationship("ProductOffer")
    coupon = relationship("app.models.coupon.Coupon")
    affiliate = relationship("app.models.affiliate.Affiliate")
    proposal = relationship("app.models.custom_proposal.CustomProposal", foreign_keys=[proposal_id])
    splits = relationship("OrderSplit", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan", order_by="OrderPayment.part_number")


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    part_number = Column(Integer, nullable=False, default=1)
    payment_method = Column(String(50), nullable=False) # 'pix', 'credit_card'
    amount_brl = Column(Float, nullable=False)
    installments = Column(Integer, default=1, nullable=False)
    status = Column(String(30), nullable=False, default="pending") # 'pending', 'paid', 'failed'
    external_transaction_id = Column(String(150), nullable=True, index=True)
    qr_code_base64 = Column(Text, nullable=True)
    qr_code_text = Column(Text, nullable=True)
    card_last_four = Column(String(10), nullable=True)
    card_brand = Column(String(30), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    order = relationship("Order", back_populates="payments")


class OrderSplit(Base):
    __tablename__ = "order_splits"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("split_recipients.id", ondelete="RESTRICT"), nullable=False, index=True)
    recipient_name = Column(String, nullable=False)
    percentage = Column(Float, nullable=False)
    amount_brl = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    order = relationship("Order", back_populates="splits")
    recipient = relationship("SplitRecipient")
