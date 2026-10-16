"""
Endpoints administrativos para Gestão de Assinaturas, Cobrança Recorrente e Métricas de MRR.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionResponse,
    SubscriptionInvoiceResponse,
    SubscriptionStatsResponse,
    CancelSubscriptionRequest
)
from app.services import subscription_service

router = APIRouter()


@router.get("/stats", response_model=SubscriptionStatsResponse)
def get_subscription_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna métricas executivas de MRR, contadores de assinantes e faturas pagas."""
    return subscription_service.get_subscription_stats(db)


@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    status: Optional[str] = Query(None, description="Filtro por status: active, canceled, past_due, paused"),
    search: Optional[str] = Query(None, description="Busca por nome, e-mail ou código"),
    product_id: Optional[int] = Query(None, description="Filtro por ID do produto"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista assinaturas com paginação e filtros."""
    items, _ = subscription_service.list_subscriptions(
        db=db,
        status_filter=status,
        search=search,
        product_id=product_id,
        limit=limit,
        offset=offset
    )
    return items


@router.get("/invoices/all", response_model=List[SubscriptionInvoiceResponse])
def list_all_invoices(
    status: Optional[str] = Query(None, description="Filtro por status de fatura: paid, pending, failed, canceled"),
    subscription_id: Optional[int] = Query(None, description="Filtro por ID da assinatura"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista faturas recorrentes geradas."""
    items, _ = subscription_service.list_invoices(
        db=db,
        subscription_id=subscription_id,
        status_filter=status,
        limit=limit,
        offset=offset
    )
    return items


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna detalhes de uma assinatura específica com suas faturas."""
    return subscription_service.get_subscription_by_id(db, subscription_id)


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: int,
    payload: Optional[CancelSubscriptionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancela uma assinatura recorrente."""
    reason = payload.reason if payload else "Cancelamento solicitado pelo gestor"
    return subscription_service.cancel_subscription(db, subscription_id, reason)


@router.post("/{subscription_id}/pause", response_model=SubscriptionResponse)
def pause_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pausa uma assinatura ativa."""
    return subscription_service.pause_subscription(db, subscription_id)


@router.post("/{subscription_id}/resume", response_model=SubscriptionResponse)
def resume_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reativa uma assinatura que estava pausada."""
    return subscription_service.resume_subscription(db, subscription_id)
