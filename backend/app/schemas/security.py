from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BlacklistEntryBase(BaseModel):
    entry_type: str = Field(..., description="Tipo da entrada: 'cpf', 'email', 'phone', 'ip'")
    value: str = Field(..., min_length=2, max_length=255, description="Valor bloqueado (ex: CPF, email, IP)")
    reason: Optional[str] = Field(None, max_length=500, description="Motivo do bloqueio")
    is_active: bool = True


class BlacklistEntryCreate(BlacklistEntryBase):
    pass


class BlacklistEntryUpdate(BaseModel):
    reason: Optional[str] = None
    is_active: Optional[bool] = None


class BlacklistEntryResponse(BlacklistEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SecuritySettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    velocity_threshold: int = 5
    velocity_window_minutes: int = 10
    auto_blacklist_on_chargeback: bool = True
    is_velocity_enabled: bool = True
    is_blacklist_enabled: bool = True
    updated_at: datetime


class SecuritySettingsUpdate(BaseModel):
    velocity_threshold: Optional[int] = Field(None, ge=1, le=50)
    velocity_window_minutes: Optional[int] = Field(None, ge=1, le=1440)
    auto_blacklist_on_chargeback: Optional[bool] = None
    is_velocity_enabled: Optional[bool] = None
    is_blacklist_enabled: Optional[bool] = None


class CardAttemptLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ip_address: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    order_code: Optional[str] = None
    status: str
    reason: Optional[str] = None
    created_at: datetime


class SecurityStatusCheckResponse(BaseModel):
    is_card_allowed: bool
    is_blacklisted: bool
    is_velocity_blocked: bool
    failed_attempts_in_window: int = 0
    message: Optional[str] = None
