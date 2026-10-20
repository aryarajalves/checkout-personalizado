from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class CustomProposalBase(BaseModel):
    product_id: int
    offer_id: Optional[int] = None
    title: str = Field(..., max_length=150)
    description: Optional[str] = None
    customer_name: str = Field(..., max_length=150)
    customer_email: str = Field(..., max_length=150)
    customer_phone: str = Field(..., max_length=50)
    customer_cpf: Optional[str] = Field(None, max_length=30)
    amount_brl: float = Field(..., gt=0)
    payment_method_allowed: str = Field("all", max_length=50) # 'all', 'pix', 'credit_card', 'hybrid_pix_card', 'hybrid_two_cards'
    custom_pix_amount_brl: Optional[float] = None
    custom_card_amount_brl: Optional[float] = None
    max_installments: int = Field(12, ge=1, le=24)
    closer_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class CustomProposalCreate(CustomProposalBase):
    expires_hours: Optional[int] = Field(24, ge=1, le=720) # Padrão 24 horas
    expires_at: Optional[datetime] = None


class CustomProposalUpdate(BaseModel):
    product_id: Optional[int] = None
    offer_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_cpf: Optional[str] = None
    amount_brl: Optional[float] = None
    payment_method_allowed: Optional[str] = None
    custom_pix_amount_brl: Optional[float] = None
    custom_card_amount_brl: Optional[float] = None
    max_installments: Optional[int] = None
    closer_name: Optional[str] = None
    notes: Optional[str] = None
    expires_hours: Optional[int] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None


class CustomProposalResponse(CustomProposalBase):
    id: int
    proposal_code: str
    status: str
    order_id: Optional[int] = None
    expires_at: datetime
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    product_name: Optional[str] = None
    product_slug: Optional[str] = None
    checkout_url: Optional[str] = None
    is_expired: bool = False
    time_remaining_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProposalPublicResponse(BaseModel):
    proposal_code: str
    product_id: int
    product_name: str
    product_slug: str
    title: str
    description: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_cpf: Optional[str] = None
    amount_brl: float
    payment_method_allowed: str
    custom_pix_amount_brl: Optional[float] = None
    custom_card_amount_brl: Optional[float] = None
    max_installments: int
    status: str
    expires_at: datetime
    is_expired: bool

    model_config = ConfigDict(from_attributes=True)


class ProposalMetricsResponse(BaseModel):
    total_proposals: int = 0
    active_proposals: int = 0
    paid_proposals: int = 0
    total_amount_negotiated: float = 0.0
    total_amount_paid: float = 0.0
    conversion_rate: float = 0.0
