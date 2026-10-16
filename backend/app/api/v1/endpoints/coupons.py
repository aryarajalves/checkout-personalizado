"""
Endpoints administrativos para Gestão de Cupons de Desconto.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.models.coupon import Coupon
from app.models.product import Product
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse

router = APIRouter()

@router.get("", response_model=List[CouponResponse])
def list_coupons(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os cupons de desconto cadastrados no painel admin."""
    query = db.query(Coupon)
    if product_id is not None:
        query = query.filter(Coupon.product_id == product_id)
    coupons = query.order_by(Coupon.created_at.desc()).all()

    res = []
    for c in coupons:
        c_dict = CouponResponse.model_validate(c)
        if c.product:
            c_dict.product_name = c.product.name
        res.append(c_dict)
    return res

@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo cupom de desconto com porcentagem, validade e limite de usos."""
    existing = db.query(Coupon).filter(Coupon.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um cupom com o código '{payload.code}'."
        )

    if payload.product_id is not None:
        prod = db.query(Product).filter(Product.id == payload.product_id).first()
        if not prod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto associado não encontrado."
            )

    coupon = Coupon(
        code=payload.code,
        discount_percent=payload.discount_percent,
        product_id=payload.product_id,
        never_expires=payload.never_expires,
        expires_at=payload.expires_at if not payload.never_expires else None,
        max_uses=payload.max_uses,
        current_uses=0,
        is_active=payload.is_active
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    resp = CouponResponse.model_validate(coupon)
    if coupon.product:
        resp.product_name = coupon.product.name
    return resp

@router.put("/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza configurações de um cupom de desconto existente."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom de desconto não encontrado."
        )

    if payload.code is not None and payload.code != coupon.code:
        existing = db.query(Coupon).filter(Coupon.code == payload.code, Coupon.id != coupon_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro cupom com o código '{payload.code}'."
            )
        coupon.code = payload.code

    if payload.discount_percent is not None:
        coupon.discount_percent = payload.discount_percent

    if "product_id" in payload.model_fields_set:
        if payload.product_id:
            prod = db.query(Product).filter(Product.id == payload.product_id).first()
            if not prod:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
            coupon.product_id = payload.product_id
        else:
            coupon.product_id = None

    if payload.never_expires is not None:
        coupon.never_expires = payload.never_expires
        if payload.never_expires:
            coupon.expires_at = None

    if payload.expires_at is not None:
        coupon.expires_at = payload.expires_at
        coupon.never_expires = False

    if "max_uses" in payload.model_fields_set:
        coupon.max_uses = payload.max_uses

    if payload.is_active is not None:
        coupon.is_active = payload.is_active

    db.commit()
    db.refresh(coupon)

    resp = CouponResponse.model_validate(coupon)
    if coupon.product:
        resp.product_name = coupon.product.name
    return resp

@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui um cupom de desconto do sistema."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom de desconto não encontrado."
        )
    db.delete(coupon)
    db.commit()
    return None
