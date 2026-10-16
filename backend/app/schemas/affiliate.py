from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

class AffiliateBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Nome completo do afiliado")
    email: EmailStr = Field(..., description="E-mail de contato e acesso")
    phone: str = Field(..., min_length=6, max_length=50, description="WhatsApp ou telefone")
    document: Optional[str] = Field(None, max_length=30, description="CPF ou CNPJ")
    affiliate_code: Optional[str] = Field(None, max_length=50, description="Código de indicação (ex: ALEX10)")
    pix_key: Optional[str] = Field(None, max_length=100, description="Chave Pix para repasse")
    pix_key_type: Optional[str] = Field("cpf", max_length=20, description="'cpf', 'email', 'phone', 'random'")
    crypto_wallet: Optional[str] = Field(None, max_length=100, description="Carteira Cripto (opcional)")
    default_commission_percent: float = Field(20.0, ge=0.0, le=100.0, description="Percentual padrão de comissão")
    is_active: bool = Field(True, description="Status do afiliado")
    notes: Optional[str] = None


class AffiliateCreate(AffiliateBase):
    pass


class AffiliateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    affiliate_code: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    crypto_wallet: Optional[str] = None
    default_commission_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class AffiliateProductLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    affiliate_id: int
    product_id: int
    product_name: Optional[str] = None
    product_slug: Optional[str] = None
    commission_percent: Optional[float] = None
    effective_commission_percent: float = 0.0
    custom_ref_code: Optional[str] = None
    ref_code: str
    clicks_count: int
    is_active: bool
    affiliate_link: Optional[str] = None
    created_at: datetime


class AffiliateProductLinkCreate(BaseModel):
    product_id: int
    commission_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    custom_ref_code: Optional[str] = Field(None, max_length=50)


class AffiliateResponse(AffiliateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    total_sales_count: int = 0
    total_sales_brl: float = 0.0
    total_commissions_brl: float = 0.0
    total_commissions_paid_brl: float = 0.0
    product_links: List[AffiliateProductLinkResponse] = []


class AffiliateCommissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    affiliate_id: int
    affiliate_name: Optional[str] = None
    affiliate_code: Optional[str] = None
    order_id: int
    order_code: Optional[str] = None
    product_id: int
    product_name: Optional[str] = None
    amount_brl: float
    amount_usd: Optional[float] = None
    sale_amount_brl: float
    commission_percent: float
    status: str # 'pending', 'available', 'paid', 'canceled'
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


class AffiliateStatsResponse(BaseModel):
    total_affiliates: int
    active_affiliates: int
    total_sales_via_affiliates: int
    total_sales_brl: float
    total_commissions_pending_brl: float
    total_commissions_paid_brl: float
    total_clicks: int


class TrackAffiliateClickRequest(BaseModel):
    slug: str = Field(..., description="Slug do produto ou oferta")
    ref_code: str = Field(..., description="Código do afiliado")


class TrackAffiliateClickResponse(BaseModel):
    valid: bool
    affiliate_id: Optional[int] = None
    affiliate_name: Optional[str] = None
    ref_code: str
    product_id: Optional[int] = None
    commission_percent: Optional[float] = None
