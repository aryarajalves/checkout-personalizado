from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class ABTest(Base):
    __tablename__ = "ab_tests"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    variant_a_offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="CASCADE"), nullable=False)
    variant_b_offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    split_ratio = Column(Integer, default=50, nullable=False)  # 50 = 50% / 50%

    # Métricas do Funil
    visits_a = Column(Integer, default=0, nullable=False)
    visits_b = Column(Integer, default=0, nullable=False)
    initiates_a = Column(Integer, default=0, nullable=False)
    initiates_b = Column(Integer, default=0, nullable=False)
    conversions_a = Column(Integer, default=0, nullable=False)
    conversions_b = Column(Integer, default=0, nullable=False)
    revenue_brl_a = Column(Float, default=0.0, nullable=False)
    revenue_brl_b = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("app.models.product.Product", foreign_keys=[product_id], back_populates="ab_tests")
    variant_a_offer = relationship("app.models.product.ProductOffer", foreign_keys=[variant_a_offer_id])
    variant_b_offer = relationship("app.models.product.ProductOffer", foreign_keys=[variant_b_offer_id])
