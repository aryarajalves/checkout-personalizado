from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import secrets

from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_recovery_token() -> str:
    return secrets.token_urlsafe(24)

class AbandonedCart(Base):
    __tablename__ = "abandoned_checkouts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False, index=True)
    customer_phone = Column(String, nullable=False)
    customer_phone_ddi = Column(String(10), nullable=True, default="55")
    customer_cpf = Column(String, nullable=True)
    estimated_amount_brl = Column(Float, nullable=False, default=0.0)
    coupon_code = Column(String(50), nullable=True)

    # Parâmetros UTM e Rastreamento de Tráfego
    utm_source = Column(String(100), nullable=True, index=True)
    utm_medium = Column(String(100), nullable=True)
    utm_campaign = Column(String(150), nullable=True, index=True)
    utm_content = Column(String(150), nullable=True)
    utm_term = Column(String(100), nullable=True)
    src = Column(String(100), nullable=True, index=True)

    recovery_token = Column(String(64), unique=True, index=True, nullable=False, default=generate_recovery_token)
    ab_test_id = Column(Integer, ForeignKey("ab_tests.id", ondelete="SET NULL"), nullable=True)
    ab_test_variant = Column(String(10), nullable=True) # 'A' ou 'B'

    # Endereço de Cobrança & Antifraude (ViaCEP) (#21)
    billing_zip_code = Column(String(20), nullable=True)
    billing_street = Column(String(255), nullable=True)
    billing_number = Column(String(50), nullable=True)
    billing_complement = Column(String(100), nullable=True)
    billing_neighborhood = Column(String(100), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(10), nullable=True)

    status = Column(String(30), default="abandoned", index=True, nullable=False)  # 'abandoned', 'recovered', 'converted'
    contacted = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product")
    offer = relationship("ProductOffer")
