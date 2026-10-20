from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class BuyerAccessCode(Base):
    __tablename__ = "buyer_access_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    cpf = Column(String(30), nullable=True, index=True)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now)
