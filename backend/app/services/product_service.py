"""
Serviço de gerenciamento de Produtos, Ofertas e Regras de Split de Pagamento.
"""
from typing import List, Optional
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.product import Product, ProductSplitRule, ProductOffer, ProductOrderBump, ProductUpsell
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
    return ProductOrderBumpResponse(
        id=bump.id,
        product_id=bump.product_id,
        title=bump.title,
        description=bump.description,
        price_brl=bump.price_brl,
        is_active=bump.is_active,
        created_at=bump.created_at,
        updated_at=bump.updated_at
    )

def _build_upsell_response(upsell: ProductUpsell) -> ProductUpsellResponse:
    return ProductUpsellResponse(
        id=upsell.id,
        product_id=upsell.product_id,
        title=upsell.title,
        subtitle=upsell.subtitle,
        description=upsell.description,
        price_brl=upsell.price_brl,
        image_url=upsell.image_url,
        video_url=upsell.video_url,
        external_url=getattr(upsell, 'external_url', None),
        is_active=upsell.is_active,
        created_at=upsell.created_at,
        updated_at=upsell.updated_at
    )

def _build_product_response(product: Product) -> ProductResponse:
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
        created_at=product.created_at,
        updated_at=product.updated_at,
        split_rules=[_build_rule_response(r) for r in (product.split_rules or [])],
        offers=[_build_offer_response(o) for o in (product.offers or [])],
        order_bumps=[_build_bump_response(b) for b in (product.order_bumps or [])],
        upsells=[_build_upsell_response(u) for u in (product.upsells or [])]
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
        primary_color=data.primary_color.strip() if data.primary_color else "#0284c7",
        logo_url=data.logo_url.strip() if data.logo_url else None,
        thank_you_url=data.thank_you_url.strip() if data.thank_you_url else None,
        timer_enabled=data.timer_enabled if getattr(data, 'timer_enabled', None) is not None else False,
        timer_minutes=data.timer_minutes if getattr(data, 'timer_minutes', None) is not None else 15,
        timer_text=data.timer_text.strip() if getattr(data, 'timer_text', None) else "Esta oferta especial expira em:",
        testimonials=data.testimonials.strip() if getattr(data, 'testimonials', None) else None
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
    bump = ProductOrderBump(
        product_id=product_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        price_brl=data.price_brl,
        is_active=data.is_active,
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

# ==============================================================================
# Métodos para UpSell
# ==============================================================================

def list_product_upsells(db: Session, product_id: int) -> List[ProductUpsellResponse]:
    """Lista todas as ofertas de UpSell cadastradas para o produto."""
    upsells = db.query(ProductUpsell).filter(ProductUpsell.product_id == product_id).order_by(ProductUpsell.id.asc()).all()
    return [_build_upsell_response(u) for u in upsells]

def get_product_upsell(db: Session, product_id: int) -> Optional[ProductUpsellResponse]:
    """Retorna o UpSell ativo do produto."""
    upsell = db.query(ProductUpsell).filter(ProductUpsell.product_id == product_id, ProductUpsell.is_active == True).first()
    if not upsell:
        return None
    return _build_upsell_response(upsell)

def create_product_upsell(db: Session, product_id: int, data: ProductUpsellCreate) -> ProductUpsellResponse:
    """Cria uma oferta de UpSell para o produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")
    upsell = ProductUpsell(
        product_id=product_id,
        title=data.title.strip(),
        subtitle=data.subtitle.strip() if data.subtitle else None,
        description=data.description.strip() if data.description else None,
        price_brl=data.price_brl,
        image_url=data.image_url,
        video_url=data.video_url,
        external_url=data.external_url.strip() if data.external_url else None,
        is_active=data.is_active,
    )
    db.add(upsell)
    db.commit()
    db.refresh(upsell)
    logger.info(f"UpSell '{upsell.title}' criado para o produto ID {product_id}.")
    return _build_upsell_response(upsell)

def update_product_upsell(db: Session, product_id: int, upsell_id: int, data: ProductUpsellUpdate) -> ProductUpsellResponse:
    """Atualiza a oferta de UpSell."""
    upsell = db.query(ProductUpsell).filter(ProductUpsell.id == upsell_id, ProductUpsell.product_id == product_id).first()
    if not upsell:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"UpSell ID {upsell_id} não encontrado.")
    if data.title is not None:
        upsell.title = data.title.strip()
    if data.subtitle is not None:
        upsell.subtitle = data.subtitle.strip() if data.subtitle else None
    if data.description is not None:
        upsell.description = data.description.strip() if data.description else None
    if data.price_brl is not None:
        upsell.price_brl = data.price_brl
    if data.image_url is not None:
        upsell.image_url = data.image_url
    if data.video_url is not None:
        upsell.video_url = data.video_url
    if data.external_url is not None:
        upsell.external_url = data.external_url.strip() if data.external_url else None
    if data.is_active is not None:
        upsell.is_active = data.is_active
    db.commit()
    db.refresh(upsell)
    logger.info(f"UpSell ID {upsell_id} atualizado com sucesso.")
    return _build_upsell_response(upsell)

def delete_product_upsell(db: Session, product_id: int, upsell_id: int) -> dict:
    """Remove uma oferta de UpSell."""
    upsell = db.query(ProductUpsell).filter(ProductUpsell.id == upsell_id, ProductUpsell.product_id == product_id).first()
    if not upsell:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"UpSell ID {upsell_id} não encontrado.")
    db.delete(upsell)
    db.commit()
    logger.info(f"UpSell ID {upsell_id} removido com sucesso.")
    return {"message": "UpSell removido com sucesso."}

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
    product.pixel_purchase_active = data.pixel_purchase_active
    product.pixel_initiate_active = data.pixel_initiate_active
    product.pixel_pageview_active = data.pixel_pageview_active
    db.commit()
    db.refresh(product)
    logger.info(f"Configuração de Pixel atualizada para o produto ID {product_id}.")
    return ProductPixelConfigResponse(
        meta_pixel_id=product.meta_pixel_id,
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
    )


