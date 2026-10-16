from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class OrderReportItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_code: str
    product_id: int
    product_name: Optional[str] = None
    offer_id: Optional[int] = None
    offer_name: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_phone_ddi: Optional[str] = "55"
    customer_cpf: Optional[str] = None
    amount_brl: float
    amount_usd: Optional[float] = None
    payment_method: str
    status: str
    gateway_name: str
    coupon_code: Optional[str] = None
    discount_amount_brl: Optional[float] = 0.0
    affiliate_code: Optional[str] = None
    affiliate_commission_brl: Optional[float] = 0.0
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    src: Optional[str] = None
    sck: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None


class PaymentMethodMetric(BaseModel):
    method: str
    label: str
    count: int
    paid_count: int
    revenue_brl: float
    percentage: float


class SalesMetricsResponse(BaseModel):
    total_revenue_brl: float
    pending_revenue_brl: float
    total_orders_count: int
    paid_orders_count: int
    pending_orders_count: int
    failed_orders_count: int
    refunded_orders_count: int
    average_ticket_brl: float
    conversion_rate_percent: float
    payment_methods_metrics: List[PaymentMethodMetric] = []


class UtmAnalyticsItemResponse(BaseModel):
    name: str
    total_orders: int
    paid_orders: int
    revenue_brl: float
    conversion_rate: float


class UtmAnalyticsResponse(BaseModel):
    by_source: List[UtmAnalyticsItemResponse] = []
    by_campaign: List[UtmAnalyticsItemResponse] = []
    by_medium: List[UtmAnalyticsItemResponse] = []
    by_src: List[UtmAnalyticsItemResponse] = []
