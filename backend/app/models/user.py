from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user") # 'superadmin', 'admin', 'user', 'affiliate'
    is_active = Column(Boolean, default=True)
    document = Column(String(30), nullable=True) # CPF ou CNPJ
    document_type = Column(String(10), nullable=True, default="cpf") # 'cpf' ou 'cnpj'
    phone = Column(String(50), nullable=True)
    pix_key = Column(String(100), nullable=True)
    pix_key_type = Column(String(20), nullable=True, default="cpf") # 'cpf', 'cnpj', 'email', 'phone', 'random'
    crypto_wallet = Column(String(100), nullable=True)
    crypto_network = Column(String(50), nullable=True, default="polygon")
    external_recipient_id = Column(String(100), nullable=True) # ID do recebedor Pagar.me
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False) # 'admin', 'user'
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    used_by_email = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)


class RegistrationVerification(Base):
    __tablename__ = "registration_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    invite_token = Column(String, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

