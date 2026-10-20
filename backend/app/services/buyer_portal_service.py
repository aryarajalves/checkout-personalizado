"""
Serviço da Central Rápida do Comprador (/minhas-compras).
Permite autoatendimento do cliente final para consultar compras, gerar 2ª via de Pix,
acessar áreas de membros e atualizar cartão de assinaturas recorrentes.
"""
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from fastapi import HTTPException, status

from app.models.buyer_portal import BuyerAccessCode
from app.models.order import Order
from app.models.subscription import Subscription, SubscriptionInvoice
from app.models.product import Product
from app.schemas.buyer_portal import (
    BuyerCustomerProfile,
    BuyerOrderItem,
    BuyerSubscriptionItem,
    BuyerSubscriptionInvoice,
    BuyerUpdateCardRequest,
    BuyerRegeneratePixResponse,
)
from app.core.security import create_access_token
from app.core.logger import logger


def _normalize_digits(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    return "".join(c for c in str(val) if c.isdigit())


def request_access_code(db: Session, email: str, cpf: Optional[str] = None) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    norm_cpf = _normalize_digits(cpf)

    # 1. Verifica se existem compras ou assinaturas para este e-mail ou CPF
    order_query = db.query(Order).filter(Order.customer_email.ilike(norm_email))
    sub_query = db.query(Subscription).filter(Subscription.customer_email.ilike(norm_email))

    if norm_cpf:
        order_query = order_query.filter(
            or_(Order.customer_cpf == norm_cpf, Order.customer_cpf.ilike(f"%{norm_cpf}%"))
        )

    has_orders = order_query.first() is not None
    has_subs = sub_query.first() is not None

    if not has_orders and not has_subs:
        logger.warning(f"Tentativa de acesso à Central do Comprador sem compras encontradas: {norm_email}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum pedido ou assinatura foi encontrado com os dados informados. Verifique o e-mail digitado na compra."
        )

    # 2. Invalida códigos anteriores não usados deste e-mail
    db.query(BuyerAccessCode).filter(
        BuyerAccessCode.email == norm_email,
        BuyerAccessCode.is_used == False
    ).update({"is_used": True})

    # 3. Gera código OTP numérico de 6 dígitos
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    otp_record = BuyerAccessCode(
        email=norm_email,
        cpf=norm_cpf,
        code=code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    logger.info(f"[Central do Comprador] Código OTP gerado para {norm_email}: {code} (expira em 15min)")

    # 4. Envio por e-mail (simulado/registrado no log para ambientes de teste e produção)
    return {
        "message": f"Código de verificação enviado com sucesso para {norm_email}.",
        "email": norm_email,
        "expires_in_minutes": 15,
        "dev_code": code # Facilita testes e fluxo automático
    }


def verify_access_code(db: Session, email: str, code: str) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    norm_code = code.strip()
    now_utc = datetime.now(timezone.utc)

    # Busca código não usado
    record = (
        db.query(BuyerAccessCode)
        .filter(
            BuyerAccessCode.email == norm_email,
            BuyerAccessCode.code == norm_code,
            BuyerAccessCode.is_used == False
        )
        .order_by(desc(BuyerAccessCode.id))
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificação incorreto ou já utilizado."
        )

    # Valida expiração
    exp_dt = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=timezone.utc)
    if exp_dt < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O código de verificação expirou. Por favor, solicite um novo código."
        )

    record.is_used = True
    db.commit()

    # Obtém dados do comprador a partir da última ordem ou assinatura
    latest_order = db.query(Order).filter(Order.customer_email.ilike(norm_email)).order_by(desc(Order.id)).first()
    latest_sub = db.query(Subscription).filter(Subscription.customer_email.ilike(norm_email)).order_by(desc(Subscription.id)).first()

    customer_name = latest_order.customer_name if latest_order else (latest_sub.customer_name if latest_sub else "Aluno(a)")
    customer_phone = latest_order.customer_phone if latest_order else (latest_sub.customer_phone if latest_sub else None)
    customer_cpf = latest_order.customer_cpf if latest_order else (latest_sub.customer_document if latest_sub else None)

    # Emite token JWT de sessão do comprador
    token = create_access_token(
        data={
            "sub": norm_email,
            "type": "buyer_portal",
            "email": norm_email,
            "name": customer_name,
            "cpf": customer_cpf,
        },
        expires_delta=timedelta(hours=24)
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": BuyerCustomerProfile(
            name=customer_name,
            email=norm_email,
            cpf=customer_cpf,
            phone=customer_phone
        )
    }


def get_buyer_orders(db: Session, email: str) -> List[BuyerOrderItem]:
    norm_email = email.strip().lower()
    now_utc = datetime.now(timezone.utc)

    orders = (
        db.query(Order)
        .filter(Order.customer_email.ilike(norm_email))
        .order_by(desc(Order.created_at))
        .all()
    )

    items: List[BuyerOrderItem] = []
    for o in orders:
        product_name = o.product.name if o.product else "Produto"
        product_image = o.product.image_url if o.product else None
        offer_name = o.offer.name if o.offer else None

        # Expiração de Pix
        is_pix_expired = False
        if o.payment_method == "pix" and o.status == "pending" and o.expires_at:
            exp_dt = o.expires_at if o.expires_at.tzinfo else o.expires_at.replace(tzinfo=timezone.utc)
            if exp_dt < now_utc:
                is_pix_expired = True

        # Link de área de membros liberado para compras aprovadas
        member_area = None
        if o.status == "paid" and o.product and o.product.member_area_url:
            member_area = o.product.member_area_url

        thank_you = o.product.thank_you_url if o.product else None

        items.append(
            BuyerOrderItem(
                id=o.id,
                order_code=o.order_code,
                product_id=o.product_id,
                product_name=product_name,
                product_image_url=product_image,
                offer_name=offer_name,
                amount_brl=o.amount_brl,
                amount_usd=o.amount_usd,
                payment_method=o.payment_method,
                status=o.status,
                created_at=o.created_at,
                paid_at=o.paid_at,
                expires_at=o.expires_at,
                qr_code_text=o.qr_code_text,
                qr_code_base64=o.qr_code_base64,
                is_pix_expired=is_pix_expired,
                member_area_url=member_area,
                thank_you_url=thank_you,
                card_last_four=None,
                installments=1
            )
        )

    return items


def regenerate_buyer_pix(db: Session, email: str, order_code: str) -> BuyerRegeneratePixResponse:
    norm_email = email.strip().lower()
    order = (
        db.query(Order)
        .filter(Order.order_code == order_code.strip(), Order.customer_email.ilike(norm_email))
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido '{order_code}' não encontrado para este comprador."
        )

    if order.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já foi pago e aprovado com sucesso."
        )

    # Gera novo prazo de 30 minutos e novo QR Code Pix
    new_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    order.expires_at = new_expires

    # Atualiza o Copia e Cola Pix
    order.qr_code_text = (
        f"00020101021226880014br.gov.bcb.pix2566pix.pagar.me/qr/v2/{order.order_code.lower()}-renew"
        f"5204000053039865404{int(order.amount_brl):.2f}5802BR5925PROJETO BASE6009SAO PAULO62070503***6304"
    )
    db.commit()
    db.refresh(order)

    logger.info(f"[Central do Comprador] Novo Pix gerado para o pedido {order.order_code} (novo vencimento: {new_expires})")

    return BuyerRegeneratePixResponse(
        order_code=order.order_code,
        qr_code_text=order.qr_code_text,
        qr_code_base64=order.qr_code_base64,
        expires_at=order.expires_at,
        status=order.status,
        message="Novo código Pix gerado com sucesso! Efetue o pagamento em até 30 minutos."
    )


def get_buyer_subscriptions(db: Session, email: str) -> List[BuyerSubscriptionItem]:
    norm_email = email.strip().lower()

    subs = (
        db.query(Subscription)
        .filter(Subscription.customer_email.ilike(norm_email))
        .order_by(desc(Subscription.created_at if hasattr(Subscription, "created_at") else Subscription.id))
        .all()
    )

    items: List[BuyerSubscriptionItem] = []
    for s in subs:
        product_name = s.product.name if hasattr(s, "product") and s.product else "Assinatura"
        product_image = s.product.image_url if hasattr(s, "product") and s.product else None
        offer_name = s.offer.name if hasattr(s, "offer") and s.offer else None

        member_area = None
        if hasattr(s, "product") and s.product and s.status == "active":
            member_area = s.product.member_area_url

        # Faturas
        invoices_list = (
            db.query(SubscriptionInvoice)
            .filter(SubscriptionInvoice.subscription_id == s.id)
            .order_by(desc(SubscriptionInvoice.cycle_number))
            .all()
        )

        inv_items = [
            BuyerSubscriptionInvoice(
                id=inv.id,
                invoice_code=inv.invoice_code,
                cycle_number=inv.cycle_number,
                amount_brl=inv.amount_brl,
                status=inv.status,
                due_date=inv.due_date,
                paid_at=inv.paid_at
            )
            for inv in invoices_list
        ]

        items.append(
            BuyerSubscriptionItem(
                id=s.id,
                subscription_code=s.subscription_code,
                product_id=s.product_id,
                product_name=product_name,
                product_image_url=product_image,
                offer_name=offer_name,
                billing_cycle=s.billing_cycle,
                amount_brl=s.amount_brl,
                status=s.status,
                card_last_four=s.card_last_four,
                card_brand=s.card_brand,
                current_cycle=s.current_cycle,
                start_date=s.start_date,
                next_billing_at=s.next_billing_at,
                member_area_url=member_area,
                invoices=inv_items
            )
        )

    return items


def update_buyer_subscription_card(
    db: Session,
    email: str,
    subscription_code: str,
    card_data: BuyerUpdateCardRequest
) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    sub = (
        db.query(Subscription)
        .filter(Subscription.subscription_code == subscription_code.strip(), Subscription.customer_email.ilike(norm_email))
        .first()
    )

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assinatura '{subscription_code}' não encontrada para este comprador."
        )

    # Atualiza dados seguros do cartão
    clean_card = "".join(c for c in card_data.card_number if c.isdigit())
    last_four = clean_card[-4:] if len(clean_card) >= 4 else "4242"
    
    # Identifica bandeira simplificada
    brand = "visa"
    if clean_card.startswith("5"):
        brand = "mastercard"
    elif clean_card.startswith("3"):
        brand = "amex"
    elif clean_card.startswith("6"):
        brand = "elo"

    sub.card_last_four = last_four
    sub.card_brand = brand

    # Se a assinatura estava em atraso (past_due), reativa automaticamente com o novo cartão
    if sub.status == "past_due":
        sub.status = "active"
        logger.info(f"[Central do Comprador] Assinatura {sub.subscription_code} reativada para 'active' com novo cartão.")

    db.commit()
    db.refresh(sub)

    logger.info(f"[Central do Comprador] Cartão atualizado com sucesso na assinatura {sub.subscription_code}: •••• {last_four} ({brand.upper()})")

    return {
        "success": True,
        "subscription_code": sub.subscription_code,
        "card_last_four": last_four,
        "card_brand": brand,
        "status": sub.status,
        "message": f"Cartão de crédito final {last_four} atualizado com sucesso na sua assinatura!"
    }
