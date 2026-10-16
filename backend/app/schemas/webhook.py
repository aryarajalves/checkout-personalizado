from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import Optional, List
from datetime import datetime

SUPPORTED_WEBHOOK_EVENTS = [
    "order.approved",       # Compra Aprovada
    "order.waiting_payment", # Pix Gerado
    "order.refunded",       # Reembolso
    "order.chargeback",     # Chargeback
    "order.card_declined",  # Cartão Recusado
    "order.expired",        # Pix Expirado
    "Compra Aprovada",
    "Pix Gerado",
    "Reembolso",
    "Chargeback",
    "Cartão Recusado",
    "Pix Expirado",
]

class ProductWebhookBase(BaseModel):
    name: Optional[str] = None
    url: str
    events: List[str]
    secret_key: Optional[str] = None
    is_active: bool = True

class ProductWebhookCreate(ProductWebhookBase):
    pass

class ProductWebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret_key: Optional[str] = None
    is_active: Optional[bool] = None

class ProductWebhookResponse(BaseModel):
    id: int
    product_id: int
    name: Optional[str] = None
    url: str
    events: List[str]
    secret_key: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WebhookDispatchLogResponse(BaseModel):
    id: int
    product_id: int
    webhook_id: Optional[int] = None
    order_id: Optional[int] = None
    event: str
    url: str
    payload: str
    response_status_code: Optional[int] = None
    response_body: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    dispatched_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TestWebhookRequest(BaseModel):
    url: str
    secret_key: Optional[str] = None
    event: Optional[str] = "order.approved"
