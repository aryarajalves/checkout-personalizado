"""
Endpoint público para recepção e processamento de Webhooks / IPN dos gateways de pagamento (Fase 3.4).
Suporta callbacks do Pagar.me (Pix/Cartão) e NOWPayments (Criptomoedas) com validação de assinatura e idempotência.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.core.logger import logger
from app.models.order import Order
from app.models.gateway import GatewaySetting
from app.services.nowpayments_service import NowPaymentsService
from app.services.webhook_dispatcher_service import dispatch_order_webhooks

router = APIRouter()

@router.post("/nowpayments", status_code=status.HTTP_200_OK)
async def nowpayments_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_nowpayments_sig: Optional[str] = Header(None, alias="x-nowpayments-sig"),
):
    """
    Recebe notificação IPN (Instant Payment Notification) da NOWPayments.
    Valida a assinatura criptográfica HMAC-SHA512 e atualiza o status do pedido de forma idempotente.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON inválido.")

    logger.info(f"Recebido Webhook NOWPayments: payment_id={body.get('payment_id')}, status={body.get('payment_status')}")

    # Obter IPN Secret configurado
    gateway = (
        db.query(GatewaySetting)
        .filter(GatewaySetting.gateway_name == "nowpayments", GatewaySetting.is_active == True)
        .first()
    )
    ipn_secret = gateway.webhook_secret if gateway else None

    # Validação de assinatura
    if not NowPaymentsService.verify_ipn_signature(body, x_nowpayments_sig, ipn_secret):
        logger.error("Rejeitando webhook NOWPayments: Assinatura HMAC inválida.")
        raise HTTPException(status_code=401, detail="Assinatura de Webhook inválida.")

    order_code = body.get("order_id")
    payment_id = str(body.get("payment_id", ""))
    payment_status = str(body.get("payment_status", "")).lower()

    # Busca pedido pelo código ou pelo transaction ID
    order = None
    if order_code:
        order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order and payment_id:
        order = db.query(Order).filter(Order.external_transaction_id == payment_id).first()

    if not order:
        logger.warning(f"NOWPayments Webhook: Pedido não encontrado para order_id={order_code}, payment_id={payment_id}")
        return {"status": "ignored", "detail": "Pedido não encontrado"}

    # Idempotência: Se o pedido já estiver marcado como pago, não reprocessa
    if order.status == "paid":
        logger.info(f"NOWPayments Webhook: Pedido {order.order_code} já está pago. Notificação ignorada por idempotência.")
        return {"status": "already_paid", "order_code": order.order_code}

    # Transições de status
    if payment_status in ("confirmed", "finished"):
        order.status = "paid"
        order.paid_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"🎉 Pedido {order.order_code} confirmado e PAGO via NOWPayments Webhook!")
        if order.ab_test_id and order.ab_test_variant:
            try:
                from app.services.ab_test_service import record_ab_test_conversion
                record_ab_test_conversion(db, order.ab_test_id, order.ab_test_variant, order.amount_brl)
            except Exception as ab_err:
                logger.error(f"Erro ao registrar conversão de Teste A/B no webhook NOWPayments: {ab_err}")
        try:
            dispatch_order_webhooks(order, "order.approved", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.approved (NOWPayments): {wh_err}")
    elif payment_status in ("failed", "expired"):
        order.status = "failed"
        db.commit()
        logger.warning(f"Pedido {order.order_code} marcado como {order.status} via NOWPayments Webhook.")
        try:
            dispatch_order_webhooks(order, "order.expired", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.expired (NOWPayments): {wh_err}")

    return {"status": "processed", "order_status": order.status, "order_code": order.order_code}


@router.post("/pagarme", status_code=status.HTTP_200_OK)
async def pagarme_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Recebe Webhooks de eventos do Pagar.me V5 (order.paid, charge.paid, refund, chargeback, etc).
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON inválido.")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    logger.info(f"Recebido Webhook Pagar.me: evento={event_type}")

    # Identifica o pedido pelo código ou id externo
    order_code = data.get("code")
    charge_id = data.get("id")

    order = None
    if order_code:
        order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order and charge_id:
        order = db.query(Order).filter(Order.external_transaction_id == charge_id).first()

    if not order:
        logger.warning(f"Pagar.me Webhook: Pedido não encontrado para code={order_code}, id={charge_id}")
        return {"status": "ignored", "detail": "Pedido não encontrado"}

    # Tratamento de Reembolso e Chargeback (processa mesmo que o pedido já esteja como pago)
    if event_type in ("charge.refunded", "order.refunded"):
        order.status = "refunded"
        db.commit()
        logger.info(f"🔄 Pedido {order.order_code} REEMBOLSADO via Pagar.me Webhook!")
        try:
            dispatch_order_webhooks(order, "order.refunded", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.refunded: {wh_err}")
        return {"status": "processed", "order_status": order.status, "order_code": order.order_code}

    if event_type in ("charge.chargedback", "charge.chargeback", "charge.under_contestation"):
        order.status = "chargeback"
        db.commit()
        logger.warning(f"⚠️ Pedido {order.order_code} sofreu CHARGEBACK via Pagar.me Webhook!")
        try:
            from app.services import security_service
            security_service.handle_auto_blacklist_chargeback(db, order)
        except Exception as bl_err:
            logger.error(f"Erro ao aplicar auto-blacklist no chargeback: {bl_err}")
        try:
            dispatch_order_webhooks(order, "order.chargeback", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.chargeback: {wh_err}")
        return {"status": "processed", "order_status": order.status, "order_code": order.order_code}

    # Idempotência para confirmação de pagamento
    if order.status == "paid":
        return {"status": "already_paid", "order_code": order.order_code}

    if event_type in ("order.paid", "charge.paid", "invoice.paid") or data.get("status") == "paid":
        order.status = "paid"
        order.paid_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"🎉 Pedido {order.order_code} confirmado e PAGO via Pagar.me Webhook!")
        if order.ab_test_id and order.ab_test_variant:
            try:
                from app.services.ab_test_service import record_ab_test_conversion
                record_ab_test_conversion(db, order.ab_test_id, order.ab_test_variant, order.amount_brl)
            except Exception as ab_err:
                logger.error(f"Erro ao registrar conversão de Teste A/B no webhook Pagar.me: {ab_err}")
        try:
            dispatch_order_webhooks(order, "order.approved", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.approved: {wh_err}")
    elif event_type in ("charge.failed", "order.canceled", "charge.declined"):
        order.status = "failed"
        db.commit()
        try:
            dispatch_order_webhooks(order, "order.card_declined", db)
        except Exception as wh_err:
            logger.error(f"Erro ao disparar webhook order.card_declined: {wh_err}")

    return {"status": "processed", "order_status": order.status, "order_code": order.order_code}


@router.post("/asaas", status_code=status.HTTP_200_OK)
async def asaas_webhook(
    request: Request,
    db: Session = Depends(get_db),
    asaas_access_token: Optional[str] = Header(None, alias="asaas-access-token"),
):
    """
    Recebe notificações de cobrança e parcelas do gateway Asaas (PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc).
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON inválido.")

    from app.services.asaas_service import handle_asaas_webhook_event
    return handle_asaas_webhook_event(db, body, asaas_access_token)


@router.post("/{gateway}", status_code=status.HTTP_200_OK)
async def generic_webhook_dispatcher(
    gateway: str,
    request: Request,
    db: Session = Depends(get_db),
    x_nowpayments_sig: Optional[str] = Header(None, alias="x-nowpayments-sig"),
):
    """
    Despachante genérico de webhooks para URLs no padrão /api/v1/webhooks/{gateway}.
    """
    gateway_clean = gateway.lower()
    if gateway_clean == "nowpayments":
        return await nowpayments_webhook(request, db, x_nowpayments_sig)
    elif gateway_clean in ("pagarme", "stone"):
        return await pagarme_webhook(request, db)
    elif gateway_clean == "asaas":
        token = request.headers.get("asaas-access-token")
        return await asaas_webhook(request, db, token)
    else:
        raise HTTPException(status_code=404, detail=f"Gateway {gateway} não suportado.")
