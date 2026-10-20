"""
Endpoints públicos para o fluxo de checkout e consulta de pedidos.
"""
import re
import httpx
from typing import List
from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.logger import logger

from app.core.database import get_db
from app.schemas.order import (
    CheckoutProcessRequest,
    CheckoutProcessResponse,
    OrderStatusResponse,
    Web3PaymentConfirmRequest,
    OneClickBuyRequest,
    OneClickBuyResponse
)
from app.schemas.coupon import ValidateCouponRequest, ValidateCouponResponse
from app.schemas.recovery import CheckoutLeadCaptureRequest, CheckoutLeadCaptureResponse
from app.schemas.product import SocialProofNotificationItem
from app.services import checkout_service
from app.services import upsell_service

router = APIRouter()

@router.post("/process", response_model=CheckoutProcessResponse, status_code=status.HTTP_201_CREATED)
def process_checkout_endpoint(
    payload: CheckoutProcessRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Processa a finalização de compra no checkout público.
    Gera o pedido, registra os splits de pagamento e gera o Pix Copia e Cola / QR Code via Pagar.me.
    """
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip:
        client_ip = request.client.host if request.client else "127.0.0.1"

    if payload.payment_method in ["asaas_installments", "boleto_parcelado", "carnet"]:
        from app.services.asaas_checkout_service import process_asaas_installment_checkout
        return process_asaas_installment_checkout(db, payload)

    return checkout_service.process_checkout(db, payload, client_ip=client_ip)


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


@router.get("/social-proof/{slug}", response_model=List[SocialProofNotificationItem])
def get_social_proof_notifications(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Retorna notificações recentes de compras aprovadas (ou simuladas/híbridas conforme configuração)
    para o pop-up de Prova Social ao vivo no checkout.
    """
    from app.models.product import Product, ProductOffer
    from app.models.order import Order
    from datetime import datetime, timezone

    clean_slug = slug.strip().lower()
    offer = db.query(ProductOffer).filter(ProductOffer.slug == clean_slug).first()
    product = offer.product if offer else db.query(Product).filter(Product.slug == clean_slug).first()

    if not product or not product.enable_social_proof:
        return []

    mode = product.social_proof_mode or "hybrid"
    notifications: List[SocialProofNotificationItem] = []

    def mask_name(name: str) -> str:
        parts = [p for p in (name or "").strip().split() if p]
        if not parts:
            return "Cliente"
        if len(parts) == 1:
            return parts[0]
        return f"{parts[0]} {parts[-1][0].upper()}."

    def format_payment_method(pm: str) -> str:
        pm_map = {
            "pix": "Pix",
            "credit_card": "Cartão de Crédito",
            "crypto": "Cripto"
        }
        return pm_map.get(pm, "Pix")

    def calc_time_ago(dt: datetime) -> str:
        if not dt:
            return "há poucos minutos"
        now = datetime.now(timezone.utc)
        order_dt = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        diff = now - order_dt
        minutes = max(1, int(diff.total_seconds() // 60))
        if minutes < 60:
            return f"há {minutes} min"
        hours = int(minutes // 60)
        if hours < 24:
            return f"há {hours}h"
        days = int(hours // 24)
        return f"há {days}d"

    simulated_pool = [
        {"customer_name": "Lucas M.", "city": "São Paulo", "state": "SP", "payment_method": "Pix", "time_ago": "há 2 min"},
        {"customer_name": "Mariana S.", "city": "Rio de Janeiro", "state": "RJ", "payment_method": "Cartão de Crédito", "time_ago": "há 4 min"},
        {"customer_name": "Gabriel C.", "city": "Belo Horizonte", "state": "MG", "payment_method": "Pix", "time_ago": "há 7 min"},
        {"customer_name": "Camila R.", "city": "Curitiba", "state": "PR", "payment_method": "Pix", "time_ago": "há 11 min"},
        {"customer_name": "Felipe A.", "city": "Porto Alegre", "state": "RS", "payment_method": "Cartão de Crédito", "time_ago": "há 15 min"},
        {"customer_name": "Beatriz L.", "city": "Brasília", "state": "DF", "payment_method": "Pix", "time_ago": "há 19 min"},
        {"customer_name": "Rafael N.", "city": "Salvador", "state": "BA", "payment_method": "Cripto", "time_ago": "há 26 min"},
        {"customer_name": "Juliana T.", "city": "Goiânia", "state": "GO", "payment_method": "Pix", "time_ago": "há 34 min"},
    ]

    brazilian_cities = [
        ("São Paulo", "SP"), ("Rio de Janeiro", "RJ"), ("Belo Horizonte", "MG"),
        ("Curitiba", "PR"), ("Porto Alegre", "RS"), ("Brasília", "DF"),
        ("Salvador", "BA"), ("Fortaleza", "CE"), ("Recife", "PE"), ("Florianópolis", "SC")
    ]

    if mode in ("real", "hybrid"):
        real_orders = db.query(Order).filter(
            Order.product_id == product.id,
            Order.status == "paid"
        ).order_by(Order.created_at.desc()).limit(10).all()

        for idx, o in enumerate(real_orders):
            city, state = brazilian_cities[idx % len(brazilian_cities)]
            notifications.append(SocialProofNotificationItem(
                customer_name=mask_name(o.customer_name),
                city=city,
                state=state,
                payment_method=format_payment_method(o.payment_method),
                time_ago=calc_time_ago(o.paid_at or o.created_at)
            ))

    if mode == "simulated" or (mode == "hybrid" and len(notifications) < 5):
        needed = 8 - len(notifications) if mode == "hybrid" else 8
        for item in simulated_pool[:needed]:
            notifications.append(SocialProofNotificationItem(**item))

    return notifications


@router.post("/one-click-buy", response_model=OneClickBuyResponse, status_code=status.HTTP_200_OK)
def one_click_buy_endpoint(
    payload: OneClickBuyRequest,
    db: Session = Depends(get_db)
):
    """
    Processa a aceitação de UpSell ou DownSell com 1 clique:
    - Cartão de Crédito: cobra automaticamente usando tokenização e aprova imediatamente.
    - Pix: gera QR Code e Copia e Cola instantâneo para pagamento imediato (Opção A).
    """
    return upsell_service.process_one_click_buy(db, payload)


@router.get("/cep/{cep}", status_code=status.HTTP_200_OK)
async def lookup_cep_endpoint(cep: str):
    """
    Consulta endereço no ViaCEP com validação, sanitização e tratamento de erro (#21).
    """
    clean_cep = re.sub(r"\D", "", cep)
    if len(clean_cep) != 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CEP inválido. Deve conter 8 dígitos numéricos."
        )

    url = f"https://viacep.com.br/ws/{clean_cep}/json/"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Serviço ViaCEP temporariamente indisponível."
                )
            data = resp.json()
            if data.get("erro") is True:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="CEP não encontrado."
                )
            return {
                "cep": data.get("cep", clean_cep),
                "street": data.get("logradouro", ""),
                "complement": data.get("complemento", ""),
                "neighborhood": data.get("bairro", ""),
                "city": data.get("localidade", ""),
                "state": data.get("uf", "")
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao consultar ViaCEP para CEP '{clean_cep}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Falha na comunicação com o serviço de busca de CEP."
        )

