from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List
from app.models.ab_test import ABTest
from app.models.product import Product, ProductOffer
from app.schemas.ab_test import ABTestCreate, ABTestUpdate, ABTestResponse, ABTestPublicInfo
from app.core.logger import logger


def _build_ab_test_response(test: ABTest) -> ABTestResponse:
    rate_a = round((test.conversions_a / test.visits_a * 100), 2) if test.visits_a > 0 else 0.0
    rate_b = round((test.conversions_b / test.visits_b * 100), 2) if test.visits_b > 0 else 0.0

    winning = None
    if test.conversions_a > 0 or test.conversions_b > 0:
        if rate_a > rate_b:
            winning = "A"
        elif rate_b > rate_a:
            winning = "B"

    offer_a = test.variant_a_offer
    offer_b = test.variant_b_offer

    return ABTestResponse(
        id=test.id,
        product_id=test.product_id,
        name=test.name,
        variant_a_offer_id=test.variant_a_offer_id,
        variant_b_offer_id=test.variant_b_offer_id,
        variant_a_offer_name=offer_a.name if offer_a else None,
        variant_b_offer_name=offer_b.name if offer_b else None,
        variant_a_price_brl=offer_a.price_brl if offer_a else None,
        variant_b_price_brl=offer_b.price_brl if offer_b else None,
        variant_a_slug=offer_a.slug if offer_a else None,
        variant_b_slug=offer_b.slug if offer_b else None,
        is_active=test.is_active,
        split_ratio=test.split_ratio,
        visits_a=test.visits_a,
        visits_b=test.visits_b,
        initiates_a=test.initiates_a,
        initiates_b=test.initiates_b,
        conversions_a=test.conversions_a,
        conversions_b=test.conversions_b,
        revenue_brl_a=round(test.revenue_brl_a, 2),
        revenue_brl_b=round(test.revenue_brl_b, 2),
        conversion_rate_a=rate_a,
        conversion_rate_b=rate_b,
        winning_variant=winning,
        created_at=test.created_at,
        updated_at=test.updated_at,
    )


def get_product_ab_test(db: Session, product_id: int) -> Optional[ABTestResponse]:
    """Retorna o teste A/B do produto, se existir."""
    test = db.query(ABTest).filter(ABTest.product_id == product_id).first()
    if not test:
        return None
    return _build_ab_test_response(test)


def get_active_ab_test_public(db: Session, product_id: int) -> Optional[dict]:
    """Retorna dados públicos do teste A/B ativo para o checkout."""
    test = db.query(ABTest).filter(
        ABTest.product_id == product_id,
        ABTest.is_active.is_(True)
    ).first()
    if not test:
        return None

    offer_a = test.variant_a_offer
    offer_b = test.variant_b_offer

    if not offer_a or not offer_b or not offer_a.is_active or not offer_b.is_active:
        return None

    return {
        "id": test.id,
        "name": test.name,
        "variant_a_offer_id": test.variant_a_offer_id,
        "variant_b_offer_id": test.variant_b_offer_id,
        "variant_a_slug": offer_a.slug,
        "variant_b_slug": offer_b.slug,
        "split_ratio": test.split_ratio,
    }


def create_product_ab_test(db: Session, product_id: int, data: ABTestCreate) -> ABTestResponse:
    """Cria ou substitui o teste A/B para um produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    if data.variant_a_offer_id == data.variant_b_offer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="As variantes A e B devem ser ofertas diferentes."
        )

    offer_a = db.query(ProductOffer).filter(
        ProductOffer.id == data.variant_a_offer_id,
        ProductOffer.product_id == product_id
    ).first()
    offer_b = db.query(ProductOffer).filter(
        ProductOffer.id == data.variant_b_offer_id,
        ProductOffer.product_id == product_id
    ).first()

    if not offer_a or not offer_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uma ou ambas as ofertas selecionadas não pertencem a este produto."
        )

    # Exclui teste existente do produto antes de criar novo
    existing = db.query(ABTest).filter(ABTest.product_id == product_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    test = ABTest(
        product_id=product_id,
        name=data.name.strip(),
        variant_a_offer_id=data.variant_a_offer_id,
        variant_b_offer_id=data.variant_b_offer_id,
        is_active=data.is_active,
        split_ratio=data.split_ratio,
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    logger.info(f"Teste A/B '{test.name}' (ID {test.id}) criado para o produto ID {product_id}.")
    return _build_ab_test_response(test)


def update_ab_test(db: Session, test_id: int, data: ABTestUpdate) -> ABTestResponse:
    """Atualiza configurações de um teste A/B."""
    test = db.query(ABTest).filter(ABTest.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teste A/B ID {test_id} não encontrado."
        )

    if data.name is not None:
        test.name = data.name.strip()
    if data.is_active is not None:
        test.is_active = data.is_active
    if data.split_ratio is not None:
        test.split_ratio = data.split_ratio

    db.commit()
    db.refresh(test)
    logger.info(f"Teste A/B ID {test_id} atualizado com sucesso.")
    return _build_ab_test_response(test)


def delete_ab_test(db: Session, test_id: int) -> dict:
    """Exclui um teste A/B."""
    test = db.query(ABTest).filter(ABTest.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teste A/B ID {test_id} não encontrado."
        )
    db.delete(test)
    db.commit()
    logger.info(f"Teste A/B ID {test_id} excluído com sucesso.")
    return {"message": "Teste A/B excluído com sucesso."}


def track_ab_test_event(db: Session, test_id: int, variant: str, event_type: str) -> dict:
    """Registra evento de visita ou início de checkout no funil da variante."""
    test = db.query(ABTest).filter(ABTest.id == test_id).first()
    if not test or not test.is_active:
        return {"status": "ignored", "reason": "Teste inativo ou inexistente"}

    variant_clean = variant.upper()
    if variant_clean not in ["A", "B"]:
        return {"status": "error", "reason": "Variante inválida"}

    if event_type == "visit":
        if variant_clean == "A":
            test.visits_a += 1
        else:
            test.visits_b += 1
    elif event_type == "initiate_checkout":
        if variant_clean == "A":
            test.initiates_a += 1
        else:
            test.initiates_b += 1

    db.commit()
    return {"status": "tracked", "test_id": test_id, "variant": variant_clean, "event": event_type}


def record_ab_test_conversion(db: Session, test_id: Optional[int], variant: Optional[str], amount_brl: float):
    """Registra conversão de venda aprovada e soma o faturamento gerado para a variante."""
    if not test_id or not variant:
        return

    test = db.query(ABTest).filter(ABTest.id == test_id).first()
    if not test:
        return

    variant_clean = variant.upper()
    if variant_clean == "A":
        test.conversions_a += 1
        test.revenue_brl_a += float(amount_brl or 0.0)
    elif variant_clean == "B":
        test.conversions_b += 1
        test.revenue_brl_b += float(amount_brl or 0.0)

    db.commit()
    logger.info(f"Conversão registrada no Teste A/B ID {test_id} (Variante {variant_clean}): +R$ {amount_brl:.2f}")
