"""
Endpoints administrativos para Recuperação de Vendas (Carrinhos Abandonados e Pix Pendente).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.abandoned_cart import AbandonedCart
from app.schemas.recovery import (
    AbandonedCartResponse,
    AbandonedCartUpdateRequest,
    PendingPixOrderResponse,
    RecoveryStatsResponse,
    BulkDeleteAbandonedCartsRequest,
    BulkDeleteAbandonedCartsResponse,
    CartByTokenResponse,
)
from app.services import recovery_service
from app.services.webhook_dispatcher_service import dispatch_abandoned_cart_webhook

router = APIRouter()


@router.get("/stats", response_model=RecoveryStatsResponse)
def get_recovery_stats_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna métricas consolidadas de recuperação de abandono e Pix gerado."""
    return recovery_service.get_recovery_stats(db)


@router.get("/abandoned-carts", response_model=List[AbandonedCartResponse])
def list_abandoned_carts_endpoint(
    response: Response,
    product_id: Optional[int] = Query(None, description="Filtrar por produto"),
    status: Optional[str] = Query(None, description="Filtrar por status ('abandoned', 'recovered', 'converted', 'all')"),
    search: Optional[str] = Query(None, description="Busca por nome, e-mail ou telefone"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista os carrinhos abandonados com dados de contato e links de recuperação."""
    items, total = recovery_service.list_abandoned_carts(
        db=db,
        product_id=product_id,
        status_filter=status,
        search=search,
        limit=limit,
        offset=offset,
        return_total=True,
    )
    response.headers["X-Total-Count"] = str(total)
    return items


@router.delete("/abandoned-carts/{cart_id}")
def delete_abandoned_cart_endpoint(
    cart_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui um carrinho abandonado individualmente."""
    recovery_service.delete_abandoned_cart(db, cart_id)
    return {"success": True, "message": f"Carrinho #{cart_id} excluído com sucesso."}


@router.post("/abandoned-carts/bulk-delete", response_model=BulkDeleteAbandonedCartsResponse)
def bulk_delete_abandoned_carts_endpoint(
    payload: BulkDeleteAbandonedCartsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui carrinhos abandonados selecionados em massa."""
    deleted_count = recovery_service.bulk_delete_abandoned_carts(db, payload.cart_ids)
    return BulkDeleteAbandonedCartsResponse(
        deleted_count=deleted_count,
        message=f"{deleted_count} carrinho(s) excluído(s) com sucesso.",
    )


@router.patch("/abandoned-carts/{cart_id}", response_model=AbandonedCartResponse)
def update_abandoned_cart_endpoint(
    cart_id: int,
    payload: AbandonedCartUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza o status, flag de contato ou notas de um carrinho abandonado."""
    return recovery_service.update_abandoned_cart(db, cart_id, payload)


@router.get("/pending-pix", response_model=List[PendingPixOrderResponse])
def list_pending_pix_endpoint(
    product_id: Optional[int] = Query(None, description="Filtrar por produto"),
    status: Optional[str] = Query("pending", description="Status do pedido Pix ('pending', 'paid', 'expired', 'all')"),
    search: Optional[str] = Query(None, description="Busca por código, nome, e-mail ou telefone"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista pedidos Pix pendentes com QR Code Copia e Cola para recuperação."""
    return recovery_service.list_pending_pix(
        db=db,
        product_id=product_id,
        status_filter=status,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post("/abandoned-carts/{cart_id}/resend-webhook")
def resend_abandoned_webhook_endpoint(
    cart_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reenvia o webhook 'checkout.abandoned' para as URLs cadastradas no produto."""
    cart = db.query(AbandonedCart).filter(AbandonedCart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrinho abandonado não encontrado.")

    logs = dispatch_abandoned_cart_webhook(cart, db)
    return {
        "message": f"Webhook disparado para {len(logs)} destino(s).",
        "dispatches_count": len(logs),
    }


@router.get("/cart-by-token/{token}", response_model=CartByTokenResponse)
def get_cart_by_token_endpoint(token: str, db: Session = Depends(get_db)):
    """
    Retorna os dados do lead para auto-preenchimento no checkout através do recovery_token.
    Endpoint público acessado pela página de checkout.
    """
    cart = (
        db.query(AbandonedCart)
        .filter(AbandonedCart.recovery_token == token.strip())
        .first()
    )
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carrinho não encontrado para este token de recuperação."
        )

    product_slug = cart.product.slug if cart.product else None
    offer_slug = cart.offer.slug if cart.offer else None

    return CartByTokenResponse(
        customer_name=cart.customer_name,
        customer_email=cart.customer_email,
        customer_phone=cart.customer_phone,
        customer_phone_ddi=cart.customer_phone_ddi or "55",
        customer_cpf=cart.customer_cpf,
        coupon_code=cart.coupon_code,
        product_slug=product_slug,
        offer_slug=offer_slug,
    )
