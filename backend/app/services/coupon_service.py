"""
Serviço para validação, cálculo e gestão de Cupons de Desconto.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.logger import logger
from app.models.coupon import Coupon

def validate_and_apply_coupon(
    db: Session,
    code: str,
    product_id: int,
    total_brl: float,
    total_usd: Optional[float] = None
) -> Dict[str, Any]:
    """
    Valida as regras de negócio de um cupom de desconto e calcula o abatimento percentual:
    - Código válido e ativo
    - Produto específico ou global
    - Prazo de validade (expires_at vs never_expires)
    - Limite de utilizações (max_uses vs current_uses)
    """
    clean_code = (code or "").strip().upper()
    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o código do cupom."
        )

    coupon = db.query(Coupon).filter(Coupon.code == clean_code).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cupom '{clean_code}' não encontrado."
        )

    if not coupon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este cupom de desconto está desativado."
        )

    # Validação de escopo de produto
    if coupon.product_id is not None and coupon.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este cupom não é válido para este produto."
        )

    # Validação de data de expiração
    if not coupon.never_expires and coupon.expires_at:
        now = datetime.now(timezone.utc)
        exp = coupon.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este cupom de desconto já expirou."
            )

    # Validação de limite de usos
    if coupon.max_uses is not None and coupon.current_uses >= coupon.max_uses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este cupom atingiu o limite máximo de utilizações."
        )

    percent = float(coupon.discount_percent)
    discount_brl = round(total_brl * (percent / 100.0), 2)
    final_brl = max(0.01, round(total_brl - discount_brl, 2))

    discount_usd = round(total_usd * (percent / 100.0), 2) if total_usd else 0.0
    final_usd = max(0.01, round(total_usd - discount_usd, 2)) if total_usd else None

    logger.info(
        f"Cupom '{coupon.code}' validado com sucesso! {percent}% OFF "
        f"(R$ {total_brl:.2f} -> R$ {final_brl:.2f})"
    )

    return {
        "valid": True,
        "coupon_id": coupon.id,
        "code": coupon.code,
        "discount_percent": percent,
        "discount_amount_brl": discount_brl,
        "discount_amount_usd": discount_usd,
        "final_amount_brl": final_brl,
        "final_amount_usd": final_usd,
        "message": f"Cupom '{coupon.code}' aplicado! {percent:.0f}% de desconto."
    }

def increment_coupon_use(db: Session, coupon_id: int):
    """Incrementa o contador de utilizações do cupom."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if coupon:
        coupon.current_uses = (coupon.current_uses or 0) + 1
        db.flush()
        logger.info(f"Uso do cupom '{coupon.code}' incrementado para {coupon.current_uses}.")
