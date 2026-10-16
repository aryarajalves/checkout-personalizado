"""
Endpoints administrativos para Painel de Vendas, Relatório de Pedidos, Exportação CSV e BI de UTMs.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.schemas.sales_report import (
    SalesMetricsResponse,
    OrderReportItemResponse,
    UtmAnalyticsResponse
)
from app.services import sales_report_service

router = APIRouter()


@router.get("/metrics", response_model=SalesMetricsResponse)
def get_sales_metrics(
    start_date: Optional[datetime] = Query(None, description="Data inicial do filtro"),
    end_date: Optional[datetime] = Query(None, description="Data final do filtro"),
    product_id: Optional[int] = Query(None, description="Filtrar por produto específico"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna métricas executivas consolidadas de vendas, faturamento e métodos de pagamento."""
    return sales_report_service.get_sales_metrics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        product_id=product_id
    )


@router.get("/orders", response_model=List[OrderReportItemResponse])
def list_orders_report(
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    status: Optional[str] = Query(None, description="Filtro por status: paid, pending, failed, refunded, canceled"),
    payment_method: Optional[str] = Query(None, description="Filtro por método: pix, credit_card, crypto"),
    product_id: Optional[int] = Query(None, description="Filtro por ID do produto"),
    utm_source: Optional[str] = Query(None, description="Filtro por UTM Source"),
    utm_campaign: Optional[str] = Query(None, description="Filtro por UTM Campaign"),
    search: Optional[str] = Query(None, description="Busca por código, cliente ou e-mail"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista pedidos filtrados com paginação e busca."""
    items, _ = sales_report_service.list_orders_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
        payment_method=payment_method,
        product_id=product_id,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        search=search,
        limit=limit,
        offset=offset
    )
    return items


@router.get("/orders/{order_id}")
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna dados completos de um pedido, incluindo splits e dados de pagamento."""
    order = sales_report_service.get_order_by_id(db, order_id)
    splits = [
        {
            "recipient_id": s.recipient_id,
            "recipient_name": s.recipient_name,
            "percentage": s.percentage,
            "amount_brl": s.amount_brl
        }
        for s in (order.splits or [])
    ]
    return {
        "id": order.id,
        "order_code": order.order_code,
        "product_id": order.product_id,
        "product_name": order.product.name if order.product else None,
        "offer_name": order.offer.name if order.offer else None,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_phone_ddi": order.customer_phone_ddi or "55",
        "customer_cpf": order.customer_cpf,
        "amount_brl": order.amount_brl,
        "amount_usd": order.amount_usd,
        "payment_method": order.payment_method,
        "status": order.status,
        "gateway_name": order.gateway_name,
        "external_transaction_id": order.external_transaction_id,
        "qr_code_text": order.qr_code_text,
        "crypto_wallet_address": order.crypto_wallet_address,
        "crypto_currency": order.crypto_currency,
        "crypto_amount": order.crypto_amount,
        "coupon_code": order.coupon_code,
        "discount_amount_brl": order.discount_amount_brl or 0.0,
        "affiliate_code": order.affiliate_code,
        "affiliate_commission_brl": order.affiliate_commission_brl or 0.0,
        "utm_source": order.utm_source,
        "utm_medium": order.utm_medium,
        "utm_campaign": order.utm_campaign,
        "utm_content": order.utm_content,
        "utm_term": order.utm_term,
        "src": order.src,
        "sck": order.sck,
        "created_at": order.created_at,
        "paid_at": order.paid_at,
        "splits": splits
    }


@router.get("/utm-bi", response_model=UtmAnalyticsResponse)
def get_utm_bi_analytics(
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    product_id: Optional[int] = Query(None, description="Filtrar por produto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna análise de BI agrupada por canais de tráfego UTM e SRC."""
    return sales_report_service.get_utm_bi_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        product_id=product_id
    )


@router.get("/export-csv")
def export_orders_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exporta arquivo CSV dos pedidos filtrados com codificação UTF-8 BOM."""
    csv_content = sales_report_service.export_orders_csv(
        db=db,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
        payment_method=payment_method,
        product_id=product_id,
        search=search
    )
    filename = f"pedidos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
