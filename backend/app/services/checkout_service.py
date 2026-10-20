"""
Serviço de processamento de checkout, criação de pedidos, cálculo de splits e consulta de status.
"""
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.order import Order, OrderSplit, OrderPayment
from app.models.product import Product, ProductOffer, ProductSplitRule
from app.models.gateway import GatewaySetting
from app.schemas.order import (
    CheckoutProcessRequest,
    CheckoutProcessResponse,
    OrderStatusResponse,
    OrderSplitResponse,
    OrderPaymentResponse
)
from app.services import pagarme_service
from app.services.nowpayments_service import NowPaymentsService
from app.services.webhook_dispatcher_service import dispatch_order_webhooks

def validate_cpf_digits(cpf_str: str) -> bool:
    """Valida o formato e os dois dígitos verificadores do CPF conforme algoritmo da Receita Federal."""
    digits = re.sub(r"\D", "", cpf_str)
    if len(digits) != 11:
        return False
    # CPFs com todos os dígitos iguais são inválidos
    if digits == digits[0] * 11:
        return False

    # Primeiro dígito verificador
    soma = sum(int(digits[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    d1 = 0 if resto == 10 else resto
    if int(digits[9]) != d1:
        return False

    # Segundo dígito verificador
    soma = sum(int(digits[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    d2 = 0 if resto == 10 else resto
    return int(digits[10]) == d2

def process_checkout(db: Session, request: CheckoutProcessRequest, client_ip: Optional[str] = None) -> CheckoutProcessResponse:
    """
    Processa a submissão de um pedido no checkout público.
    - Checagem preventiva no Escudo Anti-Carding (Blacklist e Velocity Check #10)
    - Localiza o produto e/ou oferta pelo slug informado
    - Valida CPF se o produto exigir
    - Cria o pedido com status 'pending' ou 'paid'
    - Calcula e registra os splits de pagamento
    - Gera cobrança Pix com Pagar.me V5 ou processa Cartão/Cripto
    """
    slug = request.slug.strip().lower()

    # 0. Verificações Preventivas de Segurança (Blacklist & Velocity Check)
    from app.services import security_service
    is_blocked, bl_reason = security_service.check_is_blacklisted(
        db,
        cpf=request.cpf,
        email=request.email,
        phone=request.phone,
        ip_address=client_ip
    )
    if is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Transação não autorizada. Entre em contato com o suporte ou utilize outro método de pagamento."
        )

    is_card_payment = request.payment_method in ["credit_card", "hybrid_pix_card", "hybrid_two_cards"]
    if is_card_payment:
        is_vel_blocked, fail_count, vel_msg = security_service.check_velocity_limit(
            db,
            ip_address=client_ip,
            cpf=request.cpf,
            email=request.email
        )
        if is_vel_blocked:
            security_service.log_card_attempt(
                db,
                ip_address=client_ip,
                cpf=request.cpf,
                email=request.email,
                status="blocked",
                reason="velocity_limit_exceeded"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=vel_msg
            )

    # 1. Localiza a oferta ou o produto pelo slug
    offer: Optional[ProductOffer] = (
        db.query(ProductOffer)
        .filter(ProductOffer.slug == slug, ProductOffer.is_active == True)
        .first()
    )

    product: Optional[Product] = None
    if offer:
        product = offer.product
    else:
        product = (
            db.query(Product)
            .filter(Product.slug == slug, Product.is_active == True)
            .first()
        )
        if product:
            # Seleciona a oferta marcada como padrão se houver
            offer = next((o for o in product.offers if o.is_default and o.is_active), None)

    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto ou oferta não encontrada ou inativa."
        )

    # 2. Validação condicional de CPF
    if product.require_cpf:
        if not request.cpf or not validate_cpf_digits(request.cpf):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O preenchimento de um CPF válido é obrigatório para a compra deste produto."
            )

    # 2.1. Validação condicional de Endereço de Cobrança (#21)
    if getattr(product, "require_billing_address", False) and request.payment_method in ["credit_card", "hybrid_pix_card", "hybrid_two_cards"]:
        missing_address = []
        if not getattr(request, "billing_zip_code", None) or not request.billing_zip_code.strip():
            missing_address.append("CEP")
        if not getattr(request, "billing_street", None) or not request.billing_street.strip():
            missing_address.append("Logradouro/Rua")
        if not getattr(request, "billing_number", None) or not request.billing_number.strip():
            missing_address.append("Número")
        if not getattr(request, "billing_neighborhood", None) or not request.billing_neighborhood.strip():
            missing_address.append("Bairro")
        if not getattr(request, "billing_city", None) or not request.billing_city.strip():
            missing_address.append("Cidade")
        if not getattr(request, "billing_state", None) or not request.billing_state.strip():
            missing_address.append("Estado (UF)")

        if missing_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Endereço de cobrança incompleto. Campos obrigatórios: {', '.join(missing_address)}."
            )

    # 3. Definição do valor da cobrança (Oferta base + Order Bumps)
    base_brl = offer.price_brl if offer else product.price_brl
    base_usd = offer.price_usd if offer else product.price_usd
    amount_brl = base_brl

    if request.bump_ids:
        from app.models.product import ProductOrderBump
        bumps = (
            db.query(ProductOrderBump)
            .filter(
                ProductOrderBump.id.in_(request.bump_ids),
                ProductOrderBump.product_id == product.id,
                ProductOrderBump.is_active == True
            )
            .all()
        )
        for b in bumps:
            amount_brl += b.price_brl
            logger.info(f"Order bump aplicado: '{b.title}' (+ R$ {b.price_brl:.2f})")

    # Calcula amount_usd somando o valor proporcional dos order bumps
    if base_usd and base_brl > 0:
        usd_rate = base_usd / base_brl
        amount_usd = round(amount_brl * usd_rate, 2)
    elif base_usd:
        amount_usd = round(base_usd, 2)
    else:
        amount_usd = round(amount_brl / 5.0, 2) if request.payment_method == "crypto" else None

    # 3.1. Proposta Personalizada (High-Ticket / Closer)
    proposal = None
    if getattr(request, "proposal_code", None):
        from app.models.custom_proposal import CustomProposal
        proposal = db.query(CustomProposal).filter(CustomProposal.proposal_code == request.proposal_code.strip()).first()
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proposta de negociação '{request.proposal_code}' não encontrada."
            )
        now_utc = datetime.now(timezone.utc)
        exp_dt = proposal.expires_at if proposal.expires_at.tzinfo else proposal.expires_at.replace(tzinfo=timezone.utc)
        if proposal.status != "active" or exp_dt < now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta proposta personalizada expirou ou não está mais ativa."
            )
        if proposal.product_id != product.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A proposta informada não pertence a este produto."
            )
        if proposal.payment_method_allowed != "all" and proposal.payment_method_allowed != request.payment_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Esta proposta personalizada permite apenas pagamento via '{proposal.payment_method_allowed}'."
            )
        # Substitui o valor da ordem pelo valor negociado na proposta
        amount_brl = round(proposal.amount_brl, 2)
        if base_usd and base_brl > 0:
            amount_usd = round(amount_brl * (base_usd / base_brl), 2)
        else:
            amount_usd = round(amount_brl / 5.0, 2) if request.payment_method == "crypto" else None
        logger.info(f"Proposta personalizada {proposal.proposal_code} aplicada ao pedido: R$ {amount_brl:.2f}")

    if amount_brl <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor do produto deve ser maior que zero."
        )

    # 4. Aplicação de Cupom de Desconto (se informado)
    coupon_id = None
    coupon_code_applied = None
    discount_amount_brl = 0.0
    discount_amount_usd = 0.0
    original_amount_brl = amount_brl
    original_amount_usd = amount_usd

    if request.coupon_code:
        from app.services.coupon_service import validate_and_apply_coupon, increment_coupon_use
        coupon_res = validate_and_apply_coupon(
            db=db,
            code=request.coupon_code,
            product_id=product.id,
            total_brl=amount_brl,
            total_usd=amount_usd
        )
        coupon_id = coupon_res["coupon_id"]
        coupon_code_applied = coupon_res["code"]
        discount_amount_brl = coupon_res["discount_amount_brl"]
        discount_amount_usd = coupon_res["discount_amount_usd"]
        amount_brl = coupon_res["final_amount_brl"]
        amount_usd = coupon_res["final_amount_usd"]
        increment_coupon_use(db, coupon_id)

    # 4.1. Desconto Automático por Método de Pagamento (Incentivo ao Pix e Cripto)
    method_discount_percent = 0.0
    if request.payment_method == "pix":
        if getattr(product, "pix_discount_percent", 0.0) > 0:
            method_discount_percent = float(product.pix_discount_percent)
        if getattr(request, "card_fallback_applied", False) and getattr(product, "enable_card_fallback", True):
            fallback_disc = float(getattr(product, "card_fallback_discount_percent", 0.0) or 0.0)
            if fallback_disc > 0:
                method_discount_percent += fallback_disc
    elif request.payment_method == "crypto" and getattr(product, "crypto_discount_percent", 0.0) > 0:
        method_discount_percent = float(product.crypto_discount_percent)

    if method_discount_percent > 0:
        method_discount_brl = round(amount_brl * (method_discount_percent / 100.0), 2)
        amount_brl = max(1.0, round(amount_brl - method_discount_brl, 2))
        discount_amount_brl = round(discount_amount_brl + method_discount_brl, 2)
        if amount_usd:
            method_discount_usd = round(amount_usd * (method_discount_percent / 100.0), 2)
            amount_usd = max(0.5, round(amount_usd - method_discount_usd, 2))
            discount_amount_usd = round(discount_amount_usd + method_discount_usd, 2)
        logger.info(
            f"Desconto por método ({request.payment_method} - {method_discount_percent}%): "
            f"-R$ {method_discount_brl:.2f}. Total final: R$ {amount_brl:.2f}"
        )

    # 5. Geração do código único do pedido
    date_prefix = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:6].upper()
    order_code = f"ORD-{date_prefix}-{random_suffix}"

    logger.info(f"Criando pedido {order_code} para {request.name} ({request.email}) - Produto: {product.name} (R$ {amount_brl:.2f})")

    raw_ddi = str(getattr(request, "phone_ddi", "55") or "55").strip().replace("+", "")
    has_discount = bool(coupon_id or method_discount_percent > 0)
    order = Order(
        order_code=order_code,
        product_id=product.id,
        offer_id=offer.id if offer else None,
        customer_name=request.name.strip(),
        customer_email=request.email.strip().lower(),
        customer_phone=request.phone.strip(),
        customer_phone_ddi=raw_ddi or "55",
        customer_cpf=request.cpf.strip() if request.cpf else None,
        amount_brl=round(amount_brl, 2),
        amount_usd=round(amount_usd, 2) if amount_usd else None,
        coupon_id=coupon_id,
        coupon_code=coupon_code_applied,
        discount_amount_brl=discount_amount_brl,
        discount_amount_usd=discount_amount_usd,
        original_amount_brl=original_amount_brl if has_discount else None,
        original_amount_usd=original_amount_usd if has_discount else None,
        payment_method=request.payment_method,
        status="pending",
        gateway_name="pagarme" if request.payment_method in ["pix", "credit_card"] else "nowpayments",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=60),
        utm_source=request.utm_source.strip() if getattr(request, "utm_source", None) else None,
        utm_medium=request.utm_medium.strip() if getattr(request, "utm_medium", None) else None,
        utm_campaign=request.utm_campaign.strip() if getattr(request, "utm_campaign", None) else None,
        utm_content=request.utm_content.strip() if getattr(request, "utm_content", None) else None,
        utm_term=request.utm_term.strip() if getattr(request, "utm_term", None) else None,
        src=request.src.strip() if getattr(request, "src", None) else None,
        sck=request.sck.strip() if getattr(request, "sck", None) else None,
        proposal_id=proposal.id if proposal else None,
        ab_test_id=getattr(request, "ab_test_id", None),
        ab_test_variant=getattr(request, "ab_test_variant", None),
        billing_zip_code=request.billing_zip_code.strip() if getattr(request, "billing_zip_code", None) else None,
        billing_street=request.billing_street.strip() if getattr(request, "billing_street", None) else None,
        billing_number=request.billing_number.strip() if getattr(request, "billing_number", None) else None,
        billing_complement=request.billing_complement.strip() if getattr(request, "billing_complement", None) else None,
        billing_neighborhood=request.billing_neighborhood.strip() if getattr(request, "billing_neighborhood", None) else None,
        billing_city=request.billing_city.strip() if getattr(request, "billing_city", None) else None,
        billing_state=request.billing_state.strip() if getattr(request, "billing_state", None) else None
    )
    db.add(order)
    db.flush()

    # 6. Cálculo e Registro das Linhas de Split (com expiração de co-produção valid_until)
    split_responses: List[OrderSplitResponse] = []
    split_rules = db.query(ProductSplitRule).filter(ProductSplitRule.product_id == product.id).all()

    now_utc = datetime.now(timezone.utc)
    active_rules_map = {}
    expired_percentage = 0.0

    for rule in split_rules:
        is_expired = False
        if rule.valid_until is not None:
            expiry_dt = rule.valid_until if rule.valid_until.tzinfo else rule.valid_until.replace(tzinfo=timezone.utc)
            if expiry_dt < now_utc:
                is_expired = True

        rec_name = rule.recipient.name if rule.recipient else "Sócio"
        if is_expired:
            logger.info(
                f"Regra de co-produção expirada para o recebedor '{rec_name}' (ID {rule.recipient_id}, {rule.percentage}%) "
                f"com término em {rule.valid_until}. Cota retornando ao produtor principal."
            )
            expired_percentage += rule.percentage
        else:
            active_rules_map[rule.recipient_id] = {
                "rule": rule,
                "percentage": rule.percentage,
                "recipient_name": rec_name,
                "is_permanent": rule.valid_until is None,
            }

    # Se houve cota de co-produtor expirada, reintegra ao recebedor principal permanente
    if expired_percentage > 0 and active_rules_map:
        permanent_candidates = [item for item in active_rules_map.values() if item["is_permanent"]]
        target = max(permanent_candidates, key=lambda x: x["percentage"]) if permanent_candidates else max(active_rules_map.values(), key=lambda x: x["percentage"])
        old_perc = target["percentage"]
        target["percentage"] = min(100.0, round(target["percentage"] + expired_percentage, 2))
        logger.info(f"Reintegrando {expired_percentage}% da co-produção expirada ao recebedor principal '{target['recipient_name']}' ({old_perc}% -> {target['percentage']}%).")

    class EffectiveSplitRule:
        def __init__(self, recipient_id, recipient, percentage):
            self.recipient_id = recipient_id
            self.recipient = recipient
            self.percentage = percentage

    effective_split_rules = []
    for item in active_rules_map.values():
        rule = item["rule"]
        effective_perc = item["percentage"]
        share_amount = round((effective_perc / 100.0) * order.amount_brl, 2)
        rec_name = item["recipient_name"]

        order_split = OrderSplit(
            order_id=order.id,
            recipient_id=rule.recipient_id,
            recipient_name=rec_name,
            percentage=effective_perc,
            amount_brl=share_amount
        )
        db.add(order_split)
        split_responses.append(OrderSplitResponse(
            recipient_id=rule.recipient_id,
            recipient_name=rec_name,
            percentage=effective_perc,
            amount_brl=share_amount
        ))
        effective_split_rules.append(EffectiveSplitRule(
            recipient_id=rule.recipient_id,
            recipient=rule.recipient,
            percentage=effective_perc
        ))

    db.flush()

    # 7. Disparo da Cobrança de acordo com o método de pagamento
    if request.payment_method == "pix":
        gateway_setting = (
            db.query(GatewaySetting)
            .filter(GatewaySetting.gateway_name == "pagarme")
            .first()
        )

        pix_data = pagarme_service.create_pix_charge(
            order=order,
            product=product,
            offer=offer,
            split_rules=effective_split_rules,
            gateway_setting=gateway_setting
        )

        order.external_transaction_id = pix_data.get("external_transaction_id")
        order.qr_code_text = pix_data.get("qr_code_text")
        order.qr_code_base64 = pix_data.get("qr_code_base64")
        order.expires_at = pix_data.get("expires_at")

        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method="pix",
            amount_brl=order.amount_brl,
            status="pending",
            qr_code_text=order.qr_code_text,
            qr_code_base64=order.qr_code_base64,
            external_transaction_id=order.external_transaction_id
        ))
    elif request.payment_method == "credit_card":
        selected_inst = request.card_installments or request.installments or 1
        max_inst = int(getattr(product, "max_installments", 12) or 12)
        actual_inst = min(selected_inst, max_inst)
        order.installments = actual_inst

        free_inst = int(getattr(product, "free_installments_count", 1) or 1)
        rate = float(getattr(product, "interest_rate_percent", 2.99) or 2.99)
        payer = getattr(product, "interest_payer", "buyer") or "buyer"
        if payer == "buyer" and actual_inst > free_inst and rate > 0:
            from app.services.installment_service import calculate_single_installment
            calc = calculate_single_installment(
                principal=order.amount_brl,
                installments=actual_inst,
                free_installments_count=free_inst,
                interest_rate_percent=rate,
                interest_payer="buyer"
            )
            order.amount_brl = calc.total_amount

        # Verificação de Recusa de Cartão de Crédito (#5)
        clean_card = (request.card_number or "").replace(" ", "").replace("-", "")
        holder_upper = (getattr(request, 'card_holder', '') or getattr(request, 'card_holder_name', '') or '').upper()
        is_card_declined = (
            clean_card.endswith("0002")
            or clean_card.endswith("9999")
            or "DECLINE" in holder_upper
            or "RECUSAR" in holder_upper
            or "RECUSADO" in holder_upper
        )

        if is_card_declined:
            order.status = "failed"
            db.commit()
            security_service.log_card_attempt(
                db,
                ip_address=client_ip,
                cpf=request.cpf,
                email=request.email,
                status="declined",
                reason="card_declined",
                order_code=order.order_code
            )
            try:
                from app.services.webhook_dispatcher_service import dispatch_order_webhooks
                dispatch_order_webhooks(order, "order.card_declined", db)
            except Exception as wh_err:
                logger.error(f"Erro ao disparar webhook order.card_declined: {wh_err}")

            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Transação não autorizada. O cartão de crédito foi recusado pelo banco emissor.",
                headers={"X-Error-Code": "card_declined"}
            )

        order.status = "paid"
        order.paid_at = datetime.now(timezone.utc)
        order.card_token = f"tok_card_{order.order_code.lower()}"
        order.qr_code_text = f"Pagamento aprovado via Cartão de Crédito ({order.order_code})"

        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method="credit_card",
            amount_brl=order.amount_brl,
            status="paid",
            paid_at=order.paid_at,
            installments=actual_inst,
            card_last_four=request.card_number[-4:] if request.card_number and len(request.card_number) >= 4 else "4242",
            card_brand="visa"
        ))
        security_service.log_card_attempt(
            db,
            ip_address=client_ip,
            cpf=request.cpf,
            email=request.email,
            status="approved",
            order_code=order.order_code
        )
    elif request.payment_method == "hybrid_pix_card":
        order.hybrid_type = "pix_card"
        pix_amt = round(float(request.pix_amount_brl or 0.0), 2)
        card_amt = round(float(request.card_amount_brl or 0.0), 2)

        if pix_amt <= 0 or card_amt <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pagamento híbrido Pix + Cartão, os valores do Pix e do Cartão devem ser maiores que zero."
            )

        if round(pix_amt + card_amt, 2) != round(order.amount_brl, 2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A soma do Pix (R$ {pix_amt:.2f}) e do Cartão (R$ {card_amt:.2f}) deve ser igual ao total do pedido (R$ {order.amount_brl:.2f})."
            )

        now_dt = datetime.now(timezone.utc)
        clean_card = (request.card_number or "").replace(" ", "").replace("-", "")
        holder_upper = (getattr(request, 'card_holder', '') or getattr(request, 'card_holder_name', '') or '').upper()
        if clean_card.endswith("0002") or clean_card.endswith("9999") or "DECLINE" in holder_upper or "RECUSAR" in holder_upper:
            order.status = "failed"
            db.commit()
            security_service.log_card_attempt(
                db,
                ip_address=client_ip,
                cpf=request.cpf,
                email=request.email,
                status="declined",
                reason="card_declined",
                order_code=order.order_code
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Transação não autorizada. O cartão de crédito foi recusado pelo banco emissor.",
                headers={"X-Error-Code": "card_declined"}
            )

        card_last_4 = request.card_number[-4:] if request.card_number and len(request.card_number) >= 4 else "4242"
        # Parte 1: Cartão de Crédito (aprovado na transação inicial)
        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method="credit_card",
            amount_brl=card_amt,
            status="paid",
            paid_at=now_dt,
            installments=request.card_installments or request.installments or 1,
            card_last_four=card_last_4,
            card_brand="visa"
        ))

        # Parte 2: Pix (gerado com o valor de entrada)
        gateway_setting = (
            db.query(GatewaySetting)
            .filter(GatewaySetting.gateway_name == "pagarme")
            .first()
        )
        pix_data = pagarme_service.create_pix_charge(
            order=order,
            product=product,
            offer=offer,
            split_rules=effective_split_rules,
            gateway_setting=gateway_setting,
            custom_amount_brl=pix_amt
        )

        order.external_transaction_id = pix_data.get("external_transaction_id")
        order.qr_code_text = pix_data.get("qr_code_text")
        order.qr_code_base64 = pix_data.get("qr_code_base64")
        order.expires_at = pix_data.get("expires_at")
        order.status = "pending"  # Pedido fica pendente até a quitação da entrada via Pix

        db.add(OrderPayment(
            order_id=order.id,
            part_number=2,
            payment_method="pix",
            amount_brl=pix_amt,
            status="pending",
            qr_code_text=order.qr_code_text,
            qr_code_base64=order.qr_code_base64,
            external_transaction_id=order.external_transaction_id
        ))
    elif request.payment_method == "hybrid_two_cards":
        order.hybrid_type = "two_cards"
        card1_amt = round(float(request.card_amount_brl or 0.0), 2)
        card2_amt = round(float(request.card2_amount_brl or 0.0), 2)

        if card1_amt <= 0 or card2_amt <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pagamento híbrido com 2 Cartões, ambos os valores devem ser maiores que zero."
            )

        if round(card1_amt + card2_amt, 2) != round(order.amount_brl, 2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A soma do Cartão 1 (R$ {card1_amt:.2f}) e do Cartão 2 (R$ {card2_amt:.2f}) deve ser igual ao total do pedido (R$ {order.amount_brl:.2f})."
            )

        now_dt = datetime.now(timezone.utc)
        clean_c1 = (request.card_number or "").replace(" ", "").replace("-", "")
        clean_c2 = (request.card2_number or "").replace(" ", "").replace("-", "")
        h1 = (getattr(request, 'card_holder', '') or getattr(request, 'card_holder_name', '') or '').upper()
        h2 = (getattr(request, 'card2_holder', '') or '').upper()
        if (clean_c1.endswith("0002") or clean_c1.endswith("9999") or "DECLINE" in h1 or "RECUSAR" in h1
                or clean_c2.endswith("0002") or clean_c2.endswith("9999") or "DECLINE" in h2 or "RECUSAR" in h2):
            order.status = "failed"
            db.commit()
            security_service.log_card_attempt(
                db,
                ip_address=client_ip,
                cpf=request.cpf,
                email=request.email,
                status="declined",
                reason="card_declined",
                order_code=order.order_code
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Transação não autorizada. Um dos cartões foi recusado pelo banco emissor.",
                headers={"X-Error-Code": "card_declined"}
            )

        card1_last_4 = request.card_number[-4:] if request.card_number and len(request.card_number) >= 4 else "4242"
        card2_last_4 = request.card2_number[-4:] if request.card2_number and len(request.card2_number) >= 4 else "1234"

        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method="credit_card",
            amount_brl=card1_amt,
            status="paid",
            paid_at=now_dt,
            installments=request.card_installments or request.installments or 1,
            card_last_four=card1_last_4,
            card_brand="visa"
        ))

        db.add(OrderPayment(
            order_id=order.id,
            part_number=2,
            payment_method="credit_card",
            amount_brl=card2_amt,
            status="paid",
            paid_at=now_dt,
            installments=request.card2_installments or 1,
            card_last_four=card2_last_4,
            card_brand="mastercard"
        ))

        order.status = "paid"
        order.paid_at = now_dt
        order.qr_code_text = f"Pagamento aprovado com 2 Cartões de Crédito ({order.order_code})"
    elif request.payment_method == "crypto":
        # Pagamento via NOWPayments (USDT, USDC, BTC, ETH)
        crypto_data = NowPaymentsService.create_crypto_payment(
            amount_usd=order.amount_usd or (order.amount_brl / 5.0),
            crypto_currency=request.crypto_currency or "usdt",
            crypto_network=request.crypto_network or "polygon",
            order_code=order.order_code,
            order_description=f"{product.name} ({order.order_code})",
            db=db
        )

        order.external_transaction_id = crypto_data.get("external_id")
        order.crypto_wallet_address = crypto_data.get("wallet_address")
        order.crypto_currency = crypto_data.get("crypto_currency")
        order.crypto_amount = crypto_data.get("crypto_amount")
        order.crypto_network = crypto_data.get("crypto_network")
        order.qr_code_base64 = crypto_data.get("qr_code_svg")
        order.qr_code_text = crypto_data.get("wallet_address")

        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method="crypto",
            amount_brl=order.amount_brl,
            status="pending",
            qr_code_text=order.qr_code_text,
            qr_code_base64=order.qr_code_base64,
            external_transaction_id=order.external_transaction_id
        ))
    else:
        # Método customizado
        order.qr_code_text = f"Simulação de cobrança {request.payment_method} para {order.order_code}"
        db.add(OrderPayment(
            order_id=order.id,
            part_number=1,
            payment_method=request.payment_method,
            amount_brl=order.amount_brl,
            status="pending",
            qr_code_text=order.qr_code_text
        ))

    # 7.1. Se a oferta for de assinatura recorrente, gera a assinatura e primeira fatura
    subscription_code = None
    if offer and getattr(offer, "pricing_type", "one_time") == "recurring":
        try:
            from app.services.subscription_service import create_subscription_from_order
            sub = create_subscription_from_order(
                db=db,
                order=order,
                offer=offer,
                card_last_four="4242",
                card_brand="visa"
            )
            subscription_code = sub.subscription_code
            logger.info(f"Assinatura gerada automaticamente no checkout: {sub.subscription_code}")
        except Exception as sub_err:
            logger.error(f"Erro ao criar assinatura no checkout: {sub_err}")

    db.commit()
    db.refresh(order)

    # Marca eventuais carrinhos abandonados prévios como convertidos
    try:
        from app.services.recovery_service import mark_cart_converted
        mark_cart_converted(db, product.id, order.customer_email)
    except Exception as rec_err:
        logger.error(f"Erro ao marcar carrinho como convertido: {rec_err}")

    # Disparar webhook de Pix Gerado / Aguardando Pagamento se aplicável
    if request.payment_method in ["pix", "hybrid_pix_card"]:
        try:
            dispatch_order_webhooks(order, "order.waiting_payment", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.waiting_payment: {wh_err}")
    elif order.status == "paid":
        try:
            dispatch_order_webhooks(order, "order.approved", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.approved: {wh_err}")
        if order.ab_test_id and order.ab_test_variant:
            try:
                from app.services.ab_test_service import record_ab_test_conversion
                record_ab_test_conversion(db, order.ab_test_id, order.ab_test_variant, order.amount_brl)
            except Exception as ab_err:
                logger.error(f"Erro ao registrar conversão de Teste A/B: {ab_err}")

    # 8. Atribuição de Afiliado e Registro de Comissão
    if getattr(request, "affiliate_code", None):
        try:
            from app.services.affiliate_service import resolve_affiliate_for_order, register_affiliate_commission
            affiliate, aff_comm_percent = resolve_affiliate_for_order(db, product.id, request.affiliate_code)
            if affiliate and aff_comm_percent > 0:
                register_affiliate_commission(db, order, affiliate, aff_comm_percent)
        except Exception as aff_err:
            logger.error(f"Erro ao processar atribuição de afiliado: {aff_err}")

    # Atualiza status da proposta vinculada se houver
    if proposal:
        proposal.order_id = order.id
        if order.status == "paid":
            proposal.status = "paid"
            proposal.paid_at = datetime.now(timezone.utc)
        db.commit()

    paid_amt = sum(p.amount_brl for p in order.payments if p.status == "paid")
    if not order.payments and order.status == "paid":
        paid_amt = order.amount_brl
    remaining_amt = max(0.0, round(order.amount_brl - paid_amt, 2))
    payment_resps = [OrderPaymentResponse.model_validate(p) for p in order.payments]

    logger.info(f"Pedido {order.order_code} criado com sucesso. Status: {order.status}, Método: {order.payment_method}, Híbrido: {order.hybrid_type}")

    return CheckoutProcessResponse(
        order_id=order.id,
        order_code=order.order_code,
        status=order.status,
        payment_method=order.payment_method,
        hybrid_type=order.hybrid_type,
        amount_brl=order.amount_brl,
        amount_usd=order.amount_usd,
        paid_amount_brl=paid_amt,
        remaining_amount_brl=remaining_amt,
        payments=payment_resps,
        coupon_code=order.coupon_code,
        discount_amount_brl=order.discount_amount_brl or 0.0,
        discount_amount_usd=order.discount_amount_usd or 0.0,
        original_amount_brl=order.original_amount_brl,
        original_amount_usd=order.original_amount_usd,
        affiliate_code=order.affiliate_code,
        affiliate_commission_brl=order.affiliate_commission_brl or 0.0,
        qr_code_base64=order.qr_code_base64,
        qr_code_text=order.qr_code_text,
        crypto_wallet_address=order.crypto_wallet_address,
        crypto_network=order.crypto_network,
        crypto_currency=order.crypto_currency,
        crypto_amount=order.crypto_amount,
        expires_at=order.expires_at,
        splits=split_responses,
        thank_you_url=getattr(product, 'thank_you_url', None),
        subscription_code=subscription_code,
        proposal_code=proposal.proposal_code if proposal else None
    )

def _build_order_status_response(order: Order) -> OrderStatusResponse:
    product_name = order.product.name if order.product else "Produto"
    if order.offer:
        product_name = f"{order.product.name} - {order.offer.name}"

    thank_you_url = getattr(order.product, "thank_you_url", None) if order.product else None

    # Verifica se o produto possui upsell ativo
    active_upsell = None
    if order.product and order.product.upsells:
        active_upsell = next((u for u in order.product.upsells if u.is_active), None)

    has_upsell = active_upsell is not None
    enable_downsell = bool(active_upsell and getattr(active_upsell, 'enable_downsell', False))
    upsell_url = None
    if has_upsell and order.product:
        upsell_url = active_upsell.external_url or f"/upsell/{order.product.slug}?order_code={order.order_code}"

    paid_amt = sum(p.amount_brl for p in order.payments if p.status == "paid")
    if not order.payments and order.status == "paid":
        paid_amt = order.amount_brl
    remaining_amt = max(0.0, round(order.amount_brl - paid_amt, 2))
    payment_resps = [OrderPaymentResponse.model_validate(p) for p in order.payments]
    from app.schemas.order import OrderInstallmentItemResponse
    inst_resps = [
        OrderInstallmentItemResponse(
            id=i.id,
            installment_number=i.installment_number,
            total_installments=i.total_installments,
            amount_brl=i.amount_brl,
            due_date=i.due_date,
            status=i.status,
            payment_method=i.payment_method,
            bank_slip_url=i.bank_slip_url,
            bank_slip_bar_code=i.bank_slip_bar_code,
            qr_code_base64=i.qr_code_base64,
            qr_code_text=i.qr_code_text,
            paid_at=i.paid_at
        )
        for i in getattr(order, 'carnet_installments', [])
    ]

    return OrderStatusResponse(
        order_id=order.id,
        order_code=order.order_code,
        status=order.status,
        hybrid_type=order.hybrid_type,
        paid_at=order.paid_at,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        customer_phone=order.customer_phone,
        customer_phone_ddi=order.customer_phone_ddi,
        product_name=product_name,
        payment_method=order.payment_method,
        amount_brl=order.amount_brl,
        amount_usd=order.amount_usd,
        paid_amount_brl=paid_amt,
        remaining_amount_brl=remaining_amt,
        payments=payment_resps,
        installments_list=inst_resps,
        thank_you_url=thank_you_url,
        has_upsell=has_upsell,
        enable_downsell=enable_downsell,
        upsell_url=upsell_url,
        external_transaction_id=order.external_transaction_id,
        crypto_wallet_address=order.crypto_wallet_address,
        crypto_network=order.crypto_network,
        crypto_currency=order.crypto_currency,
        crypto_amount=order.crypto_amount,
        coupon_code=order.coupon_code,
        discount_amount_brl=order.discount_amount_brl or 0.0,
        discount_amount_usd=order.discount_amount_usd or 0.0,
        original_amount_brl=order.original_amount_brl,
        original_amount_usd=order.original_amount_usd,
        proposal_code=order.proposal.proposal_code if getattr(order, "proposal", None) else None
    )

def get_order_status(db: Session, order_id: int) -> OrderStatusResponse:
    """Consulta o status atual de um pedido para polling da página de pagamento."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )
    return _build_order_status_response(order)

def get_order_by_code(db: Session, order_code: str) -> OrderStatusResponse:
    """Consulta os dados de um pedido pelo código público para a página de obrigado."""
    order = db.query(Order).filter(Order.order_code == order_code.strip()).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido com código '{order_code}' não encontrado."
        )
    return _build_order_status_response(order)

def simulate_order_payment(db: Session, order_id: int) -> OrderStatusResponse:
    """
    Simula a confirmação de pagamento de um pedido em ambiente de testes/sandbox.
    Permite transição instantânea de 'pending' para 'paid' para testes de UX.
    Baixa também fatias pendentes em order_payments.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )

    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc)
    for p in order.payments:
        if p.status != "paid":
            p.status = "paid"
            p.paid_at = datetime.now(timezone.utc)

    # Se o pedido tiver proposta vinculada, marca como paga
    if order.proposal_id:
        from app.models.custom_proposal import CustomProposal
        prop = db.query(CustomProposal).filter(CustomProposal.id == order.proposal_id).first()
        if prop and prop.status != "paid":
            prop.status = "paid"
            prop.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(order)

    # Disparar webhook de Compra Aprovada
    try:
        dispatch_order_webhooks(order, "order.approved", db)
    except Exception as wh_err:
        logger.error(f"Erro ao disparar webhook order.approved (simulação): {wh_err}")

    if order.ab_test_id and order.ab_test_variant:
        try:
            from app.services.ab_test_service import record_ab_test_conversion
            record_ab_test_conversion(db, order.ab_test_id, order.ab_test_variant, order.amount_brl)
        except Exception as ab_err:
            logger.error(f"Erro ao registrar conversão de Teste A/B na simulação: {ab_err}")

    logger.info(f"Pagamento do pedido {order.order_code} confirmado com sucesso via simulação sandbox!")
    return get_order_status(db, order_id)

def confirm_web3_payment(
    db: Session,
    order_id: int,
    tx_hash: str,
    sender_address: Optional[str] = None
) -> OrderStatusResponse:
    """
    Registra o hash da transação assinada via carteira Web3 (MetaMask) e confirma o pedido.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )

    order.external_transaction_id = tx_hash.strip()
    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)

    # Disparar webhook de Compra Aprovada
    try:
        dispatch_order_webhooks(order, "order.approved", db)
    except Exception as wh_err:
        logger.error(f"Erro ao disparar webhook order.approved (web3): {wh_err}")

    logger.info(
        f"Pagamento Web3 MetaMask confirmado para pedido {order.order_code}! "
        f"tx_hash={tx_hash}, sender={sender_address}"
    )
    return get_order_status(db, order_id)

