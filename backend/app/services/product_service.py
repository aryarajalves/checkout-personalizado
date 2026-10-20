"""
Serviço de gerenciamento de Produtos, Ofertas e Regras de Split de Pagamento.
"""
from typing import List, Optional
import os
import re
import socket
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.product import Product, ProductSplitRule, ProductOffer, ProductOrderBump, ProductUpsell
from app.models.coupon import Coupon
from app.models.gateway import SplitRecipient
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSplitRuleResponse,
    ProductSplitRuleItem,
    ProductOfferCreate,
    ProductOfferUpdate,
    ProductOfferResponse,
    ProductOrderBumpCreate,
    ProductOrderBumpUpdate,
    ProductOrderBumpResponse,
    ProductUpsellCreate,
    ProductUpsellUpdate,
    ProductUpsellResponse,
    ProductPixelConfigUpdate,
    ProductPixelConfigResponse,
    ProductAppearanceUpdate,
    ProductAppearanceResponse,
    ProductConversionConfigUpdate,
    ProductConversionConfigResponse,
    ProductDomainUpdate,
    ProductDomainResponse,
)

def sanitize_slug(slug: str) -> str:
    """Garante que o slug seja limpo, sem caracteres especiais e em minúsculas."""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "-", slug.strip().lower())
    cleaned = re.sub(r"-+", "-", cleaned).strip("-")
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug inválido. Use letras, números e hífens."
        )
    return cleaned

def sanitize_custom_domain(domain: Optional[str]) -> Optional[str]:
    """Limpa e valida o formato de domínio personalizado (remove http://, https://, caminhos, portas e espaços)."""
    if not domain:
        return None
    clean = domain.strip().lower()
    clean = re.sub(r"^https?://", "", clean)
    clean = clean.split("/")[0] # remove paths
    clean = clean.split(":")[0] # remove ports
    clean = clean.strip()
    if not clean:
        return None
    # Valida formato de hostname/domínio FQDN (ex: pay.meusite.com.br, checkout.minhaloja.com)
    if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de domínio inválido: '{domain}'. Informe um domínio ou subdomínio válido (ex: pay.meudominio.com.br)."
        )
    return clean

def validate_split_rules(db: Session, rules: List[ProductSplitRuleItem]):
    """Valida se a soma das porcentagens não ultrapassa 100%, se não há sócios duplicados e se os recebedores existem."""
    total_percentage = sum(r.percentage for r in rules)
    if total_percentage > 100.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A soma das porcentagens de split não pode ultrapassar 100%. Total informado: {total_percentage:.2f}%"
        )

    # Verificar se há recebedores duplicados
    recipient_ids = [r.recipient_id for r in rules]
    if len(recipient_ids) != len(set(recipient_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido adicionar o mesmo sócio mais de uma vez no split do produto."
        )

    # Verificar se cada recebedor existe e está cadastrado
    existing_recipients = db.query(SplitRecipient).filter(SplitRecipient.id.in_(recipient_ids)).all()
    existing_ids = {r.id for r in existing_recipients}

    for r_id in recipient_ids:
        if r_id not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recebedor de split ID {r_id} não encontrado."
            )

def _build_rule_response(rule: ProductSplitRule) -> ProductSplitRuleResponse:
    recipient = rule.recipient
    is_expired = False
    if rule.valid_until is not None:
        expiry_dt = rule.valid_until if rule.valid_until.tzinfo else rule.valid_until.replace(tzinfo=timezone.utc)
        is_expired = expiry_dt < datetime.now(timezone.utc)

    return ProductSplitRuleResponse(
        id=rule.id,
        product_id=rule.product_id,
        recipient_id=rule.recipient_id,
        percentage=rule.percentage,
        valid_until=rule.valid_until,
        is_expired=is_expired,
        recipient_name=recipient.name if recipient else None,
        recipient_document=recipient.document if recipient else None,
        recipient_pix_key=recipient.pix_key if recipient else None,
        recipient_crypto_wallet=recipient.crypto_wallet if recipient else None,
        created_at=rule.created_at,
        updated_at=rule.updated_at
    )

def _build_offer_response(offer: ProductOffer) -> ProductOfferResponse:
    return ProductOfferResponse(
        id=offer.id,
        product_id=offer.product_id,
        name=offer.name,
        slug=offer.slug,
        price_brl=offer.price_brl,
        price_usd=offer.price_usd,
        pricing_type=getattr(offer, "pricing_type", "one_time") or "one_time",
        billing_cycle=getattr(offer, "billing_cycle", "monthly") or "monthly",
        is_active=offer.is_active,
        is_default=offer.is_default,
        created_at=offer.created_at,
        updated_at=offer.updated_at
    )

def _build_bump_response(bump: ProductOrderBump) -> ProductOrderBumpResponse:
    bump_prod_name = bump.bump_product.name if bump.bump_product else None
    bump_off_name = bump.bump_offer.name if bump.bump_offer else None
    return ProductOrderBumpResponse(
        id=bump.id,
        product_id=bump.product_id,
        title=bump.title,
        description=bump.description,
        price_brl=bump.price_brl,
        is_active=bump.is_active,
        bump_product_id=bump.bump_product_id,
        bump_offer_id=bump.bump_offer_id,
        bump_product_name=bump_prod_name,
        bump_offer_name=bump_off_name,
        created_at=bump.created_at,
        updated_at=bump.updated_at
    )

from app.services.upsell_service import (
    _build_upsell_response,
    list_product_upsells,
    get_product_upsell,
    create_product_upsell,
    update_product_upsell,
    delete_product_upsell,
)

def _build_product_response(product: Product) -> ProductResponse:
    coupon_code = None
    coupon_discount = None
    if getattr(product, 'exit_intent_coupon', None):
        coupon_code = product.exit_intent_coupon.code
        coupon_discount = product.exit_intent_coupon.discount_percent

    return ProductResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        image_url=product.image_url,
        price_brl=product.price_brl,
        price_usd=product.price_usd,
        is_active=product.is_active,
        require_cpf=bool(getattr(product, 'require_cpf', False)),
        payment_methods=product.payment_methods,
        meta_pixel_id=getattr(product, 'meta_pixel_id', None),
        google_ads_id=getattr(product, 'google_ads_id', None),
        google_ads_conversion_label=getattr(product, 'google_ads_conversion_label', None),
        tiktok_pixel_id=getattr(product, 'tiktok_pixel_id', None),
        pixel_purchase_active=bool(getattr(product, 'pixel_purchase_active', True)),
        pixel_initiate_active=bool(getattr(product, 'pixel_initiate_active', True)),
        pixel_pageview_active=bool(getattr(product, 'pixel_pageview_active', True)),
        primary_color=getattr(product, 'primary_color', '#0284c7') or '#0284c7',
        logo_url=getattr(product, 'logo_url', None),
        timer_enabled=bool(getattr(product, 'timer_enabled', False)),
        timer_minutes=int(getattr(product, 'timer_minutes', 15) or 15),
        timer_text=getattr(product, 'timer_text', 'Esta oferta especial expira em:') or 'Esta oferta especial expira em:',
        testimonials=getattr(product, 'testimonials', None),
        thank_you_url=getattr(product, 'thank_you_url', None),
        custom_domain=getattr(product, 'custom_domain', None),
        pix_discount_percent=float(getattr(product, 'pix_discount_percent', 0.0) or 0.0),
        crypto_discount_percent=float(getattr(product, 'crypto_discount_percent', 0.0) or 0.0),
        max_installments=int(getattr(product, 'max_installments', 12) or 12),
        free_installments_count=int(getattr(product, 'free_installments_count', 1) or 1),
        interest_rate_percent=float(getattr(product, 'interest_rate_percent', 2.99) or 2.99),
        interest_payer=getattr(product, 'interest_payer', 'buyer') or 'buyer',
        enable_exit_intent=bool(getattr(product, 'enable_exit_intent', False)),
        exit_intent_coupon_id=getattr(product, 'exit_intent_coupon_id', None),
        exit_intent_coupon_code=coupon_code,
        exit_intent_coupon_discount_percent=coupon_discount,
        exit_intent_title=getattr(product, 'exit_intent_title', 'Espere! Não perca esta oportunidade exclusiva') or 'Espere! Não perca esta oportunidade exclusiva',
        exit_intent_subtitle=getattr(product, 'exit_intent_subtitle', 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!') or 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!',
        enable_social_proof=bool(getattr(product, 'enable_social_proof', False)),
        social_proof_mode=getattr(product, 'social_proof_mode', 'hybrid') or 'hybrid',
        header_media_type=getattr(product, 'header_media_type', 'none') or 'none',
        header_video_url=getattr(product, 'header_video_url', None),
        header_audio_url=getattr(product, 'header_audio_url', None),
        header_audio_author_name=getattr(product, 'header_audio_author_name', 'Mensagem do Especialista') or 'Mensagem do Especialista',
        header_audio_author_avatar=getattr(product, 'header_audio_author_avatar', None),
        enable_card_fallback=bool(getattr(product, 'enable_card_fallback', True)),
        card_fallback_discount_percent=float(getattr(product, 'card_fallback_discount_percent', 0.0) or 0.0),
        require_billing_address=bool(getattr(product, 'require_billing_address', False)),
        enable_asaas_installments=bool(getattr(product, 'enable_asaas_installments', False)),
        asaas_max_installments=int(getattr(product, 'asaas_max_installments', 12) or 12),
        asaas_interest_percent=float(getattr(product, 'asaas_interest_percent', 0.0) or 0.0),
        asaas_require_entry_pix=bool(getattr(product, 'asaas_require_entry_pix', True)),
        created_at=product.created_at,
        updated_at=product.updated_at,
        split_rules=[_build_rule_response(r) for r in (product.split_rules or [])],
        offers=[_build_offer_response(o) for o in (product.offers or [])],
        order_bumps=[_build_bump_response(b) for b in (product.order_bumps or [])],
        upsells=[_build_upsell_response(u) for u in (product.upsells or [])],
        active_ab_test=(
            {
                "id": t.id,
                "name": t.name,
                "variant_a_offer_id": t.variant_a_offer_id,
                "variant_b_offer_id": t.variant_b_offer_id,
                "variant_a_slug": t.variant_a_offer.slug,
                "variant_b_slug": t.variant_b_offer.slug,
                "split_ratio": t.split_ratio,
            }
            if (t := next((x for x in (getattr(product, 'ab_tests', []) or []) if x.is_active and x.variant_a_offer and x.variant_b_offer and x.variant_a_offer.is_active and x.variant_b_offer.is_active), None))
            else None
        )
    )

def get_products(db: Session, skip: int = 0, limit: int = 100) -> List[ProductResponse]:
    """Lista todos os produtos com suas respectivas regras de split e ofertas."""
    products = db.query(Product).order_by(Product.id.desc()).offset(skip).limit(limit).all()
    return [_build_product_response(p) for p in products]

def get_product_by_id(db: Session, product_id: int) -> ProductResponse:
    """Busca um produto por ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )
    return _build_product_response(product)

def get_product_by_slug(db: Session, slug: str) -> ProductResponse:
    """Busca um produto pelo slug de identificação."""
    clean_slug = sanitize_slug(slug)
    # Primeiro tenta encontrar produto direto
    product = db.query(Product).filter(Product.slug == clean_slug).first()
    if not product:
        # Se não encontrar, busca se alguma oferta possui esse slug
        offer = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug).first()
        if offer:
            product = offer.product
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com slug '{slug}' não encontrado."
        )
    return _build_product_response(product)

def create_product(db: Session, data: ProductCreate) -> ProductResponse:
    """Cria um novo produto, sua oferta padrão inicial e opcionalmente suas regras de split."""
    clean_slug = sanitize_slug(data.slug)

    # Verificar unicidade do slug (tanto em products quanto em product_offers)
    existing_product = db.query(Product).filter(Product.slug == clean_slug).first()
    existing_offer = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug).first()
    if existing_product or existing_offer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um produto ou oferta cadastrada com o slug '{clean_slug}'. Escolha outro identificador de URL."
        )

    clean_domain = sanitize_custom_domain(data.custom_domain) if getattr(data, 'custom_domain', None) else None
    if clean_domain:
        existing_domain = db.query(Product).filter(Product.custom_domain == clean_domain).first()
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O domínio '{clean_domain}' já está em uso pelo produto '{existing_domain.name}'."
            )

    product = Product(
        name=data.name.strip(),
        slug=clean_slug,
        description=data.description,
        image_url=data.image_url,
        price_brl=data.price_brl,
        price_usd=data.price_usd,
        is_active=data.is_active,
        require_cpf=data.require_cpf,
        payment_methods=data.payment_methods,
        meta_pixel_id=data.meta_pixel_id.strip() if data.meta_pixel_id else None,
        google_ads_id=data.google_ads_id.strip() if getattr(data, 'google_ads_id', None) else None,
        google_ads_conversion_label=data.google_ads_conversion_label.strip() if getattr(data, 'google_ads_conversion_label', None) else None,
        tiktok_pixel_id=data.tiktok_pixel_id.strip() if getattr(data, 'tiktok_pixel_id', None) else None,
        primary_color=data.primary_color.strip() if data.primary_color else "#0284c7",
        logo_url=data.logo_url.strip() if data.logo_url else None,
        thank_you_url=data.thank_you_url.strip() if data.thank_you_url else None,
        timer_enabled=data.timer_enabled if getattr(data, 'timer_enabled', None) is not None else False,
        timer_minutes=data.timer_minutes if getattr(data, 'timer_minutes', None) is not None else 15,
        timer_text=data.timer_text.strip() if getattr(data, 'timer_text', None) else "Esta oferta especial expira em:",
        testimonials=data.testimonials.strip() if getattr(data, 'testimonials', None) else None,
        custom_domain=sanitize_custom_domain(data.custom_domain) if getattr(data, 'custom_domain', None) else None,
        pix_discount_percent=data.pix_discount_percent if getattr(data, 'pix_discount_percent', None) is not None else 0.0,
        crypto_discount_percent=data.crypto_discount_percent if getattr(data, 'crypto_discount_percent', None) is not None else 0.0,
        max_installments=int(data.max_installments if getattr(data, 'max_installments', None) is not None else 12),
        free_installments_count=int(data.free_installments_count if getattr(data, 'free_installments_count', None) is not None else 1),
        interest_rate_percent=float(data.interest_rate_percent if getattr(data, 'interest_rate_percent', None) is not None else 2.99),
        interest_payer=data.interest_payer if getattr(data, 'interest_payer', None) in ["buyer", "producer"] else "buyer",
        enable_exit_intent=bool(getattr(data, 'enable_exit_intent', False)),
        exit_intent_coupon_id=getattr(data, 'exit_intent_coupon_id', None),
        exit_intent_title=data.exit_intent_title.strip() if getattr(data, 'exit_intent_title', None) else "Espere! Não perca esta oportunidade exclusiva",
        exit_intent_subtitle=data.exit_intent_subtitle.strip() if getattr(data, 'exit_intent_subtitle', None) else "Liberamos um desconto especial de última chance para você concluir seu pedido agora!",
        enable_social_proof=bool(getattr(data, 'enable_social_proof', False)),
        social_proof_mode=data.social_proof_mode if getattr(data, 'social_proof_mode', None) else "hybrid",
        enable_card_fallback=bool(getattr(data, 'enable_card_fallback', True)),
        card_fallback_discount_percent=float(getattr(data, 'card_fallback_discount_percent', 0.0) or 0.0),
        require_billing_address=bool(getattr(data, 'require_billing_address', False)),
        enable_asaas_installments=bool(getattr(data, 'enable_asaas_installments', False)),
        asaas_max_installments=int(getattr(data, 'asaas_max_installments', 12) or 12),
        asaas_interest_percent=float(getattr(data, 'asaas_interest_percent', 0.0) or 0.0),
        asaas_require_entry_pix=bool(getattr(data, 'asaas_require_entry_pix', True))
    )
    db.add(product)
    db.flush()

    # Criação automática da Oferta Padrão do Produto
    default_offer = ProductOffer(
        product_id=product.id,
        name="Oferta Principal",
        slug=clean_slug,
        price_brl=data.price_brl,
        price_usd=data.price_usd,
        is_active=data.is_active,
        is_default=True
    )
    db.add(default_offer)

    if data.initial_split_rules:
        validate_split_rules(db, data.initial_split_rules)
        for rule in data.initial_split_rules:
            new_rule = ProductSplitRule(
                product_id=product.id,
                recipient_id=rule.recipient_id,
                percentage=rule.percentage,
                valid_until=getattr(rule, "valid_until", None)
            )
            db.add(new_rule)

    db.commit()
    db.refresh(product)
    logger.info(f"Produto '{product.name}' (slug: {product.slug}, ID: {product.id}) criado com sucesso com oferta inicial.")
    return _build_product_response(product)

def update_product(db: Session, product_id: int, data: ProductUpdate) -> ProductResponse:
    """Atualiza as informações de um produto existente."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    if data.slug is not None:
        clean_slug = sanitize_slug(data.slug)
        existing_prod = db.query(Product).filter(Product.slug == clean_slug, Product.id != product_id).first()
        existing_off = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug, ProductOffer.product_id != product_id).first()
        if existing_prod or existing_off:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O slug '{clean_slug}' já está em uso por outro produto ou oferta."
            )
        product.slug = clean_slug

    if data.name is not None:
        product.name = data.name.strip()
    if data.description is not None:
        product.description = data.description
    if data.image_url is not None:
        product.image_url = data.image_url
    if data.price_brl is not None:
        product.price_brl = data.price_brl
    if data.price_usd is not None:
        product.price_usd = data.price_usd
    if data.is_active is not None:
        product.is_active = data.is_active
    if data.require_cpf is not None:
        product.require_cpf = data.require_cpf
    if data.payment_methods is not None:
        product.payment_methods = data.payment_methods
    if data.meta_pixel_id is not None:
        product.meta_pixel_id = data.meta_pixel_id.strip() if data.meta_pixel_id else None
    if getattr(data, 'google_ads_id', None) is not None:
        product.google_ads_id = data.google_ads_id.strip() if data.google_ads_id else None
    if getattr(data, 'google_ads_conversion_label', None) is not None:
        product.google_ads_conversion_label = data.google_ads_conversion_label.strip() if data.google_ads_conversion_label else None
    if getattr(data, 'tiktok_pixel_id', None) is not None:
        product.tiktok_pixel_id = data.tiktok_pixel_id.strip() if data.tiktok_pixel_id else None
    if data.primary_color is not None:
        product.primary_color = data.primary_color.strip() if data.primary_color else "#0284c7"
    if data.logo_url is not None:
        product.logo_url = data.logo_url.strip() if data.logo_url else None
    if getattr(data, 'timer_enabled', None) is not None:
        product.timer_enabled = data.timer_enabled
    if getattr(data, 'timer_minutes', None) is not None:
        product.timer_minutes = data.timer_minutes
    if getattr(data, 'timer_text', None) is not None:
        product.timer_text = data.timer_text.strip() if data.timer_text else "Esta oferta especial expira em:"
    if getattr(data, 'testimonials', None) is not None:
        product.testimonials = data.testimonials.strip() if data.testimonials else None
    if getattr(data, 'thank_you_url', None) is not None:
        product.thank_you_url = data.thank_you_url.strip() if data.thank_you_url else None
    if getattr(data, 'custom_domain', None) is not None:
        clean_domain = sanitize_custom_domain(data.custom_domain)
        if clean_domain:
            existing_domain = db.query(Product).filter(Product.custom_domain == clean_domain, Product.id != product_id).first()
            if existing_domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O domínio '{clean_domain}' já está em uso pelo produto '{existing_domain.name}'."
                )
        product.custom_domain = clean_domain
    if getattr(data, 'pix_discount_percent', None) is not None:
        product.pix_discount_percent = max(0.0, min(100.0, float(data.pix_discount_percent)))
    if getattr(data, 'crypto_discount_percent', None) is not None:
        product.crypto_discount_percent = max(0.0, min(100.0, float(data.crypto_discount_percent)))
    if getattr(data, 'max_installments', None) is not None:
        product.max_installments = max(1, min(12, int(data.max_installments)))
    if getattr(data, 'free_installments_count', None) is not None:
        product.free_installments_count = max(1, min(12, int(data.free_installments_count)))
    if getattr(data, 'interest_rate_percent', None) is not None:
        product.interest_rate_percent = max(0.0, min(20.0, float(data.interest_rate_percent)))
    if getattr(data, 'interest_payer', None) is not None and data.interest_payer in ["buyer", "producer"]:
        product.interest_payer = data.interest_payer
    if getattr(data, 'enable_exit_intent', None) is not None:
        product.enable_exit_intent = data.enable_exit_intent
    if hasattr(data, 'exit_intent_coupon_id') and data.exit_intent_coupon_id is not None:
        product.exit_intent_coupon_id = data.exit_intent_coupon_id
    elif hasattr(data, 'exit_intent_coupon_id') and data.exit_intent_coupon_id is None and 'exit_intent_coupon_id' in data.model_fields_set:
        product.exit_intent_coupon_id = None
    if getattr(data, 'exit_intent_title', None) is not None:
        product.exit_intent_title = data.exit_intent_title.strip()
    if getattr(data, 'exit_intent_subtitle', None) is not None:
        product.exit_intent_subtitle = data.exit_intent_subtitle.strip()
    if getattr(data, 'enable_social_proof', None) is not None:
        product.enable_social_proof = data.enable_social_proof
    if getattr(data, 'social_proof_mode', None) is not None:
        product.social_proof_mode = data.social_proof_mode
    if getattr(data, 'header_media_type', None) is not None:
        product.header_media_type = data.header_media_type
    if getattr(data, 'header_video_url', None) is not None:
        product.header_video_url = data.header_video_url.strip() if data.header_video_url else None
    if getattr(data, 'header_audio_url', None) is not None:
        product.header_audio_url = data.header_audio_url.strip() if data.header_audio_url else None
    if getattr(data, 'header_audio_author_name', None) is not None:
        product.header_audio_author_name = data.header_audio_author_name.strip() if data.header_audio_author_name else "Mensagem do Especialista"
    if getattr(data, 'header_audio_author_avatar', None) is not None:
        product.header_audio_author_avatar = data.header_audio_author_avatar.strip() if data.header_audio_author_avatar else None
    if getattr(data, 'enable_card_fallback', None) is not None:
        product.enable_card_fallback = bool(data.enable_card_fallback)
    if getattr(data, 'card_fallback_discount_percent', None) is not None:
        product.card_fallback_discount_percent = max(0.0, min(100.0, float(data.card_fallback_discount_percent)))
    if getattr(data, 'require_billing_address', None) is not None:
        product.require_billing_address = bool(data.require_billing_address)
    if getattr(data, 'enable_asaas_installments', None) is not None:
        product.enable_asaas_installments = bool(data.enable_asaas_installments)
    if getattr(data, 'asaas_max_installments', None) is not None:
        product.asaas_max_installments = max(2, min(24, int(data.asaas_max_installments)))
    if getattr(data, 'asaas_interest_percent', None) is not None:
        product.asaas_interest_percent = max(0.0, min(20.0, float(data.asaas_interest_percent)))
    if getattr(data, 'asaas_require_entry_pix', None) is not None:
        product.asaas_require_entry_pix = bool(data.asaas_require_entry_pix)

    db.commit()
    db.refresh(product)
    logger.info(f"Produto ID {product.id} atualizado com sucesso.")
    return _build_product_response(product)

def delete_product(db: Session, product_id: int) -> dict:
    """Remove um produto e suas regras e ofertas associadas."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    db.delete(product)
    db.commit()
    logger.info(f"Produto ID {product_id} deletado com sucesso.")
    return {"message": f"Produto ID {product_id} excluído com sucesso."}

def update_product_split_rules(db: Session, product_id: int, rules: List[ProductSplitRuleItem]) -> List[ProductSplitRuleResponse]:
    """Sobrescreve as regras de split de um produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    validate_split_rules(db, rules)

    db.query(ProductSplitRule).filter(ProductSplitRule.product_id == product_id).delete()

    created_rules = []
    for r in rules:
        new_rule = ProductSplitRule(
            product_id=product_id,
            recipient_id=r.recipient_id,
            percentage=r.percentage,
            valid_until=getattr(r, "valid_until", None)
        )
        db.add(new_rule)
        created_rules.append(new_rule)

    db.commit()
    db.refresh(product)
    logger.info(f"Regras de split atualizadas para o produto ID {product_id}. Total de regras: {len(rules)}")
    return [_build_rule_response(r) for r in product.split_rules]

# ==============================================================================
# Métodos de Gerenciamento de Múltiplas Ofertas por Produto (1:N)
# ==============================================================================

def list_product_offers(db: Session, product_id: int) -> List[ProductOfferResponse]:
    """Lista todas as ofertas de um produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )
    offers = db.query(ProductOffer).filter(ProductOffer.product_id == product_id).order_by(ProductOffer.id.asc()).all()
    return [_build_offer_response(o) for o in offers]

def create_product_offer(db: Session, product_id: int, data: ProductOfferCreate) -> ProductOfferResponse:
    """Cria uma nova oferta com preço e slug próprios para o produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    clean_slug = sanitize_slug(data.slug)

    # Verificar unicidade do slug de checkout
    existing_offer = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug).first()
    existing_product = db.query(Product).filter(Product.slug == clean_slug).first()
    if existing_offer or existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O slug '/pay/{clean_slug}' já está em uso por outra oferta ou produto. Escolha um slug diferente."
        )

    # Se for definida como default, desmarcar as outras ofertas do produto
    if data.is_default:
        db.query(ProductOffer).filter(ProductOffer.product_id == product_id).update({"is_default": False})

    offer = ProductOffer(
        product_id=product_id,
        name=data.name.strip(),
        slug=clean_slug,
        price_brl=data.price_brl,
        price_usd=data.price_usd,
        pricing_type=getattr(data, "pricing_type", "one_time") or "one_time",
        billing_cycle=getattr(data, "billing_cycle", "monthly") or "monthly",
        is_active=data.is_active,
        is_default=data.is_default
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    logger.info(f"Nova oferta '{offer.name}' criada para o produto ID {product_id} com slug '/pay/{offer.slug}'.")
    return _build_offer_response(offer)

def update_product_offer(db: Session, product_id: int, offer_id: int, data: ProductOfferUpdate) -> ProductOfferResponse:
    """Atualiza dados de uma oferta específica."""
    offer = db.query(ProductOffer).filter(ProductOffer.id == offer_id, ProductOffer.product_id == product_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Oferta ID {offer_id} do produto ID {product_id} não encontrada."
        )

    if data.slug is not None:
        clean_slug = sanitize_slug(data.slug)
        existing_offer = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug, ProductOffer.id != offer_id).first()
        existing_product = db.query(Product).filter(Product.slug == clean_slug, Product.id != product_id).first()
        if existing_offer or existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O slug '/pay/{clean_slug}' já está em uso. Escolha outro identificador de URL."
            )
        offer.slug = clean_slug

    if data.name is not None:
        offer.name = data.name.strip()
    if data.price_brl is not None:
        offer.price_brl = data.price_brl
    if data.price_usd is not None:
        offer.price_usd = data.price_usd
    if getattr(data, "pricing_type", None) is not None:
        offer.pricing_type = data.pricing_type
    if getattr(data, "billing_cycle", None) is not None:
        offer.billing_cycle = data.billing_cycle
    if data.is_active is not None:
        offer.is_active = data.is_active
    if data.is_default is not None:
        if data.is_default:
            db.query(ProductOffer).filter(ProductOffer.product_id == product_id, ProductOffer.id != offer_id).update({"is_default": False})
        offer.is_default = data.is_default

    db.commit()
    db.refresh(offer)
    logger.info(f"Oferta ID {offer_id} atualizada com sucesso.")
    return _build_offer_response(offer)

def delete_product_offer(db: Session, product_id: int, offer_id: int) -> dict:
    """Remove uma oferta do produto, impedindo deleção se for a única oferta existente."""
    offer = db.query(ProductOffer).filter(ProductOffer.id == offer_id, ProductOffer.product_id == product_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Oferta ID {offer_id} não encontrada para o produto ID {product_id}."
        )

    count = db.query(ProductOffer).filter(ProductOffer.product_id == product_id).count()
    if count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir a única oferta de um produto. Cadastre outra oferta antes de excluir esta."
        )

    was_default = offer.is_default
    db.delete(offer)
    db.commit()

    # Se a excluída era a default, elege a primeira restante como default
    if was_default:
        first_remaining = db.query(ProductOffer).filter(ProductOffer.product_id == product_id).order_by(ProductOffer.id.asc()).first()
        if first_remaining:
            first_remaining.is_default = True
            db.commit()

    logger.info(f"Oferta ID {offer_id} removida com sucesso do produto ID {product_id}.")
    return {"message": f"Oferta ID {offer_id} excluída com sucesso."}

# ==============================================================================
# Métodos para Order Bumps
# ==============================================================================

def list_product_order_bumps(db: Session, product_id: int) -> List[ProductOrderBumpResponse]:
    """Lista todos os order bumps cadastrados para um produto."""
    bumps = db.query(ProductOrderBump).filter(ProductOrderBump.product_id == product_id).order_by(ProductOrderBump.id.asc()).all()
    return [_build_bump_response(b) for b in bumps]

def create_product_order_bump(db: Session, product_id: int, data: ProductOrderBumpCreate) -> ProductOrderBumpResponse:
    """Cria um novo order bump associado ao produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")

    if data.bump_product_id:
        bump_prod = db.query(Product).filter(Product.id == data.bump_product_id).first()
        if not bump_prod:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto vinculado ID {data.bump_product_id} não encontrado.")
    if data.bump_offer_id:
        bump_off = db.query(ProductOffer).filter(ProductOffer.id == data.bump_offer_id).first()
        if not bump_off:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Oferta vinculada ID {data.bump_offer_id} não encontrada.")

    bump = ProductOrderBump(
        product_id=product_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        price_brl=data.price_brl,
        is_active=data.is_active,
        bump_product_id=data.bump_product_id,
        bump_offer_id=data.bump_offer_id,
    )
    db.add(bump)
    db.commit()
    db.refresh(bump)
    logger.info(f"Order bump '{bump.title}' criado para o produto ID {product_id}.")
    return _build_bump_response(bump)

def update_product_order_bump(db: Session, product_id: int, bump_id: int, data: ProductOrderBumpUpdate) -> ProductOrderBumpResponse:
    """Atualiza um order bump existente."""
    bump = db.query(ProductOrderBump).filter(ProductOrderBump.id == bump_id, ProductOrderBump.product_id == product_id).first()
    if not bump:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order bump ID {bump_id} não encontrado.")
    if data.title is not None:
        bump.title = data.title.strip()
    if data.description is not None:
        bump.description = data.description.strip() if data.description else None
    if data.price_brl is not None:
        bump.price_brl = data.price_brl
    if data.is_active is not None:
        bump.is_active = data.is_active
    if "bump_product_id" in data.model_fields_set:
        if data.bump_product_id:
            bump_prod = db.query(Product).filter(Product.id == data.bump_product_id).first()
            if not bump_prod:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto vinculado ID {data.bump_product_id} não encontrado.")
        bump.bump_product_id = data.bump_product_id
    if "bump_offer_id" in data.model_fields_set:
        if data.bump_offer_id:
            bump_off = db.query(ProductOffer).filter(ProductOffer.id == data.bump_offer_id).first()
            if not bump_off:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Oferta vinculada ID {data.bump_offer_id} não encontrada.")
        bump.bump_offer_id = data.bump_offer_id
    db.commit()
    db.refresh(bump)
    logger.info(f"Order bump ID {bump_id} atualizado com sucesso.")
    return _build_bump_response(bump)

def delete_product_order_bump(db: Session, product_id: int, bump_id: int) -> dict:
    """Remove um order bump do produto."""
    bump = db.query(ProductOrderBump).filter(ProductOrderBump.id == bump_id, ProductOrderBump.product_id == product_id).first()
    if not bump:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order bump ID {bump_id} não encontrado.")
    db.delete(bump)
    db.commit()
    logger.info(f"Order bump ID {bump_id} removido com sucesso.")
    return {"message": "Order bump removido com sucesso."}

# As funções de UpSell e DownSell foram extraídas para app.services.upsell_service
# e re-exportadas neste módulo para total compatibilidade retroativa.

# ==============================================================================
# Configuração de Pixel do Produto
# ==============================================================================

def get_product_pixel_config(db: Session, product_id: int) -> ProductPixelConfigResponse:
    """Retorna as configurações e status dos eventos de Pixel do produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")
    return ProductPixelConfigResponse(
        meta_pixel_id=getattr(product, 'meta_pixel_id', None),
        google_ads_id=getattr(product, 'google_ads_id', None),
        google_ads_conversion_label=getattr(product, 'google_ads_conversion_label', None),
        tiktok_pixel_id=getattr(product, 'tiktok_pixel_id', None),
        pixel_purchase_active=bool(getattr(product, 'pixel_purchase_active', True)),
        pixel_initiate_active=bool(getattr(product, 'pixel_initiate_active', True)),
        pixel_pageview_active=bool(getattr(product, 'pixel_pageview_active', True)),
    )

def update_product_pixel_config(db: Session, product_id: int, data: ProductPixelConfigUpdate) -> ProductPixelConfigResponse:
    """Atualiza as configurações do Pixel e a ativação na compra (Purchase)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")
    product.meta_pixel_id = data.meta_pixel_id.strip() if data.meta_pixel_id else None
    product.google_ads_id = data.google_ads_id.strip() if data.google_ads_id else None
    product.google_ads_conversion_label = data.google_ads_conversion_label.strip() if data.google_ads_conversion_label else None
    product.tiktok_pixel_id = data.tiktok_pixel_id.strip() if data.tiktok_pixel_id else None
    product.pixel_purchase_active = data.pixel_purchase_active
    product.pixel_initiate_active = data.pixel_initiate_active
    product.pixel_pageview_active = data.pixel_pageview_active
    db.commit()
    db.refresh(product)
    logger.info(f"Configuração de Pixel atualizada para o produto ID {product_id}.")
    return ProductPixelConfigResponse(
        meta_pixel_id=product.meta_pixel_id,
        google_ads_id=product.google_ads_id,
        google_ads_conversion_label=product.google_ads_conversion_label,
        tiktok_pixel_id=product.tiktok_pixel_id,
        pixel_purchase_active=product.pixel_purchase_active,
        pixel_initiate_active=product.pixel_initiate_active,
        pixel_pageview_active=product.pixel_pageview_active,
    )

# ==============================================================================
# Identidade Visual e Aparência do Checkout (Expert)
# ==============================================================================

def get_product_appearance(db: Session, product_id: int) -> ProductAppearanceResponse:
    """Retorna as configurações visuais e elementos de conversão do checkout do produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")
    return ProductAppearanceResponse(
        primary_color=getattr(product, 'primary_color', '#0284c7') or '#0284c7',
        logo_url=getattr(product, 'logo_url', None),
        image_url=getattr(product, 'image_url', None),
        timer_enabled=bool(getattr(product, 'timer_enabled', False)),
        timer_minutes=int(getattr(product, 'timer_minutes', 15) or 15),
        timer_text=getattr(product, 'timer_text', 'Esta oferta especial expira em:') or 'Esta oferta especial expira em:',
        testimonials=getattr(product, 'testimonials', None),
        header_media_type=getattr(product, 'header_media_type', 'none') or 'none',
        header_video_url=getattr(product, 'header_video_url', None),
        header_audio_url=getattr(product, 'header_audio_url', None),
        header_audio_author_name=getattr(product, 'header_audio_author_name', 'Mensagem do Especialista') or 'Mensagem do Especialista',
        header_audio_author_avatar=getattr(product, 'header_audio_author_avatar', None),
    )

def update_product_appearance(db: Session, product_id: int, data: ProductAppearanceUpdate) -> ProductAppearanceResponse:
    """Atualiza as configurações de cor da marca, logotipo, imagem, timer e depoimentos do checkout."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")
    if data.primary_color is not None:
        product.primary_color = data.primary_color.strip() if data.primary_color else "#0284c7"
    if data.logo_url is not None:
        product.logo_url = data.logo_url.strip() if data.logo_url else None
    if data.image_url is not None:
        product.image_url = data.image_url.strip() if data.image_url else None
    if data.timer_enabled is not None:
        product.timer_enabled = data.timer_enabled
    if data.timer_minutes is not None:
        product.timer_minutes = data.timer_minutes
    if data.timer_text is not None:
        product.timer_text = data.timer_text.strip() if data.timer_text else "Esta oferta especial expira em:"
    if data.testimonials is not None:
        product.testimonials = data.testimonials.strip() if data.testimonials else None
    if data.header_media_type is not None:
        product.header_media_type = data.header_media_type
    if data.header_video_url is not None:
        product.header_video_url = data.header_video_url.strip() if data.header_video_url else None
    if data.header_audio_url is not None:
        product.header_audio_url = data.header_audio_url.strip() if data.header_audio_url else None
    if data.header_audio_author_name is not None:
        product.header_audio_author_name = data.header_audio_author_name.strip() if data.header_audio_author_name else "Mensagem do Especialista"
    if data.header_audio_author_avatar is not None:
        product.header_audio_author_avatar = data.header_audio_author_avatar.strip() if data.header_audio_author_avatar else None

    db.commit()
    db.refresh(product)
    logger.info(f"Aparência e conversão do checkout atualizadas para o produto ID {product_id}.")
    return ProductAppearanceResponse(
        primary_color=product.primary_color or "#0284c7",
        logo_url=product.logo_url,
        image_url=product.image_url,
        timer_enabled=bool(product.timer_enabled),
        timer_minutes=product.timer_minutes or 15,
        timer_text=product.timer_text or "Esta oferta especial expira em:",
        testimonials=product.testimonials,
        header_media_type=product.header_media_type or 'none',
        header_video_url=product.header_video_url,
        header_audio_url=product.header_audio_url,
        header_audio_author_name=product.header_audio_author_name or 'Mensagem do Especialista',
        header_audio_author_avatar=product.header_audio_author_avatar,
    )

def get_product_by_custom_domain(db: Session, raw_domain: str) -> ProductResponse:
    """Busca o produto vinculado a um domínio personalizado CNAME Whitelabel."""
    clean_domain = sanitize_custom_domain(raw_domain)
    if not clean_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domínio não informado ou inválido."
        )
    product = db.query(Product).filter(Product.custom_domain == clean_domain).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum produto configurado para o domínio '{clean_domain}'."
        )
    return _build_product_response(product)

def verify_product_domain(db: Session, product_id: int) -> ProductDomainResponse:
    """Verifica as instruções de CNAME e o status de resolução DNS do domínio configurado."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )
    cname_target = os.getenv("CNAME_TARGET_HOST", "checkout.seudominiobase.com")
    domain = product.custom_domain
    if not domain:
        return ProductDomainResponse(
            product_id=product.id,
            product_name=product.name,
            custom_domain=None,
            cname_target=cname_target,
            is_pointing=False,
            status="unconfigured",
            message="Nenhum domínio próprio configurado para este produto."
        )

    # Teste de resolução DNS via socket
    is_pointing = False
    status_text = "pending"
    msg = f"Aguardando propagação DNS. Aponte o CNAME '{domain}' para '{cname_target}'."
    try:
        ip = socket.gethostbyname(domain)
        if ip:
            is_pointing = True
            status_text = "active"
            msg = f"Domínio '{domain}' resolvendo com sucesso (IP: {ip}). Apontamento ativo!"
    except Exception:
        status_text = "pending"
        msg = f"Apontamento CNAME pendente ou propagando. Verifique as entradas DNS na sua hospedagem."

    return ProductDomainResponse(
        product_id=product.id,
        product_name=product.name,
        custom_domain=domain,
        cname_target=cname_target,
        is_pointing=is_pointing,
        status=status_text,
        message=msg
    )

def update_product_domain(db: Session, product_id: int, custom_domain: Optional[str]) -> ProductDomainResponse:
    """Configura ou remove o domínio personalizado do produto com validação de unicidade."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )
    clean_domain = sanitize_custom_domain(custom_domain)
    if clean_domain:
        existing = db.query(Product).filter(Product.custom_domain == clean_domain, Product.id != product_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O domínio '{clean_domain}' já está em uso pelo produto '{existing.name}'."
            )
    product.custom_domain = clean_domain
    db.commit()
    db.refresh(product)
    logger.info(f"Domínio personalizado do produto ID {product_id} atualizado para '{clean_domain}'.")
    return verify_product_domain(db, product_id)


from app.services.product_conversion_service import (
    get_product_conversion_config,
    update_product_conversion_config,
)
