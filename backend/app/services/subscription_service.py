"""
Serviço de gerenciamento de assinaturas recorrentes, faturas e métricas de MRR.
Compatível com Pagar.me V5 e ciclos Mensal, Trimestral, Semestral e Anual.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.subscription import Subscription, SubscriptionInvoice, generate_subscription_code, generate_invoice_code
from app.models.order import Order
from app.models.product import ProductOffer, Product


def calculate_mrr(amount_brl: float, cycle: str) -> float:
    """
    Calcula o MRR (Monthly Recurring Revenue) proporcional ao ciclo de cobrança:
    - monthly: valor total
    - quarterly: valor / 3
    - semiannual: valor / 6
    - annual: valor / 12
    """
    normalized_cycle = (cycle or "monthly").lower().strip()
    if normalized_cycle == "monthly":
        return round(amount_brl, 2)
    elif normalized_cycle == "quarterly":
        return round(amount_brl / 3.0, 2)
    elif normalized_cycle == "semiannual":
        return round(amount_brl / 6.0, 2)
    elif normalized_cycle == "annual":
        return round(amount_brl / 12.0, 2)
    return round(amount_brl, 2)


def calculate_next_billing(start_dt: datetime, cycle: str) -> datetime:
    """
    Calcula a data do próximo ciclo de cobrança baseado no ciclo contratado.
    """
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    normalized_cycle = (cycle or "monthly").lower().strip()
    if normalized_cycle == "quarterly":
        return start_dt + timedelta(days=90)
    elif normalized_cycle == "semiannual":
        return start_dt + timedelta(days=180)
    elif normalized_cycle == "annual":
        return start_dt + timedelta(days=365)
    else:  # monthly
        return start_dt + timedelta(days=30)


def create_subscription_from_order(
    db: Session,
    order: Order,
    offer: ProductOffer,
    card_last_four: Optional[str] = None,
    card_brand: Optional[str] = None,
    gateway_subscription_id: Optional[str] = None
) -> Subscription:
    """
    Cria uma assinatura ativa a partir de um pedido recorrente processado no checkout.
    Gera automaticamente a primeira fatura (invoice do ciclo 1).
    """
    billing_cycle = (offer.billing_cycle or "monthly").lower().strip()
    now_utc = datetime.now(timezone.utc)
    next_billing = calculate_next_billing(now_utc, billing_cycle)

    subscription = Subscription(
        subscription_code=generate_subscription_code(),
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        customer_phone=order.customer_phone,
        customer_phone_ddi=order.customer_phone_ddi or "55",
        customer_document=order.customer_cpf,
        product_id=order.product_id,
        offer_id=offer.id,
        billing_cycle=billing_cycle,
        amount_brl=order.amount_brl,
        status="active",
        gateway=order.gateway_name or "pagarme",
        gateway_subscription_id=gateway_subscription_id or f"sub_sim_{uuid_hex()[:10]}",
        card_last_four=card_last_four or "4242",
        card_brand=card_brand or "visa",
        current_cycle=1,
        start_date=now_utc,
        next_billing_at=next_billing,
        created_at=now_utc,
        updated_at=now_utc
    )
    db.add(subscription)
    db.flush()

    # Cria fatura inicial do ciclo 1
    invoice_status = "paid" if order.status == "paid" else "paid"  # Em cartão aprovado já é paid
    invoice = SubscriptionInvoice(
        subscription_id=subscription.id,
        order_id=order.id,
        invoice_code=generate_invoice_code(),
        cycle_number=1,
        amount_brl=order.amount_brl,
        status=invoice_status,
        due_date=now_utc,
        paid_at=now_utc if invoice_status == "paid" else None,
        gateway_charge_id=order.external_transaction_id or f"ch_{uuid_hex()[:10]}",
        notes=f"Primeira fatura do ciclo {billing_cycle} gerada no checkout pelo pedido {order.order_code}",
        created_at=now_utc
    )
    db.add(invoice)
    db.flush()

    logger.info(
        f"Assinatura criada com sucesso: {subscription.subscription_code} | "
        f"Cliente: {subscription.customer_name} ({subscription.customer_email}) | "
        f"Ciclo: {billing_cycle} | Valor: R$ {subscription.amount_brl:.2f}"
    )
    return subscription


def uuid_hex() -> str:
    import uuid
    return uuid.uuid4().hex


def get_subscription_stats(db: Session) -> Dict[str, Any]:
    """
    Calcula as métricas executivas de assinaturas:
    - MRR total estimado em BRL
    - Contadores por status (active, past_due, canceled, paused)
    - Total de faturas pagas acumuladas
    """
    active_subs = (
        db.query(Subscription)
        .filter(Subscription.status == "active")
        .all()
    )

    mrr_brl = sum(calculate_mrr(s.amount_brl, s.billing_cycle) for s in active_subs)

    active_count = len(active_subs)
    past_due_count = db.query(Subscription).filter(Subscription.status == "past_due").count()
    canceled_count = db.query(Subscription).filter(Subscription.status == "canceled").count()
    paused_count = db.query(Subscription).filter(Subscription.status == "paused").count()
    total_subscriptions = active_count + past_due_count + canceled_count + paused_count

    # Métricas de Faturas Pagas
    paid_invoices_query = (
        db.query(
            func.coalesce(func.sum(SubscriptionInvoice.amount_brl), 0.0).label("total_paid"),
            func.count(SubscriptionInvoice.id).label("count_paid")
        )
        .filter(SubscriptionInvoice.status == "paid")
        .first()
    )

    total_invoices_paid_brl = float(paid_invoices_query.total_paid or 0.0)
    total_invoices_count = int(paid_invoices_query.count_paid or 0)

    return {
        "mrr_brl": round(mrr_brl, 2),
        "active_subscriptions": active_count,
        "past_due_subscriptions": past_due_count,
        "canceled_subscriptions": canceled_count,
        "paused_subscriptions": paused_count,
        "total_subscriptions": total_subscriptions,
        "total_invoices_paid_brl": round(total_invoices_paid_brl, 2),
        "total_invoices_count": total_invoices_count
    }


def list_subscriptions(
    db: Session,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    product_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[Subscription], int]:
    """
    Retorna lista paginada de assinaturas com filtros.
    """
    query = db.query(Subscription)

    if status_filter and status_filter.strip():
        query = query.filter(Subscription.status == status_filter.strip())

    if product_id:
        query = query.filter(Subscription.product_id == product_id)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Subscription.customer_name).like(term),
                func.lower(Subscription.customer_email).like(term),
                func.lower(Subscription.subscription_code).like(term)
            )
        )

    total = query.count()
    items = query.order_by(Subscription.created_at.desc()).offset(offset).limit(limit).all()
    return items, total


def get_subscription_by_id(db: Session, subscription_id: int) -> Subscription:
    """Busca uma assinatura pelo ID ou levanta 404."""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assinatura #{subscription_id} não encontrada."
        )
    return subscription


def cancel_subscription(db: Session, subscription_id: int, reason: Optional[str] = None) -> Subscription:
    """Cancela uma assinatura ativa ou pausada."""
    subscription = get_subscription_by_id(db, subscription_id)
    if subscription.status == "canceled":
        return subscription

    now_utc = datetime.now(timezone.utc)
    subscription.status = "canceled"
    subscription.canceled_at = now_utc
    subscription.cancel_reason = reason or "Cancelamento solicitado pelo gestor"
    subscription.updated_at = now_utc

    db.commit()
    db.refresh(subscription)

    logger.info(f"Assinatura cancelada: {subscription.subscription_code} | Motivo: {subscription.cancel_reason}")
    return subscription


def pause_subscription(db: Session, subscription_id: int) -> Subscription:
    """Pausa uma assinatura ativa."""
    subscription = get_subscription_by_id(db, subscription_id)
    if subscription.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas assinaturas ativas podem ser pausadas."
        )

    subscription.status = "paused"
    subscription.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(subscription)

    logger.info(f"Assinatura pausada: {subscription.subscription_code}")
    return subscription


def resume_subscription(db: Session, subscription_id: int) -> Subscription:
    """Reativa uma assinatura pausada."""
    subscription = get_subscription_by_id(db, subscription_id)
    if subscription.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas assinaturas pausadas podem ser reativadas."
        )

    subscription.status = "active"
    subscription.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(subscription)

    logger.info(f"Assinatura reativada: {subscription.subscription_code}")
    return subscription


def list_invoices(
    db: Session,
    subscription_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[SubscriptionInvoice], int]:
    """Retorna lista de faturas."""
    query = db.query(SubscriptionInvoice)

    if subscription_id:
        query = query.filter(SubscriptionInvoice.subscription_id == subscription_id)

    if status_filter and status_filter.strip():
        query = query.filter(SubscriptionInvoice.status == status_filter.strip())

    total = query.count()
    items = query.order_by(SubscriptionInvoice.created_at.desc()).offset(offset).limit(limit).all()
    return items, total
