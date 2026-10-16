from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Coupon(Base):
    """
    Modelo para Cupons de Desconto.
    - Desconto percentual sobre o valor total do pedido.
    - Pode ser vitalício (never_expires=True), ter prazo de validade (expires_at) ou limite de usos (max_uses).
    - Pode ser global (product_id=None) ou restrito a um produto específico.
    """
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # Ex: 'PROMO10', 'BLACKFRIDAY'
    discount_percent = Column(Float, nullable=False) # Ex: 10.0 para 10% de desconto
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    never_expires = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True) # None = ilimitado
    current_uses = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", backref="coupons")
