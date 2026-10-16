"""
Serviço central de Webhooks de Saída (Outbound Webhooks / Fase 3.6).
Dispara eventos de ciclo de vida do pedido para URLs cadastradas por produto,
valida assinaturas HMAC-SHA256 e registra histórico com status HTTP e suporte a retentativas.
"""
import hmac
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
import httpx
from sqlalchemy.orm import Session

from app.core.logger import logger
from app.models.webhook import ProductWebhook, WebhookDispatchLog
from app.models.order import Order, OrderSplit
from app.models.product import Product, ProductOffer

EVENT_LABELS = {
    "order.approved": "Compra Aprovada",
    "order.waiting_payment": "Pix Gerado",
    "order.refunded": "Reembolso",
    "order.chargeback": "Chargeback",
    "order.card_declined": "Cartão Recusado",
    "order.expired": "Pix Expirado",
    "checkout.abandoned": "Abandono de Checkout",
}

def generate_hmac_signature(payload_json: str, secret_key: str) -> str:
    """Gera assinatura HMAC-SHA256 para verificação de autenticidade no receptor."""
    return hmac.new(
        secret_key.encode("utf-8"),
        payload_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

STATUS_PORTUGUESE = {
    "paid": "Compra Aprovada",
    "waiting_payment": "Pix Gerado",
    "refunded": "Reembolso",
    "chargeback": "Chargeback",
    "declined": "Cartão Recusado",
    "expired": "Pix Expirado",
    "failed": "Cartão Recusado",
    "abandoned": "Abandono de Checkout",
    "recovered": "Carrinho Recuperado",
    "converted": "Compra Concluída",
    "order.approved": "Compra Aprovada",
    "order.waiting_payment": "Pix Gerado",
    "order.refunded": "Reembolso",
    "order.chargeback": "Chargeback",
    "order.card_declined": "Cartão Recusado",
    "order.expired": "Pix Expirado",
    "checkout.abandoned": "Abandono de Checkout",
    "Compra Aprovada": "Compra Aprovada",
    "Pix Gerado": "Pix Gerado",
    "Reembolso": "Reembolso",
    "Chargeback": "Chargeback",
    "Cartão Recusado": "Cartão Recusado",
    "Pix Expirado": "Pix Expirado",
    "Abandono de Checkout": "Abandono de Checkout",
}

def format_customer_phone_fields(phone: Optional[str], ddi: Optional[str] = "55") -> Dict[str, Optional[str]]:
    """
    Higieniza e formata os dados de telefone para automações e webhooks.
    Retorna:
      - phone: formato internacional limpo com + e DDI (ex: '+5511999999999')
      - phone_formatted: formato legível com DDI (ex: '+55 (11) 99999-9999')
      - phone_ddi: apenas os dígitos do DDI (ex: '55')
    """
    clean_ddi = re.sub(r"\D", "", str(ddi or "55")) or "55"
    if not phone:
        return {
            "phone": None,
            "phone_formatted": None,
            "phone_ddi": clean_ddi,
        }

    clean_digits = re.sub(r"\D", "", str(phone))

    # Se os dígitos já iniciam com o DDI informado (ex: 5511999999999 com DDI 55), evita duplicação
    if len(clean_digits) > 11 and clean_digits.startswith(clean_ddi):
        digits_local = clean_digits[len(clean_ddi):]
    else:
        digits_local = clean_digits

    phone_full = f"+{clean_ddi}{digits_local}" if digits_local else None

    # Formatação legível
    if clean_ddi == "55" and len(digits_local) == 11:
        phone_formatted = f"+55 ({digits_local[:2]}) {digits_local[2:7]}-{digits_local[7:]}"
    elif clean_ddi == "55" and len(digits_local) == 10:
        phone_formatted = f"+55 ({digits_local[:2]}) {digits_local[2:6]}-{digits_local[6:]}"
    elif str(phone).strip().startswith("+"):
        phone_formatted = str(phone).strip()
    elif digits_local:
        phone_formatted = f"+{clean_ddi} {str(phone).strip()}"
    else:
        phone_formatted = str(phone).strip()

    return {
        "phone": phone_full,
        "phone_formatted": phone_formatted,
        "phone_ddi": clean_ddi,
    }

def build_order_webhook_payload(order: Order, event: str, db: Session) -> Dict[str, Any]:
    """Monta o payload completo (Opção C) com dados do pedido, cliente, produto e split."""
    product = db.query(Product).filter(Product.id == order.product_id).first()
    offer = db.query(ProductOffer).filter(ProductOffer.id == order.offer_id).first() if order.offer_id else None
    splits = db.query(OrderSplit).filter(OrderSplit.order_id == order.id).all()
    status_pt = STATUS_PORTUGUESE.get(order.status, EVENT_LABELS.get(event, order.status))
    ddi_val = getattr(order, "customer_phone_ddi", "55") or "55"
    phone_data = format_customer_phone_fields(order.customer_phone, ddi_val)

    return {
        "event": status_pt,
        "event_raw": event,
        "event_label": EVENT_LABELS.get(event, status_pt),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "order": {
            "order_code": order.order_code,
            "status": status_pt,
            "status_raw": order.status,
            "payment_method": order.payment_method,
            "amount_brl": order.amount_brl,
            "amount_usd": order.amount_usd,
            "gateway_name": order.gateway_name,
            "external_transaction_id": order.external_transaction_id,
            "crypto_currency": order.crypto_currency,
            "crypto_amount": order.crypto_amount,
            "crypto_wallet_address": order.crypto_wallet_address,
            "crypto_network": order.crypto_network,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        },
        "customer": {
            "name": order.customer_name,
            "email": order.customer_email,
            "phone": phone_data["phone"],
            "phone_formatted": phone_data["phone_formatted"],
            "phone_ddi": phone_data["phone_ddi"],
            "cpf": order.customer_cpf,
        },
        "product": {
            "id": order.product_id,
            "name": product.name if product else None,
            "slug": product.slug if product else None,
            "offer_name": offer.name if offer else None,
            "offer_slug": offer.slug if offer else None,
        },
        "split": [
            {
                "recipient_id": s.recipient_id,
                "recipient_name": s.recipient_name,
                "percentage": s.percentage,
                "amount_brl": s.amount_brl,
            }
            for s in splits
        ],
    }

def send_http_webhook(
    url: str,
    payload_dict: Dict[str, Any],
    secret_key: Optional[str] = None,
    timeout_seconds: float = 8.0,
) -> Tuple[Optional[int], Optional[str], bool, Optional[str]]:
    """
    Executa envio HTTP POST com payload JSON.
    Retorna: (status_code, response_body, success, error_message)
    """
    payload_json = json.dumps(payload_dict, ensure_ascii=False)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "CheckoutProprio-Webhook/1.0",
    }
    if secret_key:
        signature = generate_hmac_signature(payload_json, secret_key)
        headers["X-Webhook-Signature"] = f"sha256={signature}"

    target_url = url
    # Como o backend roda em Docker, requisições para localhost da máquina host
    # devem ser direcionadas para host.docker.internal
    if "://localhost" in target_url:
        target_url = target_url.replace("://localhost", "://host.docker.internal")
    elif "://127.0.0.1" in target_url:
        target_url = target_url.replace("://127.0.0.1", "://host.docker.internal")

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            resp = client.post(target_url, content=payload_json.encode("utf-8"), headers=headers)
            status_code = resp.status_code
            body_snippet = resp.text[:500] if resp.text else ""
            success = 200 <= status_code < 300
            error_message = None if success else f"HTTP Status {status_code}"
            return status_code, body_snippet, success, error_message
    except httpx.TimeoutException:
        return None, None, False, f"Timeout de conexão ({timeout_seconds}s)"
    except httpx.ConnectError:
        return None, None, False, "Falha de conexão com a URL de destino"
    except Exception as exc:
        return None, None, False, f"Erro inesperado no envio: {str(exc)}"

def dispatch_order_webhooks(order: Order, event: str, db: Session) -> List[WebhookDispatchLog]:
    """
    Localiza todos os webhooks ativos do produto associado ao pedido que escutam o evento,
    executa o disparo e salva o log na tabela webhook_dispatch_logs.
    """
    webhooks = (
        db.query(ProductWebhook)
        .filter(
            ProductWebhook.product_id == order.product_id,
            ProductWebhook.is_active == True,
        )
        .all()
    )

    if not webhooks:
        logger.info(f"Nenhum webhook ativo cadastrado para o produto {order.product_id}. Disparo ignorado.")
        return []

    payload_dict = build_order_webhook_payload(order, event, db)
    payload_json = json.dumps(payload_dict, ensure_ascii=False)
    created_logs = []

    for wh in webhooks:
        try:
            subscribed_events = json.loads(wh.events) if wh.events else []
        except Exception:
            subscribed_events = []

        status_pt = STATUS_PORTUGUESE.get(order.status, EVENT_LABELS.get(event, order.status))
        is_subscribed = (
            "*" in subscribed_events
            or event in subscribed_events
            or status_pt in subscribed_events
        )
        if not is_subscribed:
            continue

        status_code, body, success, err = send_http_webhook(wh.url, payload_dict, wh.secret_key)

        log_entry = WebhookDispatchLog(
            product_id=order.product_id,
            webhook_id=wh.id,
            order_id=order.id,
            event=event,
            url=wh.url,
            payload=payload_json,
            response_status_code=status_code,
            response_body=body,
            success=success,
            error_message=err,
            dispatched_at=datetime.now(timezone.utc),
        )
        db.add(log_entry)
        created_logs.append(log_entry)

        logger.info(
            f"Webhook disparado: evento={event}, produto={order.product_id}, "
            f"url={wh.url}, status={status_code}, sucesso={success}"
        )

    try:
        db.commit()
    except Exception as exc:
        logger.error(f"Erro ao salvar logs de webhook: {exc}")
        db.rollback()

    return created_logs

def retry_webhook_dispatch(log_id: int, db: Session) -> Optional[WebhookDispatchLog]:
    """Reenvia um webhook a partir de um log existente."""
    log_entry = db.query(WebhookDispatchLog).filter(WebhookDispatchLog.id == log_id).first()
    if not log_entry:
        return None

    secret_key = None
    if log_entry.webhook_id:
        wh = db.query(ProductWebhook).filter(ProductWebhook.id == log_entry.webhook_id).first()
        if wh:
            secret_key = wh.secret_key

    try:
        payload_dict = json.loads(log_entry.payload)
    except Exception:
        payload_dict = {"raw": log_entry.payload}

    status_code, body, success, err = send_http_webhook(log_entry.url, payload_dict, secret_key)

    new_log = WebhookDispatchLog(
        product_id=log_entry.product_id,
        webhook_id=log_entry.webhook_id,
        order_id=log_entry.order_id,
        event=log_entry.event,
        url=log_entry.url,
        payload=log_entry.payload,
        response_status_code=status_code,
        response_body=body,
        success=success,
        error_message=err,
        dispatched_at=datetime.now(timezone.utc),
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


def build_abandoned_cart_webhook_payload(cart: Any, db: Session) -> Dict[str, Any]:
    """Monta o payload de webhook para carrinhos abandonados (checkout.abandoned)."""
    product = db.query(Product).filter(Product.id == cart.product_id).first()
    offer = db.query(ProductOffer).filter(ProductOffer.id == cart.offer_id).first() if cart.offer_id else None
    ddi_val = getattr(cart, "customer_phone_ddi", "55") or "55"
    phone_data = format_customer_phone_fields(cart.customer_phone, ddi_val)
    recovery_slug = offer.slug if offer else (product.slug if product else "")

    return {
        "event": "Abandono de Checkout",
        "event_raw": "checkout.abandoned",
        "event_label": "Abandono de Checkout",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "cart": {
            "id": cart.id,
            "recovery_token": cart.recovery_token,
            "recovery_url": f"/pay/{recovery_slug}?recover={cart.recovery_token}",
            "estimated_amount_brl": cart.estimated_amount_brl,
            "coupon_code": cart.coupon_code,
            "status": "Abandono de Checkout",
            "status_raw": cart.status,
            "created_at": cart.created_at.isoformat() if cart.created_at else None,
        },
        "customer": {
            "name": cart.customer_name,
            "email": cart.customer_email,
            "phone": phone_data["phone"],
            "phone_formatted": phone_data["phone_formatted"],
            "phone_ddi": phone_data["phone_ddi"],
            "cpf": cart.customer_cpf,
        },
        "product": {
            "id": cart.product_id,
            "name": product.name if product else None,
            "slug": product.slug if product else None,
            "offer_name": offer.name if offer else None,
            "offer_slug": offer.slug if offer else None,
        },
    }


def dispatch_abandoned_cart_webhook(cart: Any, db: Session) -> List[WebhookDispatchLog]:
    """
    Localiza webhooks ativos do produto que escutam checkout.abandoned e envia os disparos.
    """
    webhooks = (
        db.query(ProductWebhook)
        .filter(
            ProductWebhook.product_id == cart.product_id,
            ProductWebhook.is_active == True,
        )
        .all()
    )

    if not webhooks:
        return []

    payload_dict = build_abandoned_cart_webhook_payload(cart, db)
    payload_json = json.dumps(payload_dict, ensure_ascii=False)
    created_logs = []

    for wh in webhooks:
        try:
            subscribed_events = json.loads(wh.events) if wh.events else []
        except Exception:
            subscribed_events = []

        is_subscribed = (
            "*" in subscribed_events
            or "checkout.abandoned" in subscribed_events
            or "Abandono de Checkout" in subscribed_events
        )
        if not is_subscribed:
            continue

        status_code, body, success, err = send_http_webhook(wh.url, payload_dict, wh.secret_key)

        log_entry = WebhookDispatchLog(
            product_id=cart.product_id,
            webhook_id=wh.id,
            order_id=None,
            event="checkout.abandoned",
            url=wh.url,
            payload=payload_json,
            response_status_code=status_code,
            response_body=body,
            success=success,
            error_message=err,
            dispatched_at=datetime.now(timezone.utc),
        )
        db.add(log_entry)
        created_logs.append(log_entry)

        logger.info(
            f"Webhook de abandono disparado: produto={cart.product_id}, "
            f"url={wh.url}, status={status_code}, sucesso={success}"
        )

    try:
        db.commit()
    except Exception as exc:
        logger.error(f"Erro ao salvar logs de webhook de abandono: {exc}")
        db.rollback()

    return created_logs

