"""
Serviço de Gestão de Afiliados, Rastreamento de Links, Vínculos com Produtos e Extrato de Comissões.
"""
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.affiliate import Affiliate, AffiliateProductLink, AffiliateCommission, generate_default_affiliate_code
from app.models.product import Product, ProductOffer
from app.models.order import Order
from app.schemas.affiliate import (
    AffiliateCreate,
    AffiliateUpdate,
    AffiliateResponse,
    AffiliateProductLinkCreate,
    AffiliateProductLinkResponse,
    AffiliateCommissionResponse,
    AffiliateStatsResponse,
    TrackAffiliateClickResponse,
)

def clean_ref_code(code: str) -> str:
    """Higieniza código de afiliado removendo caracteres especiais e convertendo para maiúsculo."""
    return re.sub(r"[^A-Za-z0-9_-]", "", code).strip().upper()

def create_affiliate(db: Session, payload: AffiliateCreate) -> Affiliate:
    """Cadastra um novo afiliado com código de indicação único e chave Pix/Cripto."""
    from app.models.user import User

    linked_user = None
    if payload.user_id:
        linked_user = db.query(User).filter(User.id == payload.user_id).first()
        if not linked_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário selecionado não foi encontrado."
            )
        existing_user_aff = db.query(Affiliate).filter(Affiliate.user_id == linked_user.id).first()
        if existing_user_aff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O usuário '{linked_user.name}' já está cadastrado como parceiro afiliado."
            )

    name = payload.name.strip() if payload.name else (linked_user.name if linked_user else None)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O nome do afiliado é obrigatório.")

    email_source = payload.email or (linked_user.email if linked_user else None)
    if not email_source:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O e-mail do afiliado é obrigatório.")
    clean_email = str(email_source).strip().lower()

    existing_email = db.query(Affiliate).filter(Affiliate.email == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um afiliado cadastrado com este e-mail."
        )

    phone = payload.phone.strip() if payload.phone else (linked_user.phone or "" if linked_user else "")
    document = payload.document.strip() if payload.document else (linked_user.document if linked_user else None)
    pix_key = payload.pix_key.strip() if payload.pix_key else (linked_user.pix_key if linked_user else None)
    pix_key_type = payload.pix_key_type or (linked_user.pix_key_type or "cpf" if linked_user else "cpf")
    crypto_wallet = payload.crypto_wallet.strip() if payload.crypto_wallet else (linked_user.crypto_wallet if linked_user else None)

    code = clean_ref_code(payload.affiliate_code) if payload.affiliate_code else generate_default_affiliate_code()
    if not code:
        code = generate_default_affiliate_code()

    existing_code = db.query(Affiliate).filter(Affiliate.affiliate_code == code).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O código de afiliado '{code}' já está em uso por outro parceiro."
        )

    affiliate = Affiliate(
        user_id=linked_user.id if linked_user else None,
        name=name,
        email=clean_email,
        phone=phone,
        document=document,
        affiliate_code=code,
        pix_key=pix_key,
        pix_key_type=pix_key_type,
        crypto_wallet=crypto_wallet,
        default_commission_percent=round(payload.default_commission_percent, 2),
        is_active=payload.is_active,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)

    logger.info(f"Afiliado #{affiliate.id} ({affiliate.name} - {affiliate.affiliate_code}) cadastrado com sucesso.")
    return affiliate



def update_affiliate(db: Session, affiliate_id: int, payload: AffiliateUpdate) -> Affiliate:
    """Atualiza dados cadastrais, código ou chave de repasse do afiliado."""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Afiliado não encontrado.")

    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        conflict = db.query(Affiliate).filter(Affiliate.email == clean_email, Affiliate.id != affiliate_id).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já utilizado por outro afiliado.")
        affiliate.email = clean_email

    if payload.affiliate_code is not None:
        clean_code = clean_ref_code(payload.affiliate_code)
        conflict = db.query(Affiliate).filter(Affiliate.affiliate_code == clean_code, Affiliate.id != affiliate_id).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Código '{clean_code}' já em uso.")
        affiliate.affiliate_code = clean_code

    if payload.name is not None:
        affiliate.name = payload.name.strip()
    if payload.phone is not None:
        affiliate.phone = payload.phone.strip()
    if payload.document is not None:
        affiliate.document = payload.document.strip() if payload.document else None
    if payload.pix_key is not None:
        affiliate.pix_key = payload.pix_key.strip() if payload.pix_key else None
    if payload.pix_key_type is not None:
        affiliate.pix_key_type = payload.pix_key_type
    if payload.crypto_wallet is not None:
        affiliate.crypto_wallet = payload.crypto_wallet.strip() if payload.crypto_wallet else None
    if payload.default_commission_percent is not None:
        affiliate.default_commission_percent = round(payload.default_commission_percent, 2)
    if payload.is_active is not None:
        affiliate.is_active = payload.is_active
    if payload.notes is not None:
        affiliate.notes = payload.notes.strip() if payload.notes else None

    db.commit()
    db.refresh(affiliate)
    return affiliate


def get_affiliates_list(
    db: Session,
    is_active: Optional[bool] = None,
    search: Optional[str] = None
) -> List[AffiliateResponse]:
    """Lista afiliados com métricas consolidadas de vendas e comissões."""
    query = db.query(Affiliate)
    if is_active is not None:
        query = query.filter(Affiliate.is_active == is_active)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Affiliate.name).like(pattern),
                func.lower(Affiliate.email).like(pattern),
                func.lower(Affiliate.affiliate_code).like(pattern),
            )
        )

    affiliates = query.order_by(desc(Affiliate.created_at)).all()
    results: List[AffiliateResponse] = []

    for aff in affiliates:
        commissions = [c for c in aff.commissions if c.status != "canceled"]
        total_sales_count = len(commissions)
        total_sales_brl = sum(c.sale_amount_brl for c in commissions)
        total_commissions_brl = sum(c.amount_brl for c in commissions)
        total_commissions_paid_brl = sum(c.amount_brl for c in commissions if c.status == "paid")

        links_res = []
        for l in aff.product_links:
            prod_name = l.product.name if l.product else None
            prod_slug = l.product.slug if l.product else ""
            ref = l.custom_ref_code or aff.affiliate_code
            eff_comm = l.commission_percent if l.commission_percent is not None else aff.default_commission_percent
            links_res.append(AffiliateProductLinkResponse(
                id=l.id,
                affiliate_id=l.affiliate_id,
                product_id=l.product_id,
                product_name=prod_name,
                product_slug=prod_slug,
                commission_percent=l.commission_percent,
                effective_commission_percent=eff_comm,
                custom_ref_code=l.custom_ref_code,
                ref_code=ref,
                clicks_count=l.clicks_count,
                is_active=l.is_active,
                affiliate_link=f"/pay/{prod_slug}?ref={ref}" if prod_slug else None,
                created_at=l.created_at,
            ))

        results.append(AffiliateResponse(
            id=aff.id,
            name=aff.name,
            email=aff.email,
            phone=aff.phone,
            document=aff.document,
            affiliate_code=aff.affiliate_code,
            pix_key=aff.pix_key,
            pix_key_type=aff.pix_key_type,
            crypto_wallet=aff.crypto_wallet,
            default_commission_percent=aff.default_commission_percent,
            is_active=aff.is_active,
            notes=aff.notes,
            created_at=aff.created_at,
            updated_at=aff.updated_at,
            total_sales_count=total_sales_count,
            total_sales_brl=round(total_sales_brl, 2),
            total_commissions_brl=round(total_commissions_brl, 2),
            total_commissions_paid_brl=round(total_commissions_paid_brl, 2),
            product_links=links_res,
        ))

    return results


def link_product_to_affiliate(db: Session, affiliate_id: int, payload: AffiliateProductLinkCreate) -> AffiliateProductLink:
    """Vincula um produto ao afiliado com comissão específica ou herança da padrão."""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Afiliado não encontrado.")

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    existing_link = (
        db.query(AffiliateProductLink)
        .filter(AffiliateProductLink.affiliate_id == affiliate_id, AffiliateProductLink.product_id == payload.product_id)
        .first()
    )

    custom_ref = clean_ref_code(payload.custom_ref_code) if payload.custom_ref_code else None

    if existing_link:
        if payload.commission_percent is not None:
            existing_link.commission_percent = round(payload.commission_percent, 2)
        if custom_ref:
            existing_link.custom_ref_code = custom_ref
        existing_link.is_active = True
        db.commit()
        db.refresh(existing_link)
        return existing_link

    link = AffiliateProductLink(
        affiliate_id=affiliate_id,
        product_id=payload.product_id,
        commission_percent=round(payload.commission_percent, 2) if payload.commission_percent is not None else None,
        custom_ref_code=custom_ref,
        clicks_count=0,
        is_active=True,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def remove_product_link(db: Session, link_id: int) -> bool:
    """Desvincula um produto do afiliado."""
    link = db.query(AffiliateProductLink).filter(AffiliateProductLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo de produto não encontrado.")
    db.delete(link)
    db.commit()
    return True


def track_affiliate_click(db: Session, slug: str, ref_code: str) -> TrackAffiliateClickResponse:
    """
    Rastreia o clique em um link de afiliado (?ref=CODIGO) no checkout,
    incrementa a métrica de cliques e retorna validação.
    """
    clean_code = clean_ref_code(ref_code)
    offer = db.query(ProductOffer).filter(ProductOffer.slug == slug.strip().lower()).first()
    product = offer.product if offer else db.query(Product).filter(Product.slug == slug.strip().lower()).first()

    if not product:
        return TrackAffiliateClickResponse(valid=False, ref_code=clean_code)

    # 1. Busca por vínculo direto com custom_ref_code
    link = (
        db.query(AffiliateProductLink)
        .join(Affiliate)
        .filter(
            AffiliateProductLink.product_id == product.id,
            AffiliateProductLink.is_active == True,
            Affiliate.is_active == True,
            or_(
                AffiliateProductLink.custom_ref_code == clean_code,
                Affiliate.affiliate_code == clean_code,
            )
        )
        .first()
    )

    if link:
        link.clicks_count += 1
        db.commit()
        eff_comm = link.commission_percent if link.commission_percent is not None else link.affiliate.default_commission_percent
        return TrackAffiliateClickResponse(
            valid=True,
            affiliate_id=link.affiliate_id,
            affiliate_name=link.affiliate.name,
            ref_code=clean_code,
            product_id=product.id,
            commission_percent=eff_comm,
        )

    # 2. Busca por código global do afiliado (mesmo sem vínculo prévio, se o produto permitir)
    affiliate = db.query(Affiliate).filter(Affiliate.affiliate_code == clean_code, Affiliate.is_active == True).first()
    if affiliate:
        return TrackAffiliateClickResponse(
            valid=True,
            affiliate_id=affiliate.id,
            affiliate_name=affiliate.name,
            ref_code=clean_code,
            product_id=product.id,
            commission_percent=affiliate.default_commission_percent,
        )

    return TrackAffiliateClickResponse(valid=False, ref_code=clean_code)


def resolve_affiliate_for_order(db: Session, product_id: int, ref_code: Optional[str]) -> Tuple[Optional[Affiliate], float]:
    """Identifica o afiliado ativo e percentual de comissão para a criação de um pedido."""
    if not ref_code:
        return None, 0.0

    clean_code = clean_ref_code(ref_code)

    # Procura vínculo do produto
    link = (
        db.query(AffiliateProductLink)
        .join(Affiliate)
        .filter(
            AffiliateProductLink.product_id == product_id,
            AffiliateProductLink.is_active == True,
            Affiliate.is_active == True,
            or_(
                AffiliateProductLink.custom_ref_code == clean_code,
                Affiliate.affiliate_code == clean_code,
            )
        )
        .first()
    )

    if link:
        eff_comm = link.commission_percent if link.commission_percent is not None else link.affiliate.default_commission_percent
        return link.affiliate, eff_comm

    # Afiliado global
    affiliate = db.query(Affiliate).filter(Affiliate.affiliate_code == clean_code, Affiliate.is_active == True).first()
    if affiliate:
        return affiliate, affiliate.default_commission_percent

    return None, 0.0


def register_affiliate_commission(
    db: Session,
    order: Order,
    affiliate: Affiliate,
    commission_percent: float
) -> AffiliateCommission:
    """Calcula e registra a comissão de uma venda atribuída."""
    amount_brl = round((commission_percent / 100.0) * order.amount_brl, 2)
    amount_usd = round((commission_percent / 100.0) * order.amount_usd, 2) if order.amount_usd else None

    # Se a ordem já foi paga (ex: cartão ou simulação), status da comissão pode iniciar como available
    comm_status = "available" if order.status == "paid" else "pending"

    commission = AffiliateCommission(
        affiliate_id=affiliate.id,
        order_id=order.id,
        product_id=order.product_id,
        amount_brl=amount_brl,
        amount_usd=amount_usd,
        sale_amount_brl=order.amount_brl,
        commission_percent=commission_percent,
        status=comm_status,
    )
    db.add(commission)

    # Atualiza dados no pedido
    order.affiliate_id = affiliate.id
    order.affiliate_code = affiliate.affiliate_code
    order.affiliate_commission_brl = amount_brl
    order.affiliate_commission_usd = amount_usd or 0.0

    db.commit()
    db.refresh(commission)

    logger.info(
        f"Comissão #{commission.id} de R$ {amount_brl:.2f} ({commission_percent}%) "
        f"atribuída ao afiliado {affiliate.name} para o pedido {order.order_code}"
    )
    return commission


def mark_commission_paid(db: Session, commission_id: int, notes: Optional[str] = None) -> AffiliateCommission:
    """Marca uma comissão como paga após a transferência ao afiliado."""
    commission = db.query(AffiliateCommission).filter(AffiliateCommission.id == commission_id).first()
    if not commission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comissão não encontrada.")

    commission.status = "paid"
    commission.paid_at = datetime.now(timezone.utc)
    if notes:
        commission.notes = notes.strip()

    db.commit()
    db.refresh(commission)
    logger.info(f"Comissão #{commission.id} marcada como paga para o afiliado #{commission.affiliate_id}")
    return commission


def get_affiliate_stats(db: Session) -> AffiliateStatsResponse:
    """Calcula métricas consolidadas do módulo de afiliados."""
    total_affiliates = db.query(func.count(Affiliate.id)).scalar() or 0
    active_affiliates = db.query(func.count(Affiliate.id)).filter(Affiliate.is_active == True).scalar() or 0

    valid_commissions = db.query(AffiliateCommission).filter(AffiliateCommission.status != "canceled")
    total_sales_count = valid_commissions.count()
    total_sales_brl = valid_commissions.with_entities(func.sum(AffiliateCommission.sale_amount_brl)).scalar() or 0.0
    total_pending_brl = (
        db.query(func.sum(AffiliateCommission.amount_brl))
        .filter(AffiliateCommission.status.in_(["pending", "available"]))
        .scalar()
        or 0.0
    )
    total_paid_brl = (
        db.query(func.sum(AffiliateCommission.amount_brl))
        .filter(AffiliateCommission.status == "paid")
        .scalar()
        or 0.0
    )
    total_clicks = db.query(func.sum(AffiliateProductLink.clicks_count)).scalar() or 0

    return AffiliateStatsResponse(
        total_affiliates=total_affiliates,
        active_affiliates=active_affiliates,
        total_sales_via_affiliates=total_sales_count,
        total_sales_brl=round(total_sales_brl, 2),
        total_commissions_pending_brl=round(total_pending_brl, 2),
        total_commissions_paid_brl=round(total_paid_brl, 2),
        total_clicks=total_clicks,
    )


def list_commissions(
    db: Session,
    affiliate_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[AffiliateCommissionResponse]:
    """Lista extrato de comissões com dados do pedido, afiliado e produto."""
    query = (
        db.query(AffiliateCommission)
        .join(Affiliate, AffiliateCommission.affiliate_id == Affiliate.id)
        .join(Order, AffiliateCommission.order_id == Order.id)
        .join(Product, AffiliateCommission.product_id == Product.id)
    )

    if affiliate_id:
        query = query.filter(AffiliateCommission.affiliate_id == affiliate_id)
    if status_filter and status_filter != "all":
        query = query.filter(AffiliateCommission.status == status_filter)

    commissions = query.order_by(desc(AffiliateCommission.created_at)).offset(offset).limit(limit).all()

    return [
        AffiliateCommissionResponse(
            id=c.id,
            affiliate_id=c.affiliate_id,
            affiliate_name=c.affiliate.name if c.affiliate else None,
            affiliate_code=c.affiliate.affiliate_code if c.affiliate else None,
            order_id=c.order_id,
            order_code=c.order.order_code if c.order else None,
            product_id=c.product_id,
            product_name=c.product.name if c.product else None,
            amount_brl=c.amount_brl,
            amount_usd=c.amount_usd,
            sale_amount_brl=c.sale_amount_brl,
            commission_percent=c.commission_percent,
            status=c.status,
            paid_at=c.paid_at,
            notes=c.notes,
            created_at=c.created_at,
        )
        for c in commissions
    ]
