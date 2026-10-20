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
    bump_product_id: Optional[int] = Field(None, description="ID do produto real vinculado ao bump")
    bump_offer_id: Optional[int] = Field(None, description="ID da oferta de preço vinculada ao bump")

class ProductOrderBumpCreate(ProductOrderBumpBase):
    pass

class ProductOrderBumpUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    price_brl: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None
    bump_product_id: Optional[int] = None
    bump_offer_id: Optional[int] = None

class ProductOrderBumpResponse(ProductOrderBumpBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    bump_product_name: Optional[str] = None
    bump_offer_name: Optional[str] = None
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
    upsell_product_id: Optional[int] = None
    upsell_offer_id: Optional[int] = None

    # Configuração de Downsell
    enable_downsell: bool = False
    downsell_product_id: Optional[int] = None
    downsell_offer_id: Optional[int] = None
    downsell_title: Optional[str] = None
    downsell_subtitle: Optional[str] = None
    downsell_description: Optional[str] = None
    downsell_price_brl: Optional[float] = 0.0
    downsell_image_url: Optional[str] = None
    downsell_video_url: Optional[str] = None
    downsell_external_url: Optional[str] = None

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
    upsell_product_id: Optional[int] = None
    upsell_offer_id: Optional[int] = None

    enable_downsell: Optional[bool] = None
    downsell_product_id: Optional[int] = None
    downsell_offer_id: Optional[int] = None
    downsell_title: Optional[str] = None
    downsell_subtitle: Optional[str] = None
    downsell_description: Optional[str] = None
    downsell_price_brl: Optional[float] = None
    downsell_image_url: Optional[str] = None
    downsell_video_url: Optional[str] = None
    downsell_external_url: Optional[str] = None

class ProductUpsellResponse(ProductUpsellBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    upsell_product_name: Optional[str] = None
    upsell_offer_name: Optional[str] = None
    downsell_product_name: Optional[str] = None
    downsell_offer_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==============================================================================
# Schema para Configuração de Pixel do Produto
# ==============================================================================

class ProductPixelConfigUpdate(BaseModel):
    meta_pixel_id: Optional[str] = Field(None, max_length=50)
    google_ads_id: Optional[str] = Field(None, max_length=50)
    google_ads_conversion_label: Optional[str] = Field(None, max_length=100)
    tiktok_pixel_id: Optional[str] = Field(None, max_length=50)
    pixel_purchase_active: bool = True
    pixel_initiate_active: bool = True
    pixel_pageview_active: bool = True

class ProductPixelConfigResponse(BaseModel):
    meta_pixel_id: Optional[str] = None
    google_ads_id: Optional[str] = None
    google_ads_conversion_label: Optional[str] = None
    tiktok_pixel_id: Optional[str] = None
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
    header_media_type: Optional[str] = Field(None, max_length=30)
    header_video_url: Optional[str] = Field(None, max_length=500)
    header_audio_url: Optional[str] = Field(None, max_length=500)
    header_audio_author_name: Optional[str] = Field(None, max_length=100)
    header_audio_author_avatar: Optional[str] = Field(None, max_length=500)

class ProductAppearanceResponse(BaseModel):
    primary_color: str = "#0284c7"
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    timer_enabled: bool = False
    timer_minutes: int = 15
    timer_text: str = "Esta oferta especial expira em:"
    testimonials: Optional[str] = None
    header_media_type: str = "none"
    header_video_url: Optional[str] = None
    header_audio_url: Optional[str] = None
    header_audio_author_name: Optional[str] = "Mensagem do Especialista"
    header_audio_author_avatar: Optional[str] = None

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
    google_ads_id: Optional[str] = Field(None, max_length=50, description="ID de Acompanhamento do Google Ads")
    google_ads_conversion_label: Optional[str] = Field(None, max_length=100, description="Rótulo de Conversão do Google Ads")
    tiktok_pixel_id: Optional[str] = Field(None, max_length=50, description="ID do Pixel do TikTok Ads")
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
    member_area_url: Optional[str] = Field(None, max_length=500, description="URL de acesso à Área de Membros / Entrega do Conteúdo")
    custom_domain: Optional[str] = Field(None, max_length=255, description="Domínio personalizado CNAME Whitelabel (ex: pay.meudominio.com.br)")
    pix_discount_percent: float = Field(0.0, ge=0.0, le=100.0, description="Percentual de desconto para pagamento no Pix (0.0 a 100.0)")
    crypto_discount_percent: float = Field(0.0, ge=0.0, le=100.0, description="Percentual de desconto para pagamento em Cripto (0.0 a 100.0)")
    max_installments: int = Field(12, ge=1, le=12, description="Limite máximo de parcelas no cartão (1 a 12)")
    free_installments_count: int = Field(1, ge=1, le=12, description="Parcelas sem juros para o comprador (1 a 12)")
    interest_rate_percent: float = Field(2.99, ge=0.0, le=20.0, description="Taxa de juros ao mês para parcelamento (%)")
    interest_payer: str = Field("buyer", description="Quem arca com juros: 'buyer' (comprador paga) ou 'producer' (produtor absorve)")
    enable_exit_intent: bool = False
    exit_intent_coupon_id: Optional[int] = None
    exit_intent_title: Optional[str] = "Espere! Não perca esta oportunidade exclusiva"
    exit_intent_subtitle: Optional[str] = "Liberamos um desconto especial de última chance para você concluir seu pedido agora!"
    enable_social_proof: bool = False
    social_proof_mode: str = "hybrid" # 'real', 'simulated', 'hybrid'
    header_media_type: str = "none" # 'none', 'video', 'audio', 'both'
    header_video_url: Optional[str] = None
    header_audio_url: Optional[str] = None
    header_audio_author_name: Optional[str] = "Mensagem do Especialista"
    header_audio_author_avatar: Optional[str] = None
    enable_card_fallback: bool = True
    card_fallback_discount_percent: float = Field(0.0, ge=0.0, le=100.0, description="Percentual de desconto extra no Pix para salvar cartão recusado")
    require_billing_address: bool = Field(False, description="Exige endereço de cobrança completo no cartão/boleto para antifraude")
    enable_asaas_installments: bool = Field(False, description="Ativa a opção de Boleto/Pix Parcelado (Carnê Digital) no checkout")
    asaas_max_installments: int = Field(12, ge=2, le=24, description="Limite de parcelas permitidas no carnê (2 a 24)")
    asaas_interest_percent: float = Field(0.0, ge=0.0, le=20.0, description="Taxa de juros/acréscimo mensal no carnê (%)")
    asaas_require_entry_pix: bool = Field(True, description="Exige entrada via Pix imediato para liberação do acesso")

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
    google_ads_id: Optional[str] = Field(None, max_length=50)
    google_ads_conversion_label: Optional[str] = Field(None, max_length=100)
    tiktok_pixel_id: Optional[str] = Field(None, max_length=50)
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
    member_area_url: Optional[str] = Field(None, max_length=500)
    custom_domain: Optional[str] = Field(None, max_length=255)
    pix_discount_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    crypto_discount_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_installments: Optional[int] = Field(None, ge=1, le=12)
    free_installments_count: Optional[int] = Field(None, ge=1, le=12)
    interest_rate_percent: Optional[float] = Field(None, ge=0.0, le=20.0)
    interest_payer: Optional[str] = None
    enable_exit_intent: Optional[bool] = None
    exit_intent_coupon_id: Optional[int] = None
    exit_intent_title: Optional[str] = None
    exit_intent_subtitle: Optional[str] = None
    enable_social_proof: Optional[bool] = None
    social_proof_mode: Optional[str] = None
    header_media_type: Optional[str] = None
    header_video_url: Optional[str] = None
    header_audio_url: Optional[str] = None
    header_audio_author_name: Optional[str] = None
    header_audio_author_avatar: Optional[str] = None
    enable_card_fallback: Optional[bool] = None
    card_fallback_discount_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    require_billing_address: Optional[bool] = None
    enable_asaas_installments: Optional[bool] = None
    asaas_max_installments: Optional[int] = Field(None, ge=2, le=24)
    asaas_interest_percent: Optional[float] = Field(None, ge=0.0, le=20.0)
    asaas_require_entry_pix: Optional[bool] = None

class ProductConversionConfigUpdate(BaseModel):
    enable_exit_intent: bool = False
    exit_intent_coupon_id: Optional[int] = None
    exit_intent_title: Optional[str] = "Espere! Não perca esta oportunidade exclusiva"
    exit_intent_subtitle: Optional[str] = "Liberamos um desconto especial de última chance para você concluir seu pedido agora!"
    enable_social_proof: bool = False
    social_proof_mode: str = "hybrid"
    enable_card_fallback: bool = True
    card_fallback_discount_percent: float = 0.0

class ProductConversionConfigResponse(BaseModel):
    enable_exit_intent: bool = False
    exit_intent_coupon_id: Optional[int] = None
    exit_intent_coupon_code: Optional[str] = None
    exit_intent_coupon_discount_percent: Optional[float] = None
    exit_intent_title: Optional[str] = "Espere! Não perca esta oportunidade exclusiva"
    exit_intent_subtitle: Optional[str] = "Liberamos um desconto especial de última chance para você concluir seu pedido agora!"
    enable_social_proof: bool = False
    social_proof_mode: str = "hybrid"
    enable_card_fallback: bool = True
    card_fallback_discount_percent: float = 0.0

class SocialProofNotificationItem(BaseModel):
    customer_name: str
    city: str
    state: str
    payment_method: str
    time_ago: str

class ProductDomainUpdate(BaseModel):
    custom_domain: Optional[str] = Field(None, max_length=255)

class ProductDomainResponse(BaseModel):
    product_id: int
    product_name: str
    custom_domain: Optional[str] = None
    cname_target: str
    is_pointing: bool
    status: str
    message: str

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exit_intent_coupon_code: Optional[str] = None
    exit_intent_coupon_discount_percent: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    split_rules: List[ProductSplitRuleResponse] = []
    offers: List[ProductOfferResponse] = []
    order_bumps: List[ProductOrderBumpResponse] = []
    upsells: List[ProductUpsellResponse] = []
    active_ab_test: Optional[dict] = None

# ==============================================================================
# Schemas para Simulação de Parcelamento e Lucro Líquido do Split (#4)
# ==============================================================================

class InstallmentOption(BaseModel):
    installments: int
    installment_value: float
    total_amount: float
    has_interest: bool
    interest_rate: float
    label: str

class SplitRecipientSimulation(BaseModel):
    recipient_id: int
    recipient_name: str
    percentage: float
    amount_brl: float
    is_expired: bool = False

class SimulationScenario(BaseModel):
    scenario_name: str
    payment_method: str
    installments: int
    gross_amount_brl: float
    gateway_fee_brl: float
    net_amount_brl: float
    producer_amount_brl: float
    producer_percentage: float
    partners_distribution: List[SplitRecipientSimulation]

class ProductInstallmentSimulationResponse(BaseModel):
    product_id: int
    product_name: str
    base_price_brl: float
    max_installments: int
    free_installments_count: int
    interest_rate_percent: float
    interest_payer: str
    installment_options: List[InstallmentOption]
    scenarios: List[SimulationScenario]

