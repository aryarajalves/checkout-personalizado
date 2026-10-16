"""
Endpoints públicos para o fluxo de checkout e consulta de pedidos.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.order import (
    CheckoutProcessRequest,
    CheckoutProcessResponse,
    OrderStatusResponse,
    Web3PaymentConfirmRequest
)
from app.schemas.coupon import ValidateCouponRequest, ValidateCouponResponse
from app.schemas.recovery import CheckoutLeadCaptureRequest, CheckoutLeadCaptureResponse
from app.services import checkout_service

router = APIRouter()

@router.post("/process", response_model=CheckoutProcessResponse, status_code=status.HTTP_201_CREATED)
def process_checkout_endpoint(
    payload: CheckoutProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Processa a finalização de compra no checkout público.
    Gera o pedido, registra os splits de pagamento e gera o Pix Copia e Cola / QR Code via Pagar.me.
    """
    return checkout_service.process_checkout(db, payload)


@router.get("/orders/{order_id}/status", response_model=OrderStatusResponse)
def get_order_status_endpoint(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Consulta o status de um pedido para polling automático na tela de pagamento.
    """
    return checkout_service.get_order_status(db, order_id)


@router.get("/orders/by-code/{order_code}", response_model=OrderStatusResponse)
def get_order_by_code_endpoint(
    order_code: str,
    db: Session = Depends(get_db)
):
    """
    Consulta os dados e status de um pedido pelo seu código público (ex: ORD-20261016-B59B36)
    para alimentar a Página de Obrigado (Thank You Page).
    """
    return checkout_service.get_order_by_code(db, order_code)


@router.post("/orders/{order_id}/simulate-paid", response_model=OrderStatusResponse)
def simulate_order_payment_endpoint(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Simula a liquidação e confirmação de pagamento do pedido em ambiente de testes/sandbox.
    """
    return checkout_service.simulate_order_payment(db, order_id)


@router.post("/orders/{order_id}/confirm-web3", response_model=OrderStatusResponse)
def confirm_web3_payment_endpoint(
    order_id: int,
    payload: Web3PaymentConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Confirma um pagamento realizado via extensão Web3 (MetaMask) registrando o tx_hash.
    """
    return checkout_service.confirm_web3_payment(
        db=db,
        order_id=order_id,
        tx_hash=payload.tx_hash,
        sender_address=payload.sender_address
    )


@router.post("/validate-coupon", response_model=ValidateCouponResponse)
def validate_coupon_endpoint(
    payload: ValidateCouponRequest,
    db: Session = Depends(get_db)
):
    """
    Valida um cupom de desconto em tempo real para a tela de checkout público.
    Calcula o abatimento sobre a oferta selecionada e eventuais order bumps.
    """
    slug = payload.slug.strip().lower()
    from app.models.product import Product, ProductOffer, ProductOrderBump
    from app.services.coupon_service import validate_and_apply_coupon

    offer = db.query(ProductOffer).filter(ProductOffer.slug == slug, ProductOffer.is_active == True).first()
    product = None
    if offer:
        product = offer.product
    else:
        product = db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()
        if product:
            offer = next((o for o in product.offers if o.is_default and o.is_active), None)

    if not product or not product.is_active:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto ou oferta não encontrada."
        )

    base_brl = offer.price_brl if offer else product.price_brl
    base_usd = offer.price_usd if offer else product.price_usd
    amount_brl = base_brl

    if payload.bump_ids:
        bumps = db.query(ProductOrderBump).filter(
            ProductOrderBump.id.in_(payload.bump_ids),
            ProductOrderBump.product_id == product.id,
            ProductOrderBump.is_active == True
        ).all()
        for b in bumps:
            amount_brl += b.price_brl

    if base_usd and base_brl > 0:
        usd_rate = base_usd / base_brl
        amount_usd = round(amount_brl * usd_rate, 2)
    elif base_usd:
        amount_usd = round(base_usd, 2)
    else:
        amount_usd = None

    res = validate_and_apply_coupon(
        db=db,
        code=payload.code,
        product_id=product.id,
        total_brl=amount_brl,
        total_usd=amount_usd
    )

    return ValidateCouponResponse(
        valid=True,
        code=res["code"],
        discount_percent=res["discount_percent"],
        discount_amount_brl=res["discount_amount_brl"],
        discount_amount_usd=res["discount_amount_usd"],
        final_amount_brl=res["final_amount_brl"],
        final_amount_usd=res["final_amount_usd"],
        message=res["message"]
    )


@router.post("/capture-lead", response_model=CheckoutLeadCaptureResponse, status_code=status.HTTP_200_OK)
def capture_lead_endpoint(
    payload: CheckoutLeadCaptureRequest,
    db: Session = Depends(get_db)
):
    """
    Captura dados de lead no Step 1 do checkout para rastreamento e recuperação de abandono.
    """
    from app.services import recovery_service
    return recovery_service.capture_lead(db, payload)



