from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class GatewaySettingUpdate(BaseModel):
    gateway_name: str
    is_active: bool = False
    environment: str = "sandbox" # 'sandbox', 'production'
    api_key: Optional[str] = None
    public_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    merchant_id: Optional[str] = None

class GatewaySettingResponse(BaseModel):
    id: Optional[int] = None
    gateway_name: str
    is_active: bool = False
    environment: str = "sandbox"
    api_key_masked: Optional[str] = None
    public_key: Optional[str] = None
    webhook_secret_masked: Optional[str] = None
    merchant_id: Optional[str] = None
    is_configured: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class GatewayTestConnectionRequest(BaseModel):
    gateway_name: str
    environment: str = "sandbox"
    api_key: Optional[str] = None
    public_key: Optional[str] = None
    merchant_id: Optional[str] = None

class GatewayTestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

class SplitRecipientCreate(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    document: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = "cpf" # 'cpf', 'cnpj', 'email', 'phone', 'random'
    crypto_wallet: Optional[str] = None
    crypto_network: Optional[str] = "polygon"
    external_recipient_id: Optional[str] = None
    asaas_wallet_id: Optional[str] = None
    default_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    is_active: bool = True

class SplitRecipientUpdate(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    document: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    crypto_wallet: Optional[str] = None
    crypto_network: Optional[str] = None
    external_recipient_id: Optional[str] = None
    asaas_wallet_id: Optional[str] = None
    default_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    is_active: Optional[bool] = None

class SplitRecipientResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    document: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    crypto_wallet: Optional[str] = None
    crypto_network: Optional[str] = None
    external_recipient_id: Optional[str] = None
    asaas_wallet_id: Optional[str] = None
    default_percentage: float = 0.0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
