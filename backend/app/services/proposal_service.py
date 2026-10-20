import uuid
from typing import Optional, List, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from fastapi import HTTPException, status

from app.models.custom_proposal import CustomProposal
from app.models.product import Product
from app.models.order import Order
from app.schemas.custom_proposal import (
    CustomProposalCreate,
    CustomProposalUpdate,
    CustomProposalResponse,
    ProposalPublicResponse,
    ProposalMetricsResponse,
)
from app.core.logger import logger


def generate_proposal_code() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_suffix = uuid.uuid4().hex[:6].upper()
    return f"PROP-{date_str}-{rand_suffix}"


def _enrich_proposal_response(prop: CustomProposal, base_url: str = "") -> CustomProposalResponse:
    now_utc = datetime.now(timezone.utc)
    exp_dt = prop.expires_at if prop.expires_at.tzinfo else prop.expires_at.replace(tzinfo=timezone.utc)
    is_expired = exp_dt < now_utc and prop.status == "active"

    # Se estiver vencido mas ainda ativo no banco, reflete no status de visualização
    current_status = "expired" if is_expired else prop.status

    time_remaining = None
    if exp_dt > now_utc and prop.status == "active":
        time_remaining = int((exp_dt - now_utc).total_seconds())

    product_slug = prop.product.slug if prop.product else "produto"
    product_name = prop.product.name if prop.product else "Produto"

    clean_base = (base_url or "").rstrip("/")
    checkout_url = f"{clean_base}/pay/{product_slug}?proposal={prop.proposal_code}"

    resp = CustomProposalResponse(
        id=prop.id,
        proposal_code=prop.proposal_code,
        product_id=prop.product_id,
        offer_id=prop.offer_id,
        title=prop.title,
        description=prop.description,
        customer_name=prop.customer_name,
        customer_email=prop.customer_email,
        customer_phone=prop.customer_phone,
        customer_cpf=prop.customer_cpf,
        amount_brl=prop.amount_brl,
        payment_method_allowed=prop.payment_method_allowed,
        custom_pix_amount_brl=prop.custom_pix_amount_brl,
        custom_card_amount_brl=prop.custom_card_amount_brl,
        max_installments=prop.max_installments,
        closer_name=prop.closer_name,
        notes=prop.notes,
        status=current_status,
        order_id=prop.order_id,
        expires_at=prop.expires_at,
        paid_at=prop.paid_at,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        product_name=product_name,
        product_slug=product_slug,
        checkout_url=checkout_url,
        is_expired=is_expired,
        time_remaining_seconds=time_remaining,
    )
    return resp


def create_proposal(
    db: Session,
    data: CustomProposalCreate,
    base_url: str = "http://localhost:3003"
) -> CustomProposalResponse:
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com ID {data.product_id} não encontrado."
        )

    # Validação do valor
    if data.amount_brl <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor da proposta negociada deve ser maior que zero."
        )

    # Validação de fatias híbridas se informado
    if data.payment_method_allowed == "hybrid_pix_card":
        if data.custom_pix_amount_brl is not None and data.custom_card_amount_brl is not None:
            sum_parts = round(float(data.custom_pix_amount_brl) + float(data.custom_card_amount_brl), 2)
            if sum_parts != round(data.amount_brl, 2):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A soma da entrada Pix (R$ {data.custom_pix_amount_brl:.2f}) e do Cartão (R$ {data.custom_card_amount_brl:.2f}) deve ser igual ao valor total negociado (R$ {data.amount_brl:.2f})."
                )

    # Cálculo do prazo de expiração
    now_utc = datetime.now(timezone.utc)
    if data.expires_at:
        expires_at = data.expires_at if data.expires_at.tzinfo else data.expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A data de expiração da proposta deve ser no futuro."
            )
    else:
        hours = data.expires_hours or 24
        expires_at = now_utc + timedelta(hours=hours)

    proposal_code = generate_proposal_code()

    proposal = CustomProposal(
        proposal_code=proposal_code,
        product_id=data.product_id,
        offer_id=data.offer_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        customer_name=data.customer_name.strip(),
        customer_email=data.customer_email.strip().lower(),
        customer_phone=data.customer_phone.strip(),
        customer_cpf=data.customer_cpf.strip() if data.customer_cpf else None,
        amount_brl=round(data.amount_brl, 2),
        payment_method_allowed=data.payment_method_allowed or "all",
        custom_pix_amount_brl=data.custom_pix_amount_brl,
        custom_card_amount_brl=data.custom_card_amount_brl,
        max_installments=data.max_installments or 12,
        closer_name=data.closer_name.strip() if data.closer_name else None,
        notes=data.notes.strip() if data.notes else None,
        status="active",
        expires_at=expires_at,
    )

    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    logger.info(f"Proposta personalizada {proposal.proposal_code} criada para {proposal.customer_name} (R$ {proposal.amount_brl:.2f}, expira em {expires_at})")
    return _enrich_proposal_response(proposal, base_url)


def list_proposals(
    db: Session,
    product_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    payment_method: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    base_url: str = "http://localhost:3003"
) -> Tuple[List[CustomProposalResponse], int]:
    query = db.query(CustomProposal)

    if product_id:
        query = query.filter(CustomProposal.product_id == product_id)

    if payment_method:
        query = query.filter(CustomProposal.payment_method_allowed == payment_method)

    if status_filter:
        now_utc = datetime.now(timezone.utc)
        if status_filter == "active":
            query = query.filter(CustomProposal.status == "active", CustomProposal.expires_at > now_utc)
        elif status_filter == "expired":
            query = query.filter(
                or_(
                    CustomProposal.status == "expired",
                    (CustomProposal.status == "active") & (CustomProposal.expires_at <= now_utc)
                )
            )
        else:
            query = query.filter(CustomProposal.status == status_filter)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CustomProposal.proposal_code.ilike(search_fmt),
                CustomProposal.customer_name.ilike(search_fmt),
                CustomProposal.customer_email.ilike(search_fmt),
                CustomProposal.customer_phone.ilike(search_fmt),
                CustomProposal.closer_name.ilike(search_fmt),
                CustomProposal.title.ilike(search_fmt),
            )
        )

    total = query.count()
    proposals = query.order_by(desc(CustomProposal.created_at)).offset(skip).limit(limit).all()

    return [_enrich_proposal_response(p, base_url) for p in proposals], total


def update_proposal(
    db: Session,
    proposal_id: int,
    data: CustomProposalUpdate,
    base_url: str = "http://localhost:3003"
) -> CustomProposalResponse:
    proposal = db.query(CustomProposal).filter(CustomProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposta com ID {proposal_id} não encontrada."
        )

    if proposal.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar uma proposta que já foi paga."
        )

    if data.product_id is not None and data.product_id != proposal.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto com ID {data.product_id} não encontrado."
            )
        proposal.product_id = data.product_id

    if data.title is not None:
        proposal.title = data.title.strip()
    if data.description is not None:
        proposal.description = data.description.strip() if data.description else None
    if data.customer_name is not None:
        proposal.customer_name = data.customer_name.strip()
    if data.customer_email is not None:
        proposal.customer_email = data.customer_email.strip().lower()
    if data.customer_phone is not None:
        proposal.customer_phone = data.customer_phone.strip()
    if data.customer_cpf is not None:
        proposal.customer_cpf = data.customer_cpf.strip() if data.customer_cpf else None
    if data.closer_name is not None:
        proposal.closer_name = data.closer_name.strip() if data.closer_name else None
    if data.notes is not None:
        proposal.notes = data.notes.strip() if data.notes else None
    if data.max_installments is not None:
        proposal.max_installments = data.max_installments
    if data.offer_id is not None:
        proposal.offer_id = data.offer_id

    if data.amount_brl is not None:
        if data.amount_brl <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O valor da proposta negociada deve ser maior que zero."
            )
        proposal.amount_brl = round(data.amount_brl, 2)

    if data.payment_method_allowed is not None:
        proposal.payment_method_allowed = data.payment_method_allowed

    if data.custom_pix_amount_brl is not None:
        proposal.custom_pix_amount_brl = data.custom_pix_amount_brl
    if data.custom_card_amount_brl is not None:
        proposal.custom_card_amount_brl = data.custom_card_amount_brl

    if proposal.payment_method_allowed == "hybrid_pix_card":
        if proposal.custom_pix_amount_brl is not None and proposal.custom_card_amount_brl is not None:
            sum_parts = round(float(proposal.custom_pix_amount_brl) + float(proposal.custom_card_amount_brl), 2)
            if sum_parts != round(proposal.amount_brl, 2):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A soma da entrada Pix (R$ {proposal.custom_pix_amount_brl:.2f}) e do Cartão (R$ {proposal.custom_card_amount_brl:.2f}) deve ser igual ao valor total negociado (R$ {proposal.amount_brl:.2f})."
                )

    now_utc = datetime.now(timezone.utc)
    if data.expires_at is not None:
        exp = data.expires_at if data.expires_at.tzinfo else data.expires_at.replace(tzinfo=timezone.utc)
        if exp <= now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova data de expiração da proposta deve ser no futuro."
            )
        proposal.expires_at = exp
    elif data.expires_hours is not None:
        proposal.expires_at = now_utc + timedelta(hours=data.expires_hours)

    if data.status is not None:
        proposal.status = data.status

    proposal.updated_at = now_utc
    db.commit()
    db.refresh(proposal)

    logger.info(f"Proposta {proposal.proposal_code} (ID: {proposal.id}) atualizada com sucesso.")
    return _enrich_proposal_response(proposal, base_url)


def get_proposal_metrics(db: Session) -> ProposalMetricsResponse:
    now_utc = datetime.now(timezone.utc)
    proposals = db.query(CustomProposal).all()

    total_proposals = len(proposals)
    active_proposals = 0
    paid_proposals = 0
    total_negotiated = 0.0
    total_paid = 0.0

    for p in proposals:
        total_negotiated += p.amount_brl
        exp_dt = p.expires_at if p.expires_at.tzinfo else p.expires_at.replace(tzinfo=timezone.utc)
        if p.status == "paid":
            paid_proposals += 1
            total_paid += p.amount_brl
        elif p.status == "active" and exp_dt > now_utc:
            active_proposals += 1

    conversion_rate = round((paid_proposals / total_proposals * 100.0), 1) if total_proposals > 0 else 0.0

    return ProposalMetricsResponse(
        total_proposals=total_proposals,
        active_proposals=active_proposals,
        paid_proposals=paid_proposals,
        total_amount_negotiated=round(total_negotiated, 2),
        total_amount_paid=round(total_paid, 2),
        conversion_rate=conversion_rate
    )


def get_proposal_by_code(db: Session, code: str) -> CustomProposal:
    proposal = db.query(CustomProposal).filter(CustomProposal.proposal_code == code.strip()).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposta com código '{code}' não encontrada."
        )
    return proposal


def get_public_proposal(db: Session, code: str) -> ProposalPublicResponse:
    proposal = get_proposal_by_code(db, code)

    now_utc = datetime.now(timezone.utc)
    exp_dt = proposal.expires_at if proposal.expires_at.tzinfo else proposal.expires_at.replace(tzinfo=timezone.utc)
    is_expired = exp_dt < now_utc and proposal.status == "active"

    current_status = "expired" if is_expired else proposal.status

    return ProposalPublicResponse(
        proposal_code=proposal.proposal_code,
        product_id=proposal.product_id,
        product_name=proposal.product.name if proposal.product else "Produto",
        product_slug=proposal.product.slug if proposal.product else "produto",
        title=proposal.title,
        description=proposal.description,
        customer_name=proposal.customer_name,
        customer_email=proposal.customer_email,
        customer_phone=proposal.customer_phone,
        customer_cpf=proposal.customer_cpf,
        amount_brl=proposal.amount_brl,
        payment_method_allowed=proposal.payment_method_allowed,
        custom_pix_amount_brl=proposal.custom_pix_amount_brl,
        custom_card_amount_brl=proposal.custom_card_amount_brl,
        max_installments=proposal.max_installments,
        status=current_status,
        expires_at=proposal.expires_at,
        is_expired=is_expired or current_status != "active",
    )


def cancel_proposal(db: Session, proposal_id: int) -> CustomProposalResponse:
    proposal = db.query(CustomProposal).filter(CustomProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposta não encontrada."
        )

    if proposal.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível cancelar uma proposta que já foi paga."
        )

    proposal.status = "canceled"
    db.commit()
    db.refresh(proposal)
    logger.info(f"Proposta {proposal.proposal_code} cancelada.")
    return _enrich_proposal_response(proposal)


def delete_proposal(db: Session, proposal_id: int):
    proposal = db.query(CustomProposal).filter(CustomProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposta não encontrada."
        )

    db.delete(proposal)
    db.commit()
    logger.info(f"Proposta ID {proposal_id} deletada do sistema.")
