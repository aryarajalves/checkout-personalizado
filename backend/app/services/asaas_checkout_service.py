"""
Serviço de processamento de checkout para Boleto Parcelado & Pix Parcelado via Asaas (Carnê Digital) (#6).
Mantém a modularização desacoplada do checkout_service.py para respeitar limites de linhas e responsabilidades.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.order import Order, OrderSplit, OrderInstallment
from app.models.product import Product, ProductOffer
from app.models.coupon import Coupon
from app.models.affiliate import Affiliate
from app.models.custom_proposal import CustomProposal
from app.schemas.order import CheckoutProcessRequest, CheckoutProcessResponse, OrderInstallmentItemResponse, OrderSplitResponse
from app.services.asaas_service import create_asaas_carnet
from app.services.webhook_dispatcher_service import dispatch_order_webhooks

def generate_order_code() -> str:
    import secrets
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = secrets.token_hex(3).upper()
    return f"ORD-{date_str}-{random_str}"

def process_asaas_installment_checkout(
    db: Session,
    request: CheckoutProcessRequest
) -> CheckoutProcessResponse:
    """
    Processa a finalização de compra na modalidade Boleto/Pix Parcelado via Asaas (Carnê Digital).
    Exige CPF e endereço de cobrança válidos, calcula valores e emite as parcelas.
    """
    # 1. Localizar produto ou oferta pelo slug
    product = db.query(Product).filter(Product.slug == request.slug).first()
    offer = None
    if not product:
        offer = db.query(ProductOffer).filter(ProductOffer.slug == request.slug).first()
        if offer:
            product = offer.product

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ou oferta com slug '{request.slug}' não encontrado."
        )

    # 2. Validar se o produto suporta Carnê Asaas
    if not getattr(product, "enable_asaas_installments", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este produto não possui a modalidade de Boleto/Pix Parcelado (Carnê) habilitada."
        )

    # 3. Validar CPF obrigatório para emissão de boleto bancário no Brasil
    clean_cpf = "".join(filter(str.isdigit, request.cpf or ""))
    if not clean_cpf or len(clean_cpf) != 11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O CPF válido com 11 dígitos é obrigatório para emissão de Boleto Parcelado / Carnê."
        )

    # 4. Validar dados de Endereço de Cobrança (exigidos pelo Banco Central / Asaas)
    if not request.billing_zip_code or not request.billing_street or not request.billing_number or not request.billing_city or not request.billing_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Endereço de cobrança completo (CEP, Rua, Número, Cidade e Estado) é obrigatório para emissão de carnê."
        )

    # 5. Cálculo do valor base (oferta ou produto)
    base_price_brl = offer.price_brl if offer else product.price_brl
    base_price_usd = offer.price_usd if offer else product.price_usd
    total_amount_brl = float(base_price_brl)
    total_amount_usd = float(base_price_usd) if base_price_usd else None

    # Processar Order Bumps se houver
    if request.bump_ids:
        for bump in product.order_bumps:
            if bump.id in request.bump_ids and bump.is_active:
                total_amount_brl += float(bump.price_brl)

    # Processar Cupom de Desconto se houver
    applied_coupon = None
    discount_amount_brl = 0.0
    discount_amount_usd = 0.0
    if request.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == request.coupon_code.strip().upper(),
            Coupon.is_active == True
        ).first()
        if coupon:
            applied_coupon = coupon
            discount_amount_brl = round((total_amount_brl * coupon.discount_percent) / 100.0, 2)
            total_amount_brl = max(0.0, total_amount_brl - discount_amount_brl)
            coupon.current_uses = (coupon.current_uses or 0) + 1

    # Quantidade de parcelas solicitadas
    max_inst = product.asaas_max_installments or 12
    requested_installments = request.asaas_installments or request.installments or 12
    installments_count = max(2, min(max_inst, int(requested_installments)))

    order_code = generate_order_code()
    order = Order(
        order_code=order_code,
        product_id=product.id,
        offer_id=offer.id if offer else None,
        customer_name=request.name.strip(),
        customer_email=str(request.email).strip().lower(),
        customer_phone=request.phone.strip(),
        customer_phone_ddi=request.phone_ddi or "55",
        customer_cpf=clean_cpf,
        amount_brl=round(total_amount_brl, 2),
        amount_usd=total_amount_usd,
        original_amount_brl=round(base_price_brl, 2),
        payment_method="asaas_installments",
        gateway_name="asaas",
        status="pending",
        coupon_id=applied_coupon.id if applied_coupon else None,
        coupon_code=applied_coupon.code if applied_coupon else None,
        discount_amount_brl=discount_amount_brl,
        discount_amount_usd=discount_amount_usd,
        utm_source=request.utm_source,
        utm_medium=request.utm_medium,
        utm_campaign=request.utm_campaign,
        utm_content=request.utm_content,
        utm_term=request.utm_term,
        src=request.src,
        sck=request.sck,
        billing_zip_code=request.billing_zip_code,
        billing_street=request.billing_street,
        billing_number=request.billing_number,
        billing_complement=request.billing_complement,
        billing_neighborhood=request.billing_neighborhood,
        billing_city=request.billing_city,
        billing_state=request.billing_state,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.add(order)
    db.flush()

    # Divisão de Split de Co-produção
    splits_response = []
    if product.split_rules:
        now_dt = datetime.now(timezone.utc)
        for rule in product.split_rules:
            # Checar se contrato está expirado
            if rule.valid_until and rule.valid_until < now_dt:
                continue
            split_amount = round((order.amount_brl * rule.percentage) / 100.0, 2)
            osplit = OrderSplit(
                order_id=order.id,
                recipient_id=rule.recipient_id,
                recipient_name=rule.recipient.name if rule.recipient else "Coprodutor",
                percentage=rule.percentage,
                amount_brl=split_amount
            )
            db.add(osplit)
            splits_response.append(
                OrderSplitResponse(
                    recipient_id=rule.recipient_id,
                    recipient_name=osplit.recipient_name,
                    percentage=osplit.percentage,
                    amount_brl=osplit.amount_brl
                )
            )

    db.commit()
    db.refresh(order)

    # Dados do cliente para o Asaas
    customer_dict = {
        "name": order.customer_name,
        "email": order.customer_email,
        "phone": order.customer_phone,
        "cpf": order.customer_cpf,
        "billing_zip_code": order.billing_zip_code,
        "billing_street": order.billing_street,
        "billing_number": order.billing_number,
        "billing_complement": order.billing_complement,
        "billing_neighborhood": order.billing_neighborhood,
        "billing_city": order.billing_city,
        "billing_state": order.billing_state
    }

    # Gerar Carnê no Asaas
    carnet_data = create_asaas_carnet(
        db=db,
        order=order,
        product=product,
        installments_count=installments_count,
        customer_data=customer_dict
    )

    # Disparar webhook de compra gerada / aguardando pagamento da entrada
    try:
        dispatch_order_webhooks(order, "order.waiting_payment", db)
    except Exception as e:
        logger.error(f"Erro ao disparar webhook order.waiting_payment: {e}")

    # Converter lista de parcelas para schema de resposta
    installments_resp = [
        OrderInstallmentItemResponse(
            id=inst["id"],
            installment_number=inst["installment_number"],
            total_installments=inst["total_installments"],
            amount_brl=inst["amount_brl"],
            due_date=inst["due_date"],
            status=inst["status"],
            payment_method=inst["payment_method"],
            bank_slip_url=inst["bank_slip_url"],
            bank_slip_bar_code=inst["bank_slip_bar_code"],
            qr_code_base64=inst["qr_code_base64"],
            qr_code_text=inst["qr_code_text"]
        )
        for inst in carnet_data.get("installments", [])
    ]

    entry = carnet_data.get("entry_installment", {})

    return CheckoutProcessResponse(
        order_id=order.id,
        order_code=order.order_code,
        status=order.status,
        payment_method="asaas_installments",
        amount_brl=order.amount_brl,
        amount_usd=order.amount_usd,
        original_amount_brl=order.original_amount_brl,
        coupon_code=order.coupon_code,
        discount_amount_brl=order.discount_amount_brl,
        discount_amount_usd=order.discount_amount_usd,
        qr_code_base64=entry.get("qr_code_base64") or order.qr_code_base64,
        qr_code_text=entry.get("qr_code_text") or order.qr_code_text,
        bank_slip_url=entry.get("bank_slip_url"),
        bank_slip_bar_code=entry.get("bank_slip_bar_code"),
        expires_at=order.expires_at,
        splits=splits_response,
        thank_you_url=product.thank_you_url,
        installments_list=installments_resp
    )
