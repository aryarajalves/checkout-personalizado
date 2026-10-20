from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.product import Product
from app.models.coupon import Coupon
from app.schemas.product import (
    ProductConversionConfigResponse,
    ProductConversionConfigUpdate,
)
from app.core.logger import logger

def get_product_conversion_config(db: Session, product_id: int) -> ProductConversionConfigResponse:
    """Retorna as configurações de gatilhos de conversão (Exit-Intent e Prova Social) do produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    coupon_code = None
    coupon_discount = None
    if product.exit_intent_coupon:
        coupon_code = product.exit_intent_coupon.code
        coupon_discount = product.exit_intent_coupon.discount_percent

    return ProductConversionConfigResponse(
        enable_exit_intent=bool(product.enable_exit_intent),
        exit_intent_coupon_id=product.exit_intent_coupon_id,
        exit_intent_coupon_code=coupon_code,
        exit_intent_coupon_discount_percent=coupon_discount,
        exit_intent_title=product.exit_intent_title or "Espere! Não perca esta oportunidade exclusiva",
        exit_intent_subtitle=product.exit_intent_subtitle or "Liberamos um desconto especial de última chance para você concluir seu pedido agora!",
        enable_social_proof=bool(product.enable_social_proof),
        social_proof_mode=product.social_proof_mode or "hybrid",
        enable_card_fallback=bool(getattr(product, "enable_card_fallback", True)),
        card_fallback_discount_percent=float(getattr(product, "card_fallback_discount_percent", 0.0) or 0.0)
    )

def update_product_conversion_config(
    db: Session, product_id: int, data: ProductConversionConfigUpdate
) -> ProductConversionConfigResponse:
    """Atualiza as configurações de Exit-Intent, Prova Social e Fallback de Cartão do produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {product_id} não encontrado.")

    if data.exit_intent_coupon_id:
        coupon = db.query(Coupon).filter(Coupon.id == data.exit_intent_coupon_id).first()
        if not coupon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cupom ID {data.exit_intent_coupon_id} não encontrado.")

    product.enable_exit_intent = data.enable_exit_intent
    product.exit_intent_coupon_id = data.exit_intent_coupon_id
    product.exit_intent_title = data.exit_intent_title.strip() if data.exit_intent_title else "Espere! Não perca esta oportunidade exclusiva"
    product.exit_intent_subtitle = data.exit_intent_subtitle.strip() if data.exit_intent_subtitle else "Liberamos um desconto especial de última chance para você concluir seu pedido agora!"
    product.enable_social_proof = data.enable_social_proof
    product.social_proof_mode = data.social_proof_mode or "hybrid"
    product.enable_card_fallback = bool(data.enable_card_fallback)
    product.card_fallback_discount_percent = max(0.0, min(100.0, float(data.card_fallback_discount_percent or 0.0)))

    db.commit()
    db.refresh(product)
    logger.info(f"Configuração de conversão do produto ID {product_id} atualizada com sucesso.")
    return get_product_conversion_config(db, product_id)
