"""
Serviço de Relatório de Pedidos, Métricas Executivas de Vendas e BI de Tráfego/UTMs.
"""
import io
import csv
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.order import Order, OrderSplit
from app.models.product import Product, ProductOffer
from app.schemas.sales_report import (
    SalesMetricsResponse,
    PaymentMethodMetric,
    UtmAnalyticsResponse,
    UtmAnalyticsItemResponse,
    OrderReportItemResponse
)


def _apply_date_and_product_filters(query, start_date=None, end_date=None, product_id=None):
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    if product_id:
        query = query.filter(Order.product_id == product_id)
    return query


def get_sales_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    product_id: Optional[int] = None
) -> SalesMetricsResponse:
    """Calcula KPIs consolidados de vendas por período e produto."""
    base_query = db.query(Order)
    base_query = _apply_date_and_product_filters(base_query, start_date, end_date, product_id)

    total_orders = base_query.count()

    paid_orders = base_query.filter(Order.status == "paid").count()
    pending_orders = base_query.filter(Order.status == "pending").count()
    failed_orders = base_query.filter(Order.status.in_(["failed", "canceled"])).count()
    refunded_orders = base_query.filter(Order.status == "refunded").count()

    paid_revenue_query = (
        base_query.filter(Order.status == "paid")
        .with_entities(func.coalesce(func.sum(Order.amount_brl), 0.0))
        .scalar()
    )
    total_revenue_brl = float(paid_revenue_query or 0.0)

    pending_revenue_query = (
        base_query.filter(Order.status == "pending")
        .with_entities(func.coalesce(func.sum(Order.amount_brl), 0.0))
        .scalar()
    )
    pending_revenue_brl = float(pending_revenue_query or 0.0)

    average_ticket_brl = round(total_revenue_brl / paid_orders, 2) if paid_orders > 0 else 0.0
    conversion_rate = round((paid_orders / total_orders) * 100, 2) if total_orders > 0 else 0.0

    # Métricas por Método de Pagamento
    method_labels = {
        "pix": "Pix",
        "credit_card": "Cartão de Crédito",
        "crypto": "Criptomoeda (Web3)",
    }
    payment_methods_metrics = []

    for m_key, m_label in method_labels.items():
        m_orders = base_query.filter(Order.payment_method == m_key)
        m_count = m_orders.count()
        m_paid = m_orders.filter(Order.status == "paid").count()
        m_rev = float(
            m_orders.filter(Order.status == "paid")
            .with_entities(func.coalesce(func.sum(Order.amount_brl), 0.0))
            .scalar()
            or 0.0
        )
        pct = round((m_rev / total_revenue_brl) * 100, 1) if total_revenue_brl > 0 else 0.0

        payment_methods_metrics.append(
            PaymentMethodMetric(
                method=m_key,
                label=m_label,
                count=m_count,
                paid_count=m_paid,
                revenue_brl=round(m_rev, 2),
                percentage=pct
            )
        )

    return SalesMetricsResponse(
        total_revenue_brl=round(total_revenue_brl, 2),
        pending_revenue_brl=round(pending_revenue_brl, 2),
        total_orders_count=total_orders,
        paid_orders_count=paid_orders,
        pending_orders_count=pending_orders,
        failed_orders_count=failed_orders,
        refunded_orders_count=refunded_orders,
        average_ticket_brl=average_ticket_brl,
        conversion_rate_percent=conversion_rate,
        payment_methods_metrics=payment_methods_metrics
    )


def list_orders_report(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status_filter: Optional[str] = None,
    payment_method: Optional[str] = None,
    product_id: Optional[int] = None,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[OrderReportItemResponse], int]:
    """Retorna listagem de pedidos com filtros de relatório e busca textual."""
    query = db.query(Order)
    query = _apply_date_and_product_filters(query, start_date, end_date, product_id)

    if status_filter and status_filter.strip():
        query = query.filter(Order.status == status_filter.strip())

    if payment_method and payment_method.strip():
        query = query.filter(Order.payment_method == payment_method.strip())

    if utm_source and utm_source.strip():
        query = query.filter(Order.utm_source == utm_source.strip())

    if utm_campaign and utm_campaign.strip():
        query = query.filter(Order.utm_campaign == utm_campaign.strip())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Order.order_code).like(term),
                func.lower(Order.customer_name).like(term),
                func.lower(Order.customer_email).like(term),
                func.lower(Order.customer_phone).like(term)
            )
        )

    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for o in orders:
        items.append(
            OrderReportItemResponse(
                id=o.id,
                order_code=o.order_code,
                product_id=o.product_id,
                product_name=o.product.name if o.product else f"Produto #{o.product_id}",
                offer_id=o.offer_id,
                offer_name=o.offer.name if o.offer else None,
                customer_name=o.customer_name,
                customer_email=o.customer_email,
                customer_phone=o.customer_phone,
                customer_phone_ddi=o.customer_phone_ddi or "55",
                customer_cpf=o.customer_cpf,
                amount_brl=o.amount_brl,
                amount_usd=o.amount_usd,
                payment_method=o.payment_method,
                status=o.status,
                gateway_name=o.gateway_name,
                coupon_code=o.coupon_code,
                discount_amount_brl=o.discount_amount_brl or 0.0,
                affiliate_code=o.affiliate_code,
                affiliate_commission_brl=o.affiliate_commission_brl or 0.0,
                utm_source=o.utm_source,
                utm_medium=o.utm_medium,
                utm_campaign=o.utm_campaign,
                utm_content=o.utm_content,
                utm_term=o.utm_term,
                src=o.src,
                sck=o.sck,
                created_at=o.created_at,
                paid_at=o.paid_at,
                refund_reason=o.refund_reason,
                refunded_at=o.refunded_at
            )
        )

    return items, total


def get_order_by_id(db: Session, order_id: int) -> Order:
    """Busca pedido pelo ID ou levanta 404."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido #{order_id} não encontrado."
        )
    return order


def refund_order(
    db: Session,
    order_id: int,
    reason: str,
    notes: Optional[str] = None
) -> Order:
    """
    Executa o estorno/reembolso de um pedido com status 'paid',
    registra o motivo do reembolso, atualiza data/hora e dispara webhook oficial 'order.refunded'.
    """
    order = get_order_by_id(db, order_id)
    if order.status == "refunded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já foi reembolsado anteriormente."
        )
    if order.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Apenas pedidos com status 'Pago' podem ser reembolsados. Status atual: {order.status}."
        )

    clean_reason = reason.strip() if reason else "Solicitação de reembolso"
    if notes and notes.strip():
        clean_reason = f"{clean_reason} - {notes.strip()}"

    # Se gateway for Pagar.me
    if order.gateway_name == "pagarme" and order.external_transaction_id:
        try:
            from app.services import pagarme_service
            from app.models.gateway import GatewaySetting
            gateway_setting = db.query(GatewaySetting).filter(GatewaySetting.gateway_name == "pagarme").first()
            pagarme_service.refund_charge(
                charge_id=order.external_transaction_id,
                amount_cents=int(round(order.amount_brl * 100)),
                gateway_setting=gateway_setting
            )
        except Exception as exc:
            logger.error(f"Falha ao acionar gateway Pagar.me no estorno de {order.order_code}: {exc}")

    now = datetime.now(timezone.utc)
    order.status = "refunded"
    order.refund_reason = clean_reason
    order.refunded_at = now
    order.updated_at = now

    db.commit()
    db.refresh(order)

    # Dispara Webhooks de Reembolso cadastrados no produto
    try:
        from app.services import webhook_dispatcher_service
        webhook_dispatcher_service.dispatch_order_webhooks(order, "order.refunded", db)
        db.commit()
    except Exception as exc:
        logger.error(f"Erro ao disparar webhooks de reembolso para pedido {order.order_code}: {exc}")

    logger.info(f"Pedido {order.order_code} reembolsado com sucesso. Motivo: {clean_reason}")
    return order



def _aggregate_utm_column(db: Session, column_attr, start_date=None, end_date=None, product_id=None) -> List[UtmAnalyticsItemResponse]:
    query = db.query(
        func.coalesce(column_attr, "(direto / orgânico)").label("tag_name"),
        func.count(Order.id).label("total_orders"),
        func.count(case((Order.status == "paid", Order.id))).label("paid_orders"),
        func.coalesce(func.sum(case((Order.status == "paid", Order.amount_brl))), 0.0).label("revenue_brl")
    )
    query = _apply_date_and_product_filters(query, start_date, end_date, product_id)
    results = query.group_by("tag_name").order_by(func.coalesce(func.sum(case((Order.status == "paid", Order.amount_brl))), 0.0).desc()).all()

    items = []
    for row in results:
        t_ord = int(row.total_orders or 0)
        p_ord = int(row.paid_orders or 0)
        rev = float(row.revenue_brl or 0.0)
        conv = round((p_ord / t_ord) * 100, 2) if t_ord > 0 else 0.0
        items.append(
            UtmAnalyticsItemResponse(
                name=str(row.tag_name),
                total_orders=t_ord,
                paid_orders=p_ord,
                revenue_brl=round(rev, 2),
                conversion_rate=conv
            )
        )
    return items


def get_utm_bi_analytics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    product_id: Optional[int] = None
) -> UtmAnalyticsResponse:
    """Retorna análise de BI agrupada por dimensões de tráfego UTM e SRC."""
    by_source = _aggregate_utm_column(db, Order.utm_source, start_date, end_date, product_id)
    by_campaign = _aggregate_utm_column(db, Order.utm_campaign, start_date, end_date, product_id)
    by_medium = _aggregate_utm_column(db, Order.utm_medium, start_date, end_date, product_id)
    by_src = _aggregate_utm_column(db, Order.src, start_date, end_date, product_id)

    return UtmAnalyticsResponse(
        by_source=by_source,
        by_campaign=by_campaign,
        by_medium=by_medium,
        by_src=by_src
    )


def export_orders_csv(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status_filter: Optional[str] = None,
    payment_method: Optional[str] = None,
    product_id: Optional[int] = None,
    search: Optional[str] = None
) -> str:
    """Gera arquivo CSV com BOM UTF-8 contendo os pedidos filtrados para conciliação contábil."""
    orders, _ = list_orders_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
        payment_method=payment_method,
        product_id=product_id,
        search=search,
        limit=10000,
        offset=0
    )

    output = io.StringIO()
    # Escreve UTF-8 BOM para compatibilidade com Microsoft Excel
    output.write("\ufeff")

    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Código",
        "Data/Hora",
        "Cliente",
        "E-mail",
        "Telefone",
        "Produto",
        "Oferta",
        "Método",
        "Status",
        "Valor (R$)",
        "Cupom",
        "Desconto (R$)",
        "Afiliado",
        "Comissão (R$)",
        "UTM Source",
        "UTM Medium",
        "UTM Campaign",
        "UTM Content",
        "UTM Term",
        "SRC"
    ])

    for o in orders:
        writer.writerow([
            o.order_code,
            o.created_at.strftime("%d/%m/%Y %H:%M:%S") if o.created_at else "",
            o.customer_name,
            o.customer_email,
            f"+{o.customer_phone_ddi} {o.customer_phone}",
            o.product_name or "",
            o.offer_name or "Padrão",
            o.payment_method,
            o.status,
            f"{o.amount_brl:.2f}".replace(".", ","),
            o.coupon_code or "",
            f"{o.discount_amount_brl:.2f}".replace(".", ",") if o.discount_amount_brl else "0,00",
            o.affiliate_code or "",
            f"{o.affiliate_commission_brl:.2f}".replace(".", ",") if o.affiliate_commission_brl else "0,00",
            o.utm_source or "",
            o.utm_medium or "",
            o.utm_campaign or "",
            o.utm_content or "",
            o.utm_term or "",
            o.src or ""
        ])

    return output.getvalue()


def delete_order(db: Session, order_id: int) -> bool:
    """Exclui permanentemente um pedido e limpa em cascata registros vinculados."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido com ID {order_id} não encontrado."
        )

    order_code = order.order_code

    # Desvincula referências para evitar restrições de chave estrangeira
    db.query(Order).filter(Order.parent_order_id == order_id).update({Order.parent_order_id: None})

    try:
        from app.models.custom_proposal import CustomProposal
        db.query(CustomProposal).filter(CustomProposal.order_id == order_id).update({CustomProposal.order_id: None})
    except Exception:
        pass

    try:
        from app.models.subscription import Subscription
        db.query(Subscription).filter(Subscription.initial_order_id == order_id).update({Subscription.initial_order_id: None})
    except Exception:
        pass

    try:
        from app.models.webhook import WebhookDispatchLog
        db.query(WebhookDispatchLog).filter(WebhookDispatchLog.order_id == order_id).update({WebhookDispatchLog.order_id: None})
    except Exception:
        pass

    db.delete(order)
    db.commit()
    logger.info(f"Pedido #{order_code} (ID: {order_id}) excluído com sucesso do banco de dados.")
    return True


def bulk_delete_orders(db: Session, order_ids: List[int]) -> int:
    """Exclui múltiplos pedidos em lote permanentemente."""
    if not order_ids:
        return 0

    orders = db.query(Order).filter(Order.id.in_(order_ids)).all()
    if not orders:
        return 0

    found_ids = [o.id for o in orders]

    db.query(Order).filter(Order.parent_order_id.in_(found_ids)).update(
        {Order.parent_order_id: None}, synchronize_session=False
    )

    try:
        from app.models.custom_proposal import CustomProposal
        db.query(CustomProposal).filter(CustomProposal.order_id.in_(found_ids)).update(
            {CustomProposal.order_id: None}, synchronize_session=False
        )
    except Exception:
        pass

    try:
        from app.models.subscription import Subscription
        db.query(Subscription).filter(Subscription.initial_order_id.in_(found_ids)).update(
            {Subscription.initial_order_id: None}, synchronize_session=False
        )
    except Exception:
        pass

    try:
        from app.models.webhook import WebhookDispatchLog
        db.query(WebhookDispatchLog).filter(WebhookDispatchLog.order_id.in_(found_ids)).update(
            {WebhookDispatchLog.order_id: None}, synchronize_session=False
        )
    except Exception:
        pass

    deleted_count = 0
    for order in orders:
        db.delete(order)
        deleted_count += 1

    db.commit()
    logger.info(f"{deleted_count} pedidos excluídos em lote com sucesso.")
    return deleted_count
