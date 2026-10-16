from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import secrets

from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_default_affiliate_code() -> str:
    return f"AF{secrets.token_hex(3).upper()}"

class Affiliate(Base):
    __tablename__ = "affiliates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    document = Column(String(30), nullable=True) # CPF ou CNPJ
    affiliate_code = Column(String(50), unique=True, index=True, nullable=False, default=generate_default_affiliate_code)
    pix_key = Column(String(100), nullable=True)
    pix_key_type = Column(String(20), nullable=True, default="cpf") # 'cpf', 'email', 'phone', 'random'
    crypto_wallet = Column(String(100), nullable=True)
    default_commission_percent = Column(Float, nullable=False, default=20.0) # Percentual padrão
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product_links = relationship("AffiliateProductLink", back_populates="affiliate", cascade="all, delete-orphan")
    commissions = relationship("AffiliateCommission", back_populates="affiliate", cascade="all, delete-orphan")


class AffiliateProductLink(Base):
    __tablename__ = "affiliate_product_links"

    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    commission_percent = Column(Float, nullable=True) # Se None, herda do affiliate.default_commission_percent
    custom_ref_code = Column(String(50), nullable=True, index=True)
    clicks_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    affiliate = relationship("Affiliate", back_populates="product_links")
    product = relationship("Product")


class AffiliateCommission(Base):
    __tablename__ = "affiliate_commissions"

    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount_brl = Column(Float, nullable=False, default=0.0)
    amount_usd = Column(Float, nullable=True)
    sale_amount_brl = Column(Float, nullable=False, default=0.0)
    commission_percent = Column(Float, nullable=False, default=0.0)
    status = Column(String(30), default="pending", index=True, nullable=False) # 'pending', 'available', 'paid', 'canceled'
    paid_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    affiliate = relationship("Affiliate", back_populates="commissions")
    order = relationship("Order")
    product = relationship("Product")
