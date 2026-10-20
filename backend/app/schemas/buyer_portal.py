"""
Schemas Pydantic para a Central Rápida do Comprador (/minhas-compras).
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class BuyerRequestCode(BaseModel):
    email: EmailStr = Field(..., description="E-mail utilizado na compra")
    cpf: Optional[str] = Field(None, description="CPF do comprador (opcional para filtro cruzado)")

class BuyerRequestCodeResponse(BaseModel):
    message: str
    email: str
    expires_in_minutes: int = 15
    dev_code: Optional[str] = None # Apenas disponibilizado em ambiente de teste/dev para agilidade

class BuyerVerifyCode(BaseModel):
    email: EmailStr = Field(..., description="E-mail utilizado na compra")
    code: str = Field(..., min_length=4, max_length=10, description="Código OTP de 6 dígitos recebido por e-mail")

class BuyerCustomerProfile(BaseModel):
    name: str
    email: str
    cpf: Optional[str] = None
    phone: Optional[str] = None

class BuyerAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: BuyerCustomerProfile

class BuyerOrderItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_code: str
    product_id: int
    product_name: str
    product_image_url: Optional[str] = None
    offer_name: Optional[str] = None
    amount_brl: float
    amount_usd: Optional[float] = None
    payment_method: str
    status: str
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    qr_code_text: Optional[str] = None
    qr_code_base64: Optional[str] = None
    is_pix_expired: bool = False
    member_area_url: Optional[str] = None
    thank_you_url: Optional[str] = None
    card_last_four: Optional[str] = None
    installments: Optional[int] = 1

class BuyerSubscriptionInvoice(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_code: str
    cycle_number: int
    amount_brl: float
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None

class BuyerSubscriptionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_code: str
    product_id: int
    product_name: str
    product_image_url: Optional[str] = None
    offer_name: Optional[str] = None
    billing_cycle: str
    amount_brl: float
    status: str
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    current_cycle: int
    start_date: Optional[datetime] = None
    next_billing_at: Optional[datetime] = None
    member_area_url: Optional[str] = None
    invoices: List[BuyerSubscriptionInvoice] = []

class BuyerUpdateCardRequest(BaseModel):
    card_number: str = Field(..., min_length=13, max_length=19)
    card_holder: str = Field(..., min_length=3, max_length=100)
    card_expiry: str = Field(..., min_length=4, max_length=7)
    card_cvv: str = Field(..., min_length=3, max_length=4)

class BuyerRegeneratePixResponse(BaseModel):
    order_code: str
    qr_code_text: str
    qr_code_base64: Optional[str] = None
    expires_at: datetime
    status: str
    message: str
