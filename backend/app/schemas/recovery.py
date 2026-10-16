from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

class CheckoutLeadCaptureRequest(BaseModel):
    slug: str = Field(..., description="Slug do produto ou da oferta")
    name: str = Field(..., min_length=2, max_length=150, description="Nome do lead")
    email: EmailStr = Field(..., description="E-mail do lead")
    phone: str = Field(..., min_length=6, max_length=30, description="Celular ou WhatsApp")
    phone_ddi: Optional[str] = Field("55", description="DDI do país")
    cpf: Optional[str] = Field(None, description="CPF se informado")
    estimated_amount_brl: Optional[float] = Field(0.0, description="Valor estimado do carrinho em R$")
    coupon_code: Optional[str] = Field(None, description="Cupom aplicado no momento da captura")
    bump_ids: Optional[List[int]] = Field(None, description="IDs dos order bumps selecionados")
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    src: Optional[str] = None


class CheckoutLeadCaptureResponse(BaseModel):
    cart_id: int
    recovery_token: str
    status: str
    message: str


class AbandonedCartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None
    product_slug: Optional[str] = None
    offer_id: Optional[int] = None
    offer_name: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_phone_ddi: Optional[str] = "55"
    customer_phone_formatted: Optional[str] = None
    customer_cpf: Optional[str] = None
    estimated_amount_brl: float
    coupon_code: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    src: Optional[str] = None
    recovery_token: str
    recovery_url: Optional[str] = None
    status: str
    contacted: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AbandonedCartUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="'abandoned', 'recovered', 'converted'")
    contacted: Optional[bool] = Field(None, description="Marcar se o cliente já foi contatado via WhatsApp")
    notes: Optional[str] = Field(None, description="Anotações do vendedor sobre a recuperação")


class PendingPixOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    order_code: str
    status: str
    status_label: str
    product_id: int
    product_name: str
    offer_name: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_phone_ddi: Optional[str] = "55"
    customer_phone_formatted: Optional[str] = None
    amount_brl: float
    qr_code_text: Optional[str] = None  # Pix Copia e Cola
    qr_code_base64: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class RecoveryStatsResponse(BaseModel):
    # Métricas de Carrinho Abandonado
    total_abandoned: int
    total_recovered: int
    total_converted: int
    abandoned_rate: float
    total_abandoned_amount_brl: float
    total_recovered_amount_brl: float

    # Métricas de Pix
    total_pix_generated: int
    total_pix_pending: int
    total_pix_paid: int
    pix_conversion_rate: float
    total_pix_pending_amount_brl: float
