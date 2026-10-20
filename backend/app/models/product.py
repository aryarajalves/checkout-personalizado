from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    price_usd = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    require_cpf = Column(Boolean, default=False, nullable=False)
    payment_methods = Column(String, default="all", nullable=False) # 'all', 'pix_card', 'crypto_only'
    meta_pixel_id = Column(String(50), nullable=True) # Identificador do Pixel do Meta/Facebook
    google_ads_id = Column(String(50), nullable=True) # ID de Acompanhamento do Google Ads (AW-XXXXX ou G-XXXXX)
    google_ads_conversion_label = Column(String(100), nullable=True) # Rótulo de Conversão do Google Ads (Purchase)
    tiktok_pixel_id = Column(String(50), nullable=True) # Identificador do Pixel do TikTok Ads
    pixel_purchase_active = Column(Boolean, default=True, nullable=False)
    pixel_initiate_active = Column(Boolean, default=True, nullable=False)
    pixel_pageview_active = Column(Boolean, default=True, nullable=False)
    primary_color = Column(String(30), default="#0284c7", nullable=False) # Cor da marca do expert no checkout
    logo_url = Column(String(500), nullable=True) # Logotipo do expert/marca no cabeçalho
    timer_enabled = Column(Boolean, default=False, nullable=False) # Cronômetro de escassez no checkout
    timer_minutes = Column(Integer, default=15, nullable=False) # Tempo limite do cronômetro em minutos
    timer_text = Column(String(255), default="Esta oferta especial expira em:", nullable=False) # Mensagem de urgência
    testimonials = Column(Text, nullable=True) # Lista de depoimentos serializada em JSON
    thank_you_url = Column(String(500), nullable=True) # URL da página de obrigado personalizada (externa ou redirecionamento)
    member_area_url = Column(String(500), nullable=True) # URL de acesso à Área de Membros / Entrega do Conteúdo
    custom_domain = Column(String(255), unique=True, index=True, nullable=True) # Domínio personalizado CNAME Whitelabel (ex: pay.meudominio.com.br)
    pix_discount_percent = Column(Float, default=0.0, nullable=False) # Desconto especial para pagamento à vista no Pix (%)
    crypto_discount_percent = Column(Float, default=0.0, nullable=False) # Desconto especial para pagamento em Criptomoedas (%)

    # Regras de Parcelamento e Juros de Cartão de Crédito (#4)
    max_installments = Column(Integer, default=12, nullable=False) # Limite máximo de parcelas permitidas (1x a 12x)
    free_installments_count = Column(Integer, default=1, nullable=False) # Quantidade de parcelas sem juros para o comprador (1x a 12x)
    interest_rate_percent = Column(Float, default=2.99, nullable=False) # Taxa de juros ao mês para parcelamento (%)
    interest_payer = Column(String(20), default="buyer", nullable=False) # 'buyer' (repassado ao comprador) ou 'producer' (absorvido)

    # Exit-Intent Popup (Desconto Relâmpago de Última Chance)
    enable_exit_intent = Column(Boolean, default=False, nullable=False)
    exit_intent_coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    exit_intent_title = Column(String(200), default="Espere! Não perca esta oportunidade exclusiva", nullable=True)
    exit_intent_subtitle = Column(String(255), default="Liberamos um desconto especial de última chance para você concluir seu pedido agora!", nullable=True)

    # Notificações de Prova Social Ao Vivo (Social Proof Toast)
    enable_social_proof = Column(Boolean, default=False, nullable=False)
    social_proof_mode = Column(String(30), default="hybrid", nullable=False) # 'real', 'simulated', 'hybrid'

    # Vídeo de Vendas (Mini-VSL) & Player de Áudio WhatsApp no Topo do Checkout (#13)
    header_media_type = Column(String(30), default="none", nullable=False) # 'none', 'video', 'audio'
    header_video_url = Column(String(500), nullable=True) # YouTube, Vimeo, PandaVideo ou MP4
    header_audio_url = Column(String(500), nullable=True) # Arquivo de áudio (MP3, AAC, WAV)
    header_audio_author_name = Column(String(100), default="Mensagem do Especialista", nullable=True) # Nome exibido no player WhatsApp
    header_audio_author_avatar = Column(String(500), nullable=True) # Foto de perfil do expert no player WhatsApp

    # Fallback Inteligente de Cartão Recusado (#5)
    enable_card_fallback = Column(Boolean, default=True, nullable=False) # Exibe modal de recuperação ao recusar cartão
    card_fallback_discount_percent = Column(Float, default=0.0, nullable=False) # Desconto extra no Pix para salvar a venda (%)

    # Endereço de Cobrança & Antifraude (ViaCEP) (#21)
    require_billing_address = Column(Boolean, default=False, nullable=False) # Exige endereço completo no cartão/boleto para antifraude

    # Boleto Parcelado & Pix Parcelado via Asaas (Carnê Digital + Entrada Pix) (#6)
    enable_asaas_installments = Column(Boolean, default=False, nullable=False) # Ativa opção de carnê parcelado no checkout
    asaas_max_installments = Column(Integer, default=12, nullable=False) # Limite de parcelas no carnê (até 24x)
    asaas_interest_percent = Column(Float, default=0.0, nullable=False) # Juros/acréscimo mensal no carnê (%)
    asaas_require_entry_pix = Column(Boolean, default=True, nullable=False) # Exige 1ª parcela paga via Pix imediato para liberar acesso

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    exit_intent_coupon = relationship("app.models.coupon.Coupon", foreign_keys=[exit_intent_coupon_id])
    split_rules = relationship("ProductSplitRule", back_populates="product", cascade="all, delete-orphan")
    offers = relationship("ProductOffer", back_populates="product", cascade="all, delete-orphan", order_by="ProductOffer.id")
    webhooks = relationship("ProductWebhook", back_populates="product", cascade="all, delete-orphan")
    order_bumps = relationship("ProductOrderBump", foreign_keys="[ProductOrderBump.product_id]", back_populates="product", cascade="all, delete-orphan", order_by="ProductOrderBump.id")
    upsells = relationship("ProductUpsell", foreign_keys="[ProductUpsell.product_id]", back_populates="product", cascade="all, delete-orphan", order_by="ProductUpsell.id")
    ab_tests = relationship("app.models.ab_test.ABTest", back_populates="product", cascade="all, delete-orphan")


class ProductOffer(Base):
    __tablename__ = "product_offers"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False) # Ex: "Oferta Principal", "Promoção Black Friday", "Preço à Vista"
    slug = Column(String, unique=True, index=True, nullable=False) # Ex: "bussola-astrologica", "bussola-promocional"
    price_brl = Column(Float, nullable=False, default=0.0)
    price_usd = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    pricing_type = Column(String(20), default="one_time", nullable=False) # 'one_time' ou 'recurring'
    billing_cycle = Column(String(20), default="monthly", nullable=False) # 'monthly', 'quarterly', 'semiannual', 'annual'
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="offers")


class ProductSplitRule(Base):
    __tablename__ = "product_split_rules"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("split_recipients.id", ondelete="CASCADE"), nullable=False, index=True)
    percentage = Column(Float, nullable=False, default=0.0)
    valid_until = Column(DateTime, nullable=True) # Prazo de expiração do contrato de co-produção
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", back_populates="split_rules")
    recipient = relationship("SplitRecipient")


class ProductOrderBump(Base):
    __tablename__ = "product_order_bumps"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    bump_product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    bump_offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", foreign_keys=[product_id], back_populates="order_bumps")
    bump_product = relationship("Product", foreign_keys=[bump_product_id])
    bump_offer = relationship("ProductOffer", foreign_keys=[bump_offer_id])


class ProductUpsell(Base):
    __tablename__ = "product_upsells"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Produto e Oferta vinculados do catálogo para o UpSell
    upsell_product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    upsell_offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    price_brl = Column(Float, nullable=False, default=0.0)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    external_url = Column(String(500), nullable=True) # Link da página de vendas externa do UpSell
    is_active = Column(Boolean, default=True, nullable=False)

    # Configuração de Downsell (se o cliente recusar o UpSell)
    enable_downsell = Column(Boolean, default=False, nullable=False)
    downsell_product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    downsell_offer_id = Column(Integer, ForeignKey("product_offers.id", ondelete="SET NULL"), nullable=True, index=True)
    downsell_title = Column(String(255), nullable=True)
    downsell_subtitle = Column(String(255), nullable=True)
    downsell_description = Column(Text, nullable=True)
    downsell_price_brl = Column(Float, nullable=True, default=0.0)
    downsell_image_url = Column(String(500), nullable=True)
    downsell_video_url = Column(String(500), nullable=True)
    downsell_external_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    product = relationship("Product", foreign_keys=[product_id], back_populates="upsells")
    upsell_product = relationship("Product", foreign_keys=[upsell_product_id])
    upsell_offer = relationship("ProductOffer", foreign_keys=[upsell_offer_id])
    downsell_product = relationship("Product", foreign_keys=[downsell_product_id])
    downsell_offer = relationship("ProductOffer", foreign_keys=[downsell_offer_id])


