from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProductSplitRuleItem(BaseModel):
    recipient_id: int
    percentage: float = Field(..., ge=0.0, le=100.0, description="Porcentagem de split (0.0 a 100.0)")
    valid_until: Optional[datetime] = Field(None, description="Data limite de expiração do contrato de co-produção")

class ProductSplitRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    recipient_id: int
    percentage: float
    valid_until: Optional[datetime] = None
    is_expired: Optional[bool] = False
    recipient_name: Optional[str] = None
    recipient_document: Optional[str] = None
    recipient_pix_key: Optional[str] = None
    recipient_crypto_wallet: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProductSplitRulesUpdate(BaseModel):
    rules: List[ProductSplitRuleItem]

class ProductOfferBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Nome da oferta (ex: Oferta Principal, Black Friday)")
    slug: str = Field(..., min_length=2, max_length=100, description="Identificador único para o checkout /pay/{slug}")
    price_brl: float = Field(..., ge=0.0)
    price_usd: Optional[float] = Field(None, ge=0.0)
    pricing_type: str = Field("one_time", description="Tipo de preço: one_time ou recurring")
    billing_cycle: Optional[str] = Field("monthly", description="Ciclo de cobrança: monthly, quarterly, semiannual, annual")
    is_active: bool = True
    is_default: bool = False

class ProductOfferCreate(ProductOfferBase):
    pass

class ProductOfferUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    price_brl: Optional[float] = Field(None, ge=0.0)
    price_usd: Optional[float] = Field(None, ge=0.0)
    pricing_type: Optional[str] = None
    billing_cycle: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class ProductOfferResponse(ProductOfferBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==============================================================================
# Schemas para Order Bumps
# ==============================================================================

class ProductOrderBumpBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Título da oferta do order bump")
    description: Optional[str] = None
    price_brl: float = Field(..., ge=0.0, description="Preço adicional do bump em BRL")
    is_active: bool = True

class ProductOrderBumpCreate(ProductOrderBumpBase):
    pass

class ProductOrderBumpUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    price_brl: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None

class ProductOrderBumpResponse(ProductOrderBumpBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==============================================================================
# Schemas para UpSell
# ==============================================================================

class ProductUpsellBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Título principal do upsell")
    subtitle: Optional[str] = None
    description: Optional[str] = None
    price_brl: float = Field(..., ge=0.0, description="Preço do upsell em BRL")
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    external_url: Optional[str] = Field(None, max_length=500, description="URL da página de vendas externa do upsell")
    is_active: bool = True

class ProductUpsellCreate(ProductUpsellBase):
    pass

class ProductUpsellUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    subtitle: Optional[str] = None
    description: Optional[str] = None
    price_brl: Optional[float] = Field(None, ge=0.0)
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    external_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class ProductUpsellResponse(ProductUpsellBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==============================================================================
# Schema para Configuração de Pixel do Produto
# ==============================================================================

class ProductPixelConfigUpdate(BaseModel):
    meta_pixel_id: Optional[str] = Field(None, max_length=50)
    pixel_purchase_active: bool = True
    pixel_initiate_active: bool = True
    pixel_pageview_active: bool = True

class ProductPixelConfigResponse(BaseModel):
    meta_pixel_id: Optional[str] = None
    pixel_purchase_active: bool = True
    pixel_initiate_active: bool = True
    pixel_pageview_active: bool = True

class ProductAppearanceUpdate(BaseModel):
    primary_color: Optional[str] = Field(None, max_length=30)
    logo_url: Optional[str] = Field(None, max_length=500)
    image_url: Optional[str] = Field(None, max_length=500)
    timer_enabled: Optional[bool] = None
    timer_minutes: Optional[int] = Field(None, ge=1, le=1440)
    timer_text: Optional[str] = Field(None, max_length=255)
    testimonials: Optional[str] = None

class ProductAppearanceResponse(BaseModel):
    primary_color: str = "#0284c7"
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    timer_enabled: bool = False
    timer_minutes: int = 15
    timer_text: str = "Esta oferta especial expira em:"
    testimonials: Optional[str] = None

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    price_brl: float = Field(..., ge=0.0)
    price_usd: Optional[float] = Field(None, ge=0.0)
    is_active: bool = True
    require_cpf: bool = False
    payment_methods: str = "all" # 'all', 'pix_card', 'crypto_only'
    meta_pixel_id: Optional[str] = Field(None, max_length=50, description="Identificador do Pixel do Meta/Facebook")
    pixel_purchase_active: bool = True
    pixel_initiate_active: bool = True
    pixel_pageview_active: bool = True
    primary_color: str = "#0284c7"
    logo_url: Optional[str] = None
    timer_enabled: bool = False
    timer_minutes: int = 15
    timer_text: str = "Esta oferta especial expira em:"
    testimonials: Optional[str] = None
    thank_you_url: Optional[str] = Field(None, max_length=500, description="URL da página de obrigado personalizada (externa ou interna)")

class ProductCreate(ProductBase):
    initial_split_rules: Optional[List[ProductSplitRuleItem]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    price_brl: Optional[float] = Field(None, ge=0.0)
    price_usd: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None
    require_cpf: Optional[bool] = None
    payment_methods: Optional[str] = None
    meta_pixel_id: Optional[str] = Field(None, max_length=50)
    pixel_purchase_active: Optional[bool] = None
    pixel_initiate_active: Optional[bool] = None
    pixel_pageview_active: Optional[bool] = None
    primary_color: Optional[str] = Field(None, max_length=30)
    logo_url: Optional[str] = Field(None, max_length=500)
    timer_enabled: Optional[bool] = None
    timer_minutes: Optional[int] = Field(None, ge=1, le=1440)
    timer_text: Optional[str] = Field(None, max_length=255)
    testimonials: Optional[str] = None
    thank_you_url: Optional[str] = Field(None, max_length=500)

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    split_rules: List[ProductSplitRuleResponse] = []
    offers: List[ProductOfferResponse] = []
    order_bumps: List[ProductOrderBumpResponse] = []
    upsells: List[ProductUpsellResponse] = []
