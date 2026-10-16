from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime


class SubscriptionInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_id: int
    order_id: Optional[int] = None
    invoice_code: str
    cycle_number: int
    amount_brl: float
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    gateway_charge_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_code: str
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_phone_ddi: Optional[str] = "55"
    customer_document: Optional[str] = None
    product_id: int
    product_name: Optional[str] = None
    offer_id: Optional[int] = None
    offer_name: Optional[str] = None
    billing_cycle: str # monthly, quarterly, semiannual, annual
    amount_brl: float
    status: str # active, canceled, past_due, paused
    gateway: str
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    current_cycle: int
    start_date: datetime
    next_billing_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    invoices: List[SubscriptionInvoiceResponse] = []


class SubscriptionStatsResponse(BaseModel):
    mrr_brl: float # Monthly Recurring Revenue estimado
    active_subscriptions: int
    past_due_subscriptions: int
    canceled_subscriptions: int
    total_subscriptions: int
    total_invoices_paid_brl: float
    total_invoices_count: int


class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = Field("Cancelamento solicitado pelo cliente", description="Motivo do cancelamento")
