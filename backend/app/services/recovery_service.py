"""
Serviço de captura de leads e recuperação de vendas (Abandono de Checkout e Pix Gerado/Pendente).
"""
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.abandoned_cart import AbandonedCart
from app.models.order import Order
from app.models.product import Product, ProductOffer
from app.schemas.recovery import (
    CheckoutLeadCaptureRequest,
    CheckoutLeadCaptureResponse,
    AbandonedCartResponse,
    AbandonedCartUpdateRequest,
    PendingPixOrderResponse,
    RecoveryStatsResponse,
)
from app.services.webhook_dispatcher_service import (
    dispatch_abandoned_cart_webhook,
    format_customer_phone_fields,
    STATUS_PORTUGUESE,
)

def capture_lead(db: Session, request: CheckoutLeadCaptureRequest) -> CheckoutLeadCaptureResponse:
    """
    Captura dados parciais do lead no Step 1 do checkout antes da finalização.
    Identifica oferta/produto pelo slug, atualiza registro recente ou cria novo carrinho abandonado.
    Dispara webhook 'checkout.abandoned' para integrações externas.
    """
    slug = request.slug.strip().lower()

    offer = db.query(ProductOffer).filter(ProductOffer.slug == slug, ProductOffer.is_active == True).first()
    product = None
    if offer:
        product = offer.product
    else:
        product = db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()
        if product:
            offer = next((o for o in product.offers if o.is_default and o.is_active), None)

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto ou oferta não encontrado.")

    clean_email = request.email.strip().lower()
    clean_name = request.name.strip()
    clean_phone = request.phone.strip()
    clean_ddi = re.sub(r"\D", "", str(request.phone_ddi or "55")) or "55"

    # Busca se já existe um carrinho recente deste email para o mesmo produto nos últimos 2 dias
    since_time = datetime.now(timezone.utc) - timedelta(hours=48)
    existing_cart = (
        db.query(AbandonedCart)
        .filter(
            AbandonedCart.product_id == product.id,
            AbandonedCart.customer_email == clean_email,
            AbandonedCart.status.in_(["abandoned", "recovered"]),
            AbandonedCart.created_at >= since_time,
        )
        .order_by(desc(AbandonedCart.created_at))
        .first()
    )

    if existing_cart:
        existing_cart.customer_name = clean_name
        existing_cart.customer_phone = clean_phone
        existing_cart.customer_phone_ddi = clean_ddi
        if request.cpf:
            existing_cart.customer_cpf = request.cpf.strip()
        if request.estimated_amount_brl and request.estimated_amount_brl > 0:
            existing_cart.estimated_amount_brl = round(request.estimated_amount_brl, 2)
        if request.coupon_code:
            existing_cart.coupon_code = request.coupon_code.strip()
        if getattr(request, "utm_source", None):
            existing_cart.utm_source = request.utm_source.strip()
        if getattr(request, "utm_medium", None):
            existing_cart.utm_medium = request.utm_medium.strip()
        if getattr(request, "utm_campaign", None):
            existing_cart.utm_campaign = request.utm_campaign.strip()
        if getattr(request, "utm_content", None):
            existing_cart.utm_content = request.utm_content.strip()
        if getattr(request, "utm_term", None):
            existing_cart.utm_term = request.utm_term.strip()
        if getattr(request, "src", None):
            existing_cart.src = request.src.strip()
        existing_cart.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_cart)

        logger.info(f"Lead atualizado no carrinho abandonado #{existing_cart.id} ({clean_email})")
        return CheckoutLeadCaptureResponse(
            cart_id=existing_cart.id,
            recovery_token=existing_cart.recovery_token,
            status=existing_cart.status,
            message="Lead atualizado com sucesso."
        )

    # Cria novo registro de carrinho abandonado
    new_cart = AbandonedCart(
        product_id=product.id,
        offer_id=offer.id if offer else None,
        customer_name=clean_name,
        customer_email=clean_email,
        customer_phone=clean_phone,
        customer_phone_ddi=clean_ddi,
        customer_cpf=request.cpf.strip() if request.cpf else None,
        estimated_amount_brl=round(request.estimated_amount_brl or (offer.price_brl if offer else product.price_brl), 2),
        coupon_code=request.coupon_code.strip() if request.coupon_code else None,
        utm_source=request.utm_source.strip() if getattr(request, "utm_source", None) else None,
        utm_medium=request.utm_medium.strip() if getattr(request, "utm_medium", None) else None,
        utm_campaign=request.utm_campaign.strip() if getattr(request, "utm_campaign", None) else None,
        utm_content=request.utm_content.strip() if getattr(request, "utm_content", None) else None,
        utm_term=request.utm_term.strip() if getattr(request, "utm_term", None) else None,
        src=request.src.strip() if getattr(request, "src", None) else None,
        status="abandoned",
        contacted=False,
    )
    db.add(new_cart)
    db.commit()
    db.refresh(new_cart)

    logger.info(f"Novo carrinho abandonado capturado #{new_cart.id} para {clean_name} ({clean_email}) - R$ {new_cart.estimated_amount_brl:.2f}")

    # Dispara webhook de abandono
    try:
        dispatch_abandoned_cart_webhook(new_cart, db)
    except Exception as wh_err:
        logger.error(f"Erro ao disparar webhook de abandono para cart #{new_cart.id}: {wh_err}")

    return CheckoutLeadCaptureResponse(
        cart_id=new_cart.id,
        recovery_token=new_cart.recovery_token,
        status=new_cart.status,
        message="Lead capturado com sucesso."
    )


def mark_cart_converted(db: Session, product_id: int, customer_email: str) -> None:
    """
    Quando um pedido é concluído com sucesso, marca os carrinhos abandonados correspondentes como 'converted'.
    """
    clean_email = customer_email.strip().lower()
    carts = (
        db.query(AbandonedCart)
        .filter(
            AbandonedCart.product_id == product_id,
            AbandonedCart.customer_email == clean_email,
            AbandonedCart.status.in_(["abandoned", "recovered"]),
        )
        .all()
    )
    for c in carts:
        c.status = "converted"
        c.updated_at = datetime.now(timezone.utc)
    if carts:
        db.commit()
        logger.info(f"{len(carts)} carrinho(s) abandonado(s) marcado(s) como convertido(s) para {clean_email}")


def list_abandoned_carts(
    db: Session,
    product_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[AbandonedCartResponse]:
    """Lista carrinhos abandonados com enriquecimento de dados e links de recuperação."""
    query = db.query(AbandonedCart).join(Product, AbandonedCart.product_id == Product.id)

    if product_id:
        query = query.filter(AbandonedCart.product_id == product_id)
    if status_filter and status_filter != "all":
        query = query.filter(AbandonedCart.status == status_filter)
    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(AbandonedCart.customer_name).like(search_pattern),
                func.lower(AbandonedCart.customer_email).like(search_pattern),
                func.lower(AbandonedCart.customer_phone).like(search_pattern),
            )
        )

    carts = query.order_by(desc(AbandonedCart.created_at)).offset(offset).limit(limit).all()

    result: List[AbandonedCartResponse] = []
    for c in carts:
        phone_info = format_customer_phone_fields(c.customer_phone, c.customer_phone_ddi)
        slug_ref = c.offer.slug if c.offer else (c.product.slug if c.product else "")
        rec_url = f"/pay/{slug_ref}?recover={c.recovery_token}" if slug_ref else None

        result.append(
            AbandonedCartResponse(
                id=c.id,
                product_id=c.product_id,
                product_name=c.product.name if c.product else None,
                product_slug=c.product.slug if c.product else None,
                offer_id=c.offer_id,
                offer_name=c.offer.name if c.offer else None,
                customer_name=c.customer_name,
                customer_email=c.customer_email,
                customer_phone=c.customer_phone,
                customer_phone_ddi=c.customer_phone_ddi or "55",
                customer_phone_formatted=phone_info.get("phone_formatted"),
                customer_cpf=c.customer_cpf,
                estimated_amount_brl=c.estimated_amount_brl,
                coupon_code=c.coupon_code,
                recovery_token=c.recovery_token,
                recovery_url=rec_url,
                status=c.status,
                contacted=c.contacted,
                notes=c.notes,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return result


def update_abandoned_cart(
    db: Session,
    cart_id: int,
    payload: AbandonedCartUpdateRequest,
) -> AbandonedCartResponse:
    """Atualiza o status, anotação ou flag de contato de um carrinho abandonado."""
    cart = db.query(AbandonedCart).filter(AbandonedCart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrinho abandonado não encontrado.")

    if payload.status is not None:
        if payload.status not in ["abandoned", "recovered", "converted"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status inválido.")
        cart.status = payload.status

    if payload.contacted is not None:
        cart.contacted = payload.contacted

    if payload.notes is not None:
        cart.notes = payload.notes.strip()

    cart.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cart)

    phone_info = format_customer_phone_fields(cart.customer_phone, cart.customer_phone_ddi)
    slug_ref = cart.offer.slug if cart.offer else (cart.product.slug if cart.product else "")
    rec_url = f"/pay/{slug_ref}?recover={cart.recovery_token}" if slug_ref else None

    return AbandonedCartResponse(
        id=cart.id,
        product_id=cart.product_id,
        product_name=cart.product.name if cart.product else None,
        product_slug=cart.product.slug if cart.product else None,
        offer_id=cart.offer_id,
        offer_name=cart.offer.name if cart.offer else None,
        customer_name=cart.customer_name,
        customer_email=cart.customer_email,
        customer_phone=cart.customer_phone,
        customer_phone_ddi=cart.customer_phone_ddi or "55",
        customer_phone_formatted=phone_info.get("phone_formatted"),
        customer_cpf=cart.customer_cpf,
        estimated_amount_brl=cart.estimated_amount_brl,
        coupon_code=cart.coupon_code,
        recovery_token=cart.recovery_token,
        recovery_url=rec_url,
        status=cart.status,
        contacted=cart.contacted,
        notes=cart.notes,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


def list_pending_pix(
    db: Session,
    product_id: Optional[int] = None,
    status_filter: Optional[str] = "pending",
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[PendingPixOrderResponse]:
    """Lista pedidos gerados via Pix com código Copia e Cola para recuperação."""
    query = (
        db.query(Order)
        .join(Product, Order.product_id == Product.id)
        .filter(Order.payment_method == "pix")
    )

    if product_id:
        query = query.filter(Order.product_id == product_id)

    if status_filter and status_filter != "all":
        query = query.filter(Order.status == status_filter)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Order.order_code).like(search_pattern),
                func.lower(Order.customer_name).like(search_pattern),
                func.lower(Order.customer_email).like(search_pattern),
                func.lower(Order.customer_phone).like(search_pattern),
            )
        )

    orders = query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

    result: List[PendingPixOrderResponse] = []
    for ord_item in orders:
        phone_info = format_customer_phone_fields(ord_item.customer_phone, ord_item.customer_phone_ddi)
        status_lbl = STATUS_PORTUGUESE.get(ord_item.status, ord_item.status)

        result.append(
            PendingPixOrderResponse(
                order_id=ord_item.id,
                order_code=ord_item.order_code,
                status=ord_item.status,
                status_label=status_lbl,
                product_id=ord_item.product_id,
                product_name=ord_item.product.name if ord_item.product else "Produto",
                offer_name=ord_item.offer.name if ord_item.offer else None,
                customer_name=ord_item.customer_name,
                customer_email=ord_item.customer_email,
                customer_phone=ord_item.customer_phone,
                customer_phone_ddi=ord_item.customer_phone_ddi or "55",
                customer_phone_formatted=phone_info.get("phone_formatted"),
                amount_brl=ord_item.amount_brl,
                qr_code_text=ord_item.qr_code_text,
                qr_code_base64=ord_item.qr_code_base64,
                expires_at=ord_item.expires_at,
                created_at=ord_item.created_at,
            )
        )
    return result


def get_recovery_stats(db: Session) -> RecoveryStatsResponse:
    """Calcula estatísticas consolidadas de Carrinhos Abandonados e Pix Pendentes."""
    # Métricas de Carrinho Abandonado
    total_abandoned = db.query(func.count(AbandonedCart.id)).filter(AbandonedCart.status == "abandoned").scalar() or 0
    total_recovered = db.query(func.count(AbandonedCart.id)).filter(AbandonedCart.status == "recovered").scalar() or 0
    total_converted = db.query(func.count(AbandonedCart.id)).filter(AbandonedCart.status == "converted").scalar() or 0
    total_all_carts = total_abandoned + total_recovered + total_converted

    abandoned_rate = round((total_converted + total_recovered) / total_all_carts * 100, 1) if total_all_carts > 0 else 0.0

    total_abandoned_amount = (
        db.query(func.sum(AbandonedCart.estimated_amount_brl))
        .filter(AbandonedCart.status == "abandoned")
        .scalar()
        or 0.0
    )
    total_recovered_amount = (
        db.query(func.sum(AbandonedCart.estimated_amount_brl))
        .filter(AbandonedCart.status.in_(["recovered", "converted"]))
        .scalar()
        or 0.0
    )

    # Métricas de Pix
    total_pix_generated = db.query(func.count(Order.id)).filter(Order.payment_method == "pix").scalar() or 0
    total_pix_pending = (
        db.query(func.count(Order.id))
        .filter(Order.payment_method == "pix", Order.status.in_(["pending", "waiting_payment"]))
        .scalar()
        or 0
    )
    total_pix_paid = (
        db.query(func.count(Order.id))
        .filter(Order.payment_method == "pix", Order.status == "paid")
        .scalar()
        or 0
    )
    pix_conversion_rate = round(total_pix_paid / total_pix_generated * 100, 1) if total_pix_generated > 0 else 0.0

    total_pix_pending_amount = (
        db.query(func.sum(Order.amount_brl))
        .filter(Order.payment_method == "pix", Order.status.in_(["pending", "waiting_payment"]))
        .scalar()
        or 0.0
    )

    return RecoveryStatsResponse(
        total_abandoned=total_abandoned,
        total_recovered=total_recovered,
        total_converted=total_converted,
        abandoned_rate=abandoned_rate,
        total_abandoned_amount_brl=round(total_abandoned_amount, 2),
        total_recovered_amount_brl=round(total_recovered_amount, 2),
        total_pix_generated=total_pix_generated,
        total_pix_pending=total_pix_pending,
        total_pix_paid=total_pix_paid,
        pix_conversion_rate=pix_conversion_rate,
        total_pix_pending_amount_brl=round(total_pix_pending_amount, 2),
    )
