from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request, status, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.schemas.custom_proposal import (
    CustomProposalCreate,
    CustomProposalResponse,
    ProposalPublicResponse,
    ProposalMetricsResponse,
)
from app.services import proposal_service

router = APIRouter()


@router.post("", response_model=CustomProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal_endpoint(
    data: CustomProposalCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova proposta de negociação personalizada (High-Ticket / Closer).
    Gera um link exclusivo com validade e condições customizadas.
    """
    origin = request.headers.get("origin") or "http://localhost:3001"
    return proposal_service.create_proposal(db, data, base_url=origin)


@router.get("/metrics", response_model=ProposalMetricsResponse)
def get_proposal_metrics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna métricas consolidadas das propostas (total, ativas, pagas, faturamento negociado).
    """
    return proposal_service.get_proposal_metrics(db)


@router.get("", response_model=dict)
def list_proposals_endpoint(
    request: Request,
    product_id: Optional[int] = Query(None, description="Filtrar por produto"),
    status: Optional[str] = Query(None, description="Filtrar por status ('active', 'paid', 'expired', 'canceled')"),
    search: Optional[str] = Query(None, description="Buscar por código, cliente, closer ou e-mail"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista as propostas customizadas com filtros, paginação e status dinâmico.
    """
    origin = request.headers.get("origin") or "http://localhost:3001"
    items, total = proposal_service.list_proposals(
        db=db,
        product_id=product_id,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit,
        base_url=origin
    )
    return {"items": items, "total": total}


@router.get("/public/{code}", response_model=ProposalPublicResponse)
def get_public_proposal_endpoint(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint público consumido pelo checkout para carregar as condições negociadas.
    Não requer autenticação.
    """
    return proposal_service.get_public_proposal(db, code)


@router.get("/{proposal_id}", response_model=CustomProposalResponse)
def get_proposal_detail_endpoint(
    proposal_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna os detalhes completos de uma proposta específica.
    """
    origin = request.headers.get("origin") or "http://localhost:3001"
    proposal = db.query(proposal_service.CustomProposal).filter(proposal_service.CustomProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada.")
    return proposal_service._enrich_proposal_response(proposal, origin)


@router.post("/{proposal_id}/cancel", response_model=CustomProposalResponse)
def cancel_proposal_endpoint(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancela uma proposta de negociação ativa.
    """
    return proposal_service.cancel_proposal(db, proposal_id)


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proposal_endpoint(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove uma proposta do banco de dados.
    """
    proposal_service.delete_proposal(db, proposal_id)
    return None
