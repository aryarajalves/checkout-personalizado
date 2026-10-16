"""
Endpoints para gerenciamento de Webhooks de Saída e Histórico de Disparos por Produto (Fase 3.6).
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.product import Product
from app.models.webhook import ProductWebhook, WebhookDispatchLog
from app.schemas.webhook import (
    ProductWebhookCreate,
    ProductWebhookUpdate,
    ProductWebhookResponse,
    WebhookDispatchLogResponse,
    TestWebhookRequest,
    SUPPORTED_WEBHOOK_EVENTS,
)
from app.services import webhook_dispatcher_service

router = APIRouter()

def _format_webhook_response(webhook: ProductWebhook) -> ProductWebhookResponse:
    try:
        events_list = json.loads(webhook.events) if webhook.events else []
    except Exception:
        events_list = []

    return ProductWebhookResponse(
        id=webhook.id,
        product_id=webhook.product_id,
        name=webhook.name,
        url=webhook.url,
        events=events_list,
        secret_key=webhook.secret_key,
        is_active=webhook.is_active,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at,
    )

@router.get("/{product_id}/webhooks", response_model=List[ProductWebhookResponse])
def list_product_webhooks(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os webhooks cadastrados para um produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    webhooks = (
        db.query(ProductWebhook)
        .filter(ProductWebhook.product_id == product_id)
        .order_by(ProductWebhook.id.asc())
        .all()
    )
    return [_format_webhook_response(w) for w in webhooks]

@router.post("/{product_id}/webhooks", response_model=ProductWebhookResponse, status_code=status.HTTP_201_CREATED)
def create_product_webhook(
    product_id: int,
    data: ProductWebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova URL de webhook para o produto com eventos selecionados."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    # Validar eventos
    for evt in data.events:
        if evt not in SUPPORTED_WEBHOOK_EVENTS and evt != "*":
            raise HTTPException(
                status_code=400,
                detail=f"Evento '{evt}' não suportado. Eventos válidos: {SUPPORTED_WEBHOOK_EVENTS}",
            )

    webhook = ProductWebhook(
        product_id=product_id,
        name=data.name.strip() if data.name else None,
        url=data.url.strip(),
        events=json.dumps(data.events),
        secret_key=data.secret_key.strip() if data.secret_key else None,
        is_active=data.is_active,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)

    return _format_webhook_response(webhook)

@router.put("/{product_id}/webhooks/{webhook_id}", response_model=ProductWebhookResponse)
def update_product_webhook(
    product_id: int,
    webhook_id: int,
    data: ProductWebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza configurações de uma URL de webhook existente."""
    webhook = (
        db.query(ProductWebhook)
        .filter(ProductWebhook.id == webhook_id, ProductWebhook.product_id == product_id)
        .first()
    )
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook não encontrado para este produto.")

    if data.name is not None:
        webhook.name = data.name.strip() if data.name else None
    if data.url is not None:
        webhook.url = data.url.strip()
    if data.events is not None:
        for evt in data.events:
            if evt not in SUPPORTED_WEBHOOK_EVENTS and evt != "*":
                raise HTTPException(
                    status_code=400,
                    detail=f"Evento '{evt}' não suportado. Eventos válidos: {SUPPORTED_WEBHOOK_EVENTS}",
                )
        webhook.events = json.dumps(data.events)
    if data.secret_key is not None:
        webhook.secret_key = data.secret_key.strip() if data.secret_key else None
    if data.is_active is not None:
        webhook.is_active = data.is_active

    db.commit()
    db.refresh(webhook)
    return _format_webhook_response(webhook)

@router.delete("/{product_id}/webhooks/{webhook_id}")
def delete_product_webhook(
    product_id: int,
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui uma URL de webhook cadastrada."""
    webhook = (
        db.query(ProductWebhook)
        .filter(ProductWebhook.id == webhook_id, ProductWebhook.product_id == product_id)
        .first()
    )
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook não encontrado para este produto.")

    db.delete(webhook)
    db.commit()
    return {"detail": "Webhook removido com sucesso."}

@router.post("/{product_id}/webhooks/test-dispatch")
def test_product_webhook(
    product_id: int,
    data: TestWebhookRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envia um disparo de teste imediato com payload realista para validar a URL receptora."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    event = data.event or "order.approved"
    event_status_map = {
        "order.approved": ("Compra Aprovada", "pix", "paid"),
        "order.waiting_payment": ("Pix Gerado", "pix", "waiting_payment"),
        "order.refunded": ("Reembolso", "pix", "refunded"),
        "order.chargeback": ("Chargeback", "credit_card", "chargeback"),
        "order.card_declined": ("Cartão Recusado", "credit_card", "declined"),
        "order.expired": ("Pix Expirado", "pix", "expired"),
        "Compra Aprovada": ("Compra Aprovada", "pix", "paid"),
        "Pix Gerado": ("Pix Gerado", "pix", "waiting_payment"),
        "Reembolso": ("Reembolso", "pix", "refunded"),
        "Chargeback": ("Chargeback", "credit_card", "chargeback"),
        "Cartão Recusado": ("Cartão Recusado", "credit_card", "declined"),
        "Pix Expirado": ("Pix Expirado", "pix", "expired"),
    }
    ord_status, ord_method, ord_raw = event_status_map.get(event, ("Compra Aprovada", "pix", "paid"))

    split_data = []
    if product.split_rules:
        for r in product.split_rules:
            perc = r.percentage or 0.0
            split_data.append({
                "recipient_id": r.recipient_id,
                "recipient_name": r.recipient.name if r.recipient else f"Sócio {r.recipient_id}",
                "percentage": perc,
                "amount_brl": round(((product.price_brl or 67.0) * perc) / 100, 2),
            })
    else:
        split_data = [
            {
                "recipient_id": 1,
                "recipient_name": "Conta Principal",
                "percentage": 100.0,
                "amount_brl": product.price_brl or 67.0,
            }
        ]

    from datetime import datetime, timezone
    sample_payload = {
        "event": ord_status,
        "event_raw": event,
        "event_label": ord_status,
        "is_test": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "order": {
            "order_code": "TEST-ORD-20261016",
            "status": ord_status,
            "status_raw": ord_raw,
            "payment_method": ord_method,
            "amount_brl": product.price_brl or 67.00,
            "amount_usd": product.price_usd or 15.00,
            "gateway_name": "pagarme",
            "external_transaction_id": "test_tx_987654321",
            "paid_at": datetime.now(timezone.utc).isoformat() if ord_status == "Compra Aprovada" else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        "customer": {
            "name": "Cliente Teste",
            "email": "teste@exemplo.com",
            "phone": "+5511999999999",
            "phone_formatted": "+55 (11) 99999-9999",
            "phone_ddi": "55",
            "cpf": "12345678901",
        },
        "product": {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "offer_name": "Oferta Principal",
            "offer_slug": product.slug,
        },
        "split": split_data,
    }

    status_code, body, success, err = webhook_dispatcher_service.send_http_webhook(
        data.url, sample_payload, data.secret_key
    )

    # Registrar disparo de teste no log
    log_entry = WebhookDispatchLog(
        product_id=product_id,
        webhook_id=None,
        order_id=None,
        event=f"test:{event}",
        url=data.url,
        payload=json.dumps(sample_payload, ensure_ascii=False),
        response_status_code=status_code,
        response_body=body,
        success=success,
        error_message=err,
    )
    db.add(log_entry)
    db.commit()

    return {
        "success": success,
        "status_code": status_code,
        "response_body": body,
        "error_message": err,
    }

@router.get("/{product_id}/webhooks/logs", response_model=List[WebhookDispatchLogResponse])
def list_webhook_dispatch_logs(
    product_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o histórico recente de disparos de webhooks para o produto."""
    logs = (
        db.query(WebhookDispatchLog)
        .filter(WebhookDispatchLog.product_id == product_id)
        .order_by(WebhookDispatchLog.id.desc())
        .limit(limit)
        .all()
    )
    return logs

@router.post("/{product_id}/webhooks/logs/{log_id}/retry", response_model=WebhookDispatchLogResponse)
def retry_webhook(
    product_id: int,
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reexecuta um disparo de webhook a partir de um log existente."""
    log_entry = (
        db.query(WebhookDispatchLog)
        .filter(WebhookDispatchLog.id == log_id, WebhookDispatchLog.product_id == product_id)
        .first()
    )
    if not log_entry:
        raise HTTPException(status_code=404, detail="Registro de log não encontrado.")

    new_log = webhook_dispatcher_service.retry_webhook_dispatch(log_id, db)
    if not new_log:
        raise HTTPException(status_code=500, detail="Erro ao retentar disparo de webhook.")
    return new_log
