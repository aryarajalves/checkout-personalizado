from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    price_usd = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    require_cpf = Column(Boolean, default=False, nullable=False)
    payment_methods = Column(String, default="all", nullable=False) # 'all', 'pix_card', 'crypto_only'
    meta_pixel_id = Column(String(50), nullable=True) # Identificador do Pixel do Meta/Facebook
    pixel_purchase_active = Column(Boolean, default=True, nullable=False)
    pixel_initiate_active = Column(Boolean, default=True, nullable=False)
    pixel_pageview_active = Column(Boolean, default=True, nullable=False)
    primary_color = Column(String(30), default="#0284c7", nullable=False) # Cor da marca do expert no checkout
    logo_url = Column(String(500), nullable=True) # Logotipo do expert/marca no cabeçalho
    timer_enabled = Column(Boolean, default=False, nullable=False) # Cronômetro de escassez no checkout
    timer_minutes = Column(Integer, default=15, nullable=False) # Tempo limite do cronômetro em minutos
    timer_text = Column(String(255), default="Esta oferta especial expira em:", nullable=False) # Mensagem de urgência
    testimonials = Column(Text, nullable=True) # Lista de depoimentos serializada em JSON
    thank_you_url = Column(String(500), nullable=True) # URL da página de obrigado personalizada (externa ou redirecionamento)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    split_rules = relationship("ProductSplitRule", back_populates="product", cascade="all, delete-orphan")
    offers = relationship("ProductOffer", back_populates="product", cascade="all, delete-orphan", order_by="ProductOffer.id")
    webhooks = relationship("ProductWebhook", back_populates="product", cascade="all, delete-orphan")
    order_bumps = relationship("ProductOrderBump", back_populates="product", cascade="all, delete-orphan", order_by="ProductOrderBump.id")
    upsells = relationship("ProductUpsell", back_populates="product", cascade="all, delete-orphan", order_by="ProductUpsell.id")


class ProductOffer(Base):
    __tablename__ = "product_offers"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False) # Ex: "Oferta Principal", "Promoção Black Friday", "Preço à Vista"
    slug = Column(String, unique=True, index=True, nullable=False) # Ex: "bussola-astrologica", "bussola-promocional"
    price_brl = Column(Float, nullable=False, default=0.0)
    price_usd = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    pricing_type = Column(String(20), default="one_time", nullable=False) # 'one_time' ou 'recurring'
    billing_cycle = Column(String(20), default="monthly", nullable=False) # 'monthly', 'quarterly', 'semiannual', 'annual'
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="offers")


class ProductSplitRule(Base):
    __tablename__ = "product_split_rules"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("split_recipients.id", ondelete="CASCADE"), nullable=False, index=True)
    percentage = Column(Float, nullable=False, default=0.0)
    valid_until = Column(DateTime, nullable=True) # Prazo de expiração do contrato de co-produção
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="split_rules")
    recipient = relationship("SplitRecipient")


class ProductOrderBump(Base):
    __tablename__ = "product_order_bumps"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="order_bumps")


class ProductUpsell(Base):
    __tablename__ = "product_upsells"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    external_url = Column(String(500), nullable=True) # Link da página de vendas externa do UpSell
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="upsells")

