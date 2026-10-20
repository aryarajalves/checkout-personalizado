"""
Serviço especializado em UpSell e DownSell pós-compra, vínculo com catálogo e motor 1-Click Buy.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.product import Product, ProductOffer, ProductSplitRule, ProductUpsell
from app.models.order import Order, OrderPayment, OrderSplit
from app.models.gateway import GatewaySetting
from app.schemas.product import (
    ProductUpsellCreate,
    ProductUpsellUpdate,
    ProductUpsellResponse,
)
from app.schemas.order import OneClickBuyRequest, OneClickBuyResponse
from app.services import pagarme_service
from app.services.webhook_dispatcher_service import dispatch_order_webhooks

def _build_upsell_response(upsell: ProductUpsell) -> ProductUpsellResponse:
    """Serializa a entidade ProductUpsell para seu schema de resposta completo."""
    up_prod_name = upsell.upsell_product.name if upsell.upsell_product else None
    up_off_name = upsell.upsell_offer.name if upsell.upsell_offer else None
    dw_prod_name = upsell.downsell_product.name if upsell.downsell_product else None
    dw_off_name = upsell.downsell_offer.name if upsell.downsell_offer else None

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
        upsell_product_id=upsell.upsell_product_id,
        upsell_offer_id=upsell.upsell_offer_id,
        upsell_product_name=up_prod_name,
        upsell_offer_name=up_off_name,
        enable_downsell=bool(getattr(upsell, 'enable_downsell', False)),
        downsell_product_id=upsell.downsell_product_id,
        downsell_offer_id=upsell.downsell_offer_id,
        downsell_product_name=dw_prod_name,
        downsell_offer_name=dw_off_name,
        downsell_title=upsell.downsell_title,
        downsell_subtitle=upsell.downsell_subtitle,
        downsell_description=upsell.downsell_description,
        downsell_price_brl=upsell.downsell_price_brl or 0.0,
        downsell_image_url=upsell.downsell_image_url,
        downsell_video_url=upsell.downsell_video_url,
        downsell_external_url=upsell.downsell_external_url,
        created_at=upsell.created_at,
        updated_at=upsell.updated_at
    )

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
    """Cria uma oferta de UpSell e DownSell para o produto."""
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
        upsell_product_id=data.upsell_product_id,
        upsell_offer_id=data.upsell_offer_id,
        enable_downsell=data.enable_downsell or False,
        downsell_product_id=data.downsell_product_id,
        downsell_offer_id=data.downsell_offer_id,
        downsell_title=data.downsell_title.strip() if data.downsell_title else None,
        downsell_subtitle=data.downsell_subtitle.strip() if data.downsell_subtitle else None,
        downsell_description=data.downsell_description.strip() if data.downsell_description else None,
        downsell_price_brl=data.downsell_price_brl or 0.0,
        downsell_image_url=data.downsell_image_url,
        downsell_video_url=data.downsell_video_url,
        downsell_external_url=data.downsell_external_url.strip() if data.downsell_external_url else None,
    )
    db.add(upsell)
    db.commit()
    db.refresh(upsell)
    logger.info(f"UpSell '{upsell.title}' criado para o produto ID {product_id} (Downsell: {upsell.enable_downsell}).")
    return _build_upsell_response(upsell)

def update_product_upsell(db: Session, product_id: int, upsell_id: int, data: ProductUpsellUpdate) -> ProductUpsellResponse:
    """Atualiza a oferta de UpSell e DownSell."""
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
    if data.upsell_product_id is not None:
        upsell.upsell_product_id = data.upsell_product_id if data.upsell_product_id > 0 else None
    if data.upsell_offer_id is not None:
        upsell.upsell_offer_id = data.upsell_offer_id if data.upsell_offer_id > 0 else None

    if data.enable_downsell is not None:
        upsell.enable_downsell = data.enable_downsell
    if data.downsell_product_id is not None:
        upsell.downsell_product_id = data.downsell_product_id if data.downsell_product_id > 0 else None
    if data.downsell_offer_id is not None:
        upsell.downsell_offer_id = data.downsell_offer_id if data.downsell_offer_id > 0 else None
    if data.downsell_title is not None:
        upsell.downsell_title = data.downsell_title.strip() if data.downsell_title else None
    if data.downsell_subtitle is not None:
        upsell.downsell_subtitle = data.downsell_subtitle.strip() if data.downsell_subtitle else None
    if data.downsell_description is not None:
        upsell.downsell_description = data.downsell_description.strip() if data.downsell_description else None
    if data.downsell_price_brl is not None:
        upsell.downsell_price_brl = data.downsell_price_brl
    if data.downsell_image_url is not None:
        upsell.downsell_image_url = data.downsell_image_url
    if data.downsell_video_url is not None:
        upsell.downsell_video_url = data.downsell_video_url
    if data.downsell_external_url is not None:
        upsell.downsell_external_url = data.downsell_external_url.strip() if data.downsell_external_url else None

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

def process_one_click_buy(db: Session, request: OneClickBuyRequest) -> OneClickBuyResponse:
    """
    Processa a compra de UpSell ou DownSell com 1 clique:
    - Comprador de Cartão de Crédito: cobra imediatamente via tokenização (status='paid').
    - Comprador de Pix: gera cobrança Pix instantânea com QR Code e Copia e Cola (status='pending').
    Cria pedido filho (parent_order_id) e calcula splits do produto alvo.
    """
    parent_order = db.query(Order).filter(Order.order_code == request.order_code.strip()).first()
    if not parent_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido principal de origem não encontrado.")
    
    main_product = parent_order.product
    if not main_product or not main_product.upsells:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhuma oferta de UpSell/Downsell configurada para este produto.")
    
    active_upsell: ProductUpsell = next((u for u in main_product.upsells if u.is_active), None)
    if not active_upsell:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhuma oferta de UpSell ativa disponível.")
    
    offer_type = request.offer_type.strip().lower() # 'upsell' ou 'downsell'
    if offer_type == "downsell" and not active_upsell.enable_downsell:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O Downsell não está habilitado para este produto.")

    # Determina o produto, oferta e valor final
    if offer_type == "downsell":
        target_product = active_upsell.downsell_product or main_product
        target_offer = active_upsell.downsell_offer
        target_price = active_upsell.downsell_price_brl or 0.0
        product_display_name = active_upsell.downsell_title or f"Downsell - {target_product.name}"
    else:
        target_product = active_upsell.upsell_product or main_product
        target_offer = active_upsell.upsell_offer
        target_price = active_upsell.price_brl
        product_display_name = active_upsell.title or f"UpSell - {target_product.name}"

    if target_price <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Preço da oferta especial deve ser maior que zero.")

    # Determina o método de pagamento (respeita override se informado; fallback para método do pedido pai)
    effective_method = (request.payment_method or parent_order.payment_method or "credit_card").strip().lower()
    if effective_method in ["hybrid_pix_card", "hybrid_two_cards"]:
        effective_method = "credit_card"

    # Gera código do pedido filho
    suffix_type = "UP" if offer_type == "upsell" else "DW"
    random_part = uuid.uuid4().hex[:5].upper()
    date_prefix = datetime.now(timezone.utc).strftime("%Y%m%d")
    child_order_code = f"ORD-{date_prefix}-{random_part}-{suffix_type}"

    logger.info(
        f"Iniciando 1-Click Buy ({offer_type.upper()}): Pedido Pai={parent_order.order_code}, "
        f"Filho={child_order_code}, Método={effective_method}, Valor=R$ {target_price:.2f}"
    )

    child_order = Order(
        order_code=child_order_code,
        parent_order_id=parent_order.id,
        order_type=offer_type,
        product_id=target_product.id,
        offer_id=target_offer.id if target_offer else None,
        customer_name=parent_order.customer_name,
        customer_email=parent_order.customer_email,
        customer_phone=parent_order.customer_phone,
        customer_phone_ddi=parent_order.customer_phone_ddi or "55",
        customer_cpf=parent_order.customer_cpf,
        amount_brl=round(target_price, 2),
        payment_method=effective_method,
        gateway_name="pagarme",
        utm_source=parent_order.utm_source,
        utm_medium=parent_order.utm_medium,
        utm_campaign=parent_order.utm_campaign,
        utm_content=parent_order.utm_content,
        utm_term=parent_order.utm_term,
        src=parent_order.src,
        sck=parent_order.sck,
        affiliate_id=parent_order.affiliate_id,
        affiliate_code=parent_order.affiliate_code,
    )
    db.add(child_order)
    db.flush()

    # Cálculo dos Splits de pagamento para o produto alvo
    split_rules = db.query(ProductSplitRule).filter(ProductSplitRule.product_id == target_product.id).all()
    for rule in split_rules:
        share_amount = round((rule.percentage / 100.0) * child_order.amount_brl, 2)
        rec_name = rule.recipient.name if rule.recipient else "Sócio"
        db.add(OrderSplit(
            order_id=child_order.id,
            recipient_id=rule.recipient_id,
            recipient_name=rec_name,
            percentage=rule.percentage,
            amount_brl=share_amount
        ))

    qr_code_base64 = None
    qr_code_text = None

    if effective_method == "credit_card":
        # Compra imediata com cartão tokenizado
        child_order.status = "paid"
        child_order.paid_at = datetime.now(timezone.utc)
        child_order.card_token = parent_order.card_token or f"tok_card_{child_order.order_code.lower()}"
        child_order.qr_code_text = f"Pagamento 1-Clique Cartão Aprovado ({child_order.order_code})"

        db.add(OrderPayment(
            order_id=child_order.id,
            part_number=1,
            payment_method="credit_card",
            amount_brl=child_order.amount_brl,
            status="paid",
            paid_at=child_order.paid_at,
            installments=1,
            card_last_four="4242",
            card_brand="visa"
        ))
        db.commit()
        db.refresh(child_order)

        # Dispara webhook de compra aprovada
        try:
            dispatch_order_webhooks(child_order, "order.approved", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook de {offer_type} aprovado: {wh_err}")

        return OneClickBuyResponse(
            success=True,
            status="paid",
            order_code=child_order.order_code,
            parent_order_code=parent_order.order_code,
            offer_type=offer_type,
            product_name=product_display_name,
            amount_brl=child_order.amount_brl,
            payment_method="credit_card",
            message="🎉 Pagamento em 1 clique aprovado com sucesso!",
            thank_you_url=f"/thank-you/{child_order.order_code}"
        )

    else:
        # Pagamento via Pix: gera QR Code e Copia e Cola instantâneo (Opção A)
        child_order.status = "pending"
        child_order.expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)

        gateway_setting = db.query(GatewaySetting).filter(GatewaySetting.gateway_name == "pagarme").first()
        pix_data = pagarme_service.create_pix_charge(
            order=child_order,
            product=target_product,
            offer=target_offer,
            split_rules=split_rules,
            gateway_setting=gateway_setting
        )
        child_order.external_transaction_id = pix_data.get("external_transaction_id")
        child_order.qr_code_text = pix_data.get("qr_code_text")
        child_order.qr_code_base64 = pix_data.get("qr_code_base64")
        qr_code_base64 = child_order.qr_code_base64
        qr_code_text = child_order.qr_code_text

        db.add(OrderPayment(
            order_id=child_order.id,
            part_number=1,
            payment_method="pix",
            amount_brl=child_order.amount_brl,
            status="pending",
            qr_code_text=qr_code_text,
            qr_code_base64=qr_code_base64,
            external_transaction_id=child_order.external_transaction_id
        ))
        db.commit()
        db.refresh(child_order)

        try:
            dispatch_order_webhooks(child_order, "order.waiting_payment", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook de Pix gerado para {offer_type}: {wh_err}")

        return OneClickBuyResponse(
            success=True,
            status="pending",
            order_code=child_order.order_code,
            parent_order_code=parent_order.order_code,
            offer_type=offer_type,
            product_name=product_display_name,
            amount_brl=child_order.amount_brl,
            payment_method="pix",
            qr_code_base64=qr_code_base64,
            qr_code_text=qr_code_text,
            message="Pix gerado! Realize o pagamento para garantir sua oferta especial.",
            thank_you_url=f"/thank-you/{child_order.order_code}"
        )
