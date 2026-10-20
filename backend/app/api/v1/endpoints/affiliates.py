"""
Endpoints administrativos e públicos para Gestão de Afiliados,
vínculos com produtos, tracking de links e extrato de comissões.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.affiliate import Affiliate
from app.schemas.affiliate import (
    AffiliateCreate,
    AffiliateUpdate,
    AffiliateResponse,
    AffiliateProductLinkCreate,
    AffiliateProductLinkResponse,
    AffiliateCommissionResponse,
    AffiliateStatsResponse,
    TrackAffiliateClickRequest,
    TrackAffiliateClickResponse,
)
from app.services import affiliate_service

router = APIRouter()


class MarkPaidRequest(BaseModel):
    notes: Optional[str] = None


# ==========================================
# ENDPOINT PÚBLICO (Checkout)
# ==========================================
@router.post("/track-click", response_model=TrackAffiliateClickResponse)
def track_affiliate_click(
    payload: TrackAffiliateClickRequest,
    db: Session = Depends(get_db),
):
    """
    Rastreia clique do visitante no checkout via ?ref=CODIGO,
    incrementa cliques se houver vínculo e valida se o parceiro está ativo.
    """
    return affiliate_service.track_affiliate_click(db, payload.slug, payload.ref_code)


# ==========================================
# ENDPOINTS ADMINISTRATIVOS (Autenticados)
# ==========================================
@router.get("/stats", response_model=AffiliateStatsResponse)
def get_affiliate_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna métricas globais e consolidadas do módulo de afiliados."""
    return affiliate_service.get_affiliate_stats(db)


@router.get("/me/profile", response_model=Optional[AffiliateResponse])
def get_my_affiliate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o cadastro de afiliado do usuário logado se existir."""
    aff = db.query(Affiliate).filter(
        (Affiliate.user_id == current_user.id) | (Affiliate.email == current_user.email)
    ).first()
    if not aff:
        return None
    results = affiliate_service.get_affiliates_list(db, search=aff.affiliate_code)
    for r in results:
        if r.id == aff.id:
            return r
    return AffiliateResponse.model_validate(aff)


@router.post("/me/join", response_model=AffiliateResponse)
def join_as_affiliate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ativa o usuário logado como afiliado usando seus dados cadastrais e financeiros."""
    from app.models.affiliate import generate_default_affiliate_code
    aff = db.query(Affiliate).filter(
        (Affiliate.user_id == current_user.id) | (Affiliate.email == current_user.email)
    ).first()
    if not aff:
        aff = Affiliate(
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            phone=current_user.phone or "11999999999",
            document=current_user.document,
            pix_key=current_user.pix_key,
            pix_key_type=current_user.pix_key_type or "cpf",
            crypto_wallet=current_user.crypto_wallet,
            default_commission_percent=20.0,
            affiliate_code=generate_default_affiliate_code(),
            is_active=True
        )
        db.add(aff)
        db.commit()
        db.refresh(aff)
    else:
        if not aff.user_id:
            aff.user_id = current_user.id
        if current_user.pix_key:
            aff.pix_key = current_user.pix_key
            aff.pix_key_type = current_user.pix_key_type or "cpf"
        if current_user.document:
            aff.document = current_user.document
        if current_user.phone:
            aff.phone = current_user.phone
        db.commit()
        db.refresh(aff)

    results = affiliate_service.get_affiliates_list(db, search=aff.affiliate_code)
    for r in results:
        if r.id == aff.id:
            return r
    return AffiliateResponse.model_validate(aff)


@router.get("", response_model=List[AffiliateResponse])
def list_affiliates(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os afiliados cadastrados com métricas individuais de vendas e links."""
    return affiliate_service.get_affiliates_list(db, is_active=is_active, search=search)


@router.post("", response_model=AffiliateResponse, status_code=status.HTTP_201_CREATED)
def create_affiliate(
    payload: AffiliateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cadastra um novo afiliado com código de indicação único e chave de repasse Pix/Cripto."""
    affiliate = affiliate_service.create_affiliate(db, payload)
    # Re-executa get_affiliates_list ou monta resposta completa
    results = affiliate_service.get_affiliates_list(db, search=affiliate.affiliate_code)
    for r in results:
        if r.id == affiliate.id:
            return r
    return AffiliateResponse.model_validate(affiliate)


@router.get("/{affiliate_id}", response_model=AffiliateResponse)
def get_affiliate(
    affiliate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna detalhes cadastrais e métricas de um afiliado específico."""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Afiliado não encontrado.")
    results = affiliate_service.get_affiliates_list(db, search=affiliate.affiliate_code)
    for r in results:
        if r.id == affiliate.id:
            return r
    return AffiliateResponse.model_validate(affiliate)


@router.put("/{affiliate_id}", response_model=AffiliateResponse)
def update_affiliate(
    affiliate_id: int,
    payload: AffiliateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza dados cadastrais, percentual padrão ou chaves financeiras do parceiro."""
    affiliate = affiliate_service.update_affiliate(db, affiliate_id, payload)
    results = affiliate_service.get_affiliates_list(db, search=affiliate.affiliate_code)
    for r in results:
        if r.id == affiliate.id:
            return r
    return AffiliateResponse.model_validate(affiliate)


@router.post("/{affiliate_id}/products", response_model=AffiliateProductLinkResponse)
def link_product_to_affiliate(
    affiliate_id: int,
    payload: AffiliateProductLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vincula um produto ao afiliado com comissão customizada ou slug específico."""
    link = affiliate_service.link_product_to_affiliate(db, affiliate_id, payload)
    prod_name = link.product.name if link.product else None
    prod_slug = link.product.slug if link.product else ""
    ref = link.custom_ref_code or link.affiliate.affiliate_code
    eff_comm = link.commission_percent if link.commission_percent is not None else link.affiliate.default_commission_percent

    return AffiliateProductLinkResponse(
        id=link.id,
        affiliate_id=link.affiliate_id,
        product_id=link.product_id,
        product_name=prod_name,
        product_slug=prod_slug,
        commission_percent=link.commission_percent,
        effective_commission_percent=eff_comm,
        custom_ref_code=link.custom_ref_code,
        ref_code=ref,
        clicks_count=link.clicks_count,
        is_active=link.is_active,
        affiliate_link=f"/pay/{prod_slug}?ref={ref}" if prod_slug else None,
        created_at=link.created_at,
    )


@router.delete("/products/{link_id}")
def remove_product_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove o vínculo entre afiliado e produto."""
    affiliate_service.remove_product_link(db, link_id)
    return {"detail": "Vínculo removido com sucesso."}


@router.get("/commissions/history", response_model=List[AffiliateCommissionResponse])
def get_commissions_history(
    affiliate_id: Optional[int] = None,
    status_filter: Optional[str] = Query("all", alias="status"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o extrato detalhado de comissões com filtros de afiliado e status de pagamento."""
    return affiliate_service.list_commissions(
        db,
        affiliate_id=affiliate_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )


@router.patch("/commissions/{commission_id}/mark-paid", response_model=AffiliateCommissionResponse)
def mark_commission_paid(
    commission_id: int,
    payload: MarkPaidRequest = MarkPaidRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca uma comissão como paga após a liquidação do repasse."""
    commission = affiliate_service.mark_commission_paid(db, commission_id, payload.notes)
    return AffiliateCommissionResponse(
        id=commission.id,
        affiliate_id=commission.affiliate_id,
        affiliate_name=commission.affiliate.name if commission.affiliate else None,
        affiliate_code=commission.affiliate.affiliate_code if commission.affiliate else None,
        order_id=commission.order_id,
        order_code=commission.order.order_code if commission.order else None,
        product_id=commission.product_id,
        product_name=commission.product.name if commission.product else None,
        amount_brl=commission.amount_brl,
        amount_usd=commission.amount_usd,
        sale_amount_brl=commission.sale_amount_brl,
        commission_percent=commission.commission_percent,
        status=commission.status,
        paid_at=commission.paid_at,
        notes=commission.notes,
        created_at=commission.created_at,
    )
