"""
Endpoints para Gestão de Produtos, Múltiplas Ofertas e Regras de Split.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.users import get_current_user
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSplitRulesUpdate,
    ProductSplitRuleResponse,
    ProductOfferCreate,
    ProductOfferUpdate,
    ProductOfferResponse,
    ProductOrderBumpCreate,
    ProductOrderBumpUpdate,
    ProductOrderBumpResponse,
    ProductUpsellCreate,
    ProductUpsellUpdate,
    ProductUpsellResponse,
    ProductPixelConfigUpdate,
    ProductPixelConfigResponse,
    ProductAppearanceUpdate,
    ProductAppearanceResponse,
)
from app.services import product_service

router = APIRouter()

@router.get("", response_model=List[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os produtos cadastrados com suas regras de split e ofertas."""
    return product_service.get_products(db, skip=skip, limit=limit)

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo produto com slug único, oferta inicial e regras opcionais de split."""
    return product_service.create_product(db, data)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém detalhes de um produto específico."""
    return product_service.get_product_by_id(db, product_id)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza as informações de um produto."""
    return product_service.update_product(db, product_id, data)

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui um produto do catálogo."""
    return product_service.delete_product(db, product_id)

@router.get("/{product_id}/split-rules", response_model=List[ProductSplitRuleResponse])
def get_product_split_rules(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna as regras de split configuradas para um produto."""
    product = product_service.get_product_by_id(db, product_id)
    return product.split_rules

@router.put("/{product_id}/split-rules", response_model=List[ProductSplitRuleResponse])
def update_product_split_rules(
    product_id: int,
    payload: ProductSplitRulesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza as regras de split de um produto (máximo 100% no somatório e sem sócios repetidos)."""
    return product_service.update_product_split_rules(db, product_id, payload.rules)

# ==============================================================================
# Rotas para Múltiplas Ofertas por Produto
# ==============================================================================

@router.get("/{product_id}/offers", response_model=List[ProductOfferResponse])
def list_product_offers(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas as ofertas/preços cadastrados para o produto especificado."""
    return product_service.list_product_offers(db, product_id)

@router.post("/{product_id}/offers", response_model=ProductOfferResponse, status_code=status.HTTP_201_CREATED)
def create_product_offer(
    product_id: int,
    data: ProductOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cadastra uma nova oferta com preço e slug próprios (/pay/{slug}) para o produto."""
    return product_service.create_product_offer(db, product_id, data)

@router.put("/{product_id}/offers/{offer_id}", response_model=ProductOfferResponse)
def update_product_offer(
    product_id: int,
    offer_id: int,
    data: ProductOfferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza dados de uma oferta (nome, preço, slug, status ativa/padrão)."""
    return product_service.update_product_offer(db, product_id, offer_id, data)

@router.delete("/{product_id}/offers/{offer_id}")
def delete_product_offer(
    product_id: int,
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui uma oferta de um produto (não permite exclusão se for a única oferta)."""
    return product_service.delete_product_offer(db, product_id, offer_id)

# ==============================================================================
# Rotas para Pixel do Produto
# ==============================================================================

@router.get("/{product_id}/pixel", response_model=ProductPixelConfigResponse)
def get_product_pixel(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém as configurações de Pixel do produto."""
    return product_service.get_product_pixel_config(db, product_id)

@router.put("/{product_id}/pixel", response_model=ProductPixelConfigResponse)
def update_product_pixel(
    product_id: int,
    data: ProductPixelConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza as configurações e eventos ativos do Pixel."""
    return product_service.update_product_pixel_config(db, product_id, data)

# ==============================================================================
# Rotas para Order Bumps
# ==============================================================================

@router.get("/{product_id}/order-bumps", response_model=List[ProductOrderBumpResponse])
def list_product_order_bumps(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os order bumps cadastrados para o produto."""
    return product_service.list_product_order_bumps(db, product_id)

@router.post("/{product_id}/order-bumps", response_model=ProductOrderBumpResponse, status_code=status.HTTP_201_CREATED)
def create_product_order_bump(
    product_id: int,
    data: ProductOrderBumpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cadastra um novo order bump para o produto."""
    return product_service.create_product_order_bump(db, product_id, data)

@router.put("/{product_id}/order-bumps/{bump_id}", response_model=ProductOrderBumpResponse)
def update_product_order_bump(
    product_id: int,
    bump_id: int,
    data: ProductOrderBumpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza dados de um order bump."""
    return product_service.update_product_order_bump(db, product_id, bump_id, data)

@router.delete("/{product_id}/order-bumps/{bump_id}")
def delete_product_order_bump(
    product_id: int,
    bump_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui um order bump."""
    return product_service.delete_product_order_bump(db, product_id, bump_id)

# ==============================================================================
# Rotas para UpSell
# ==============================================================================

@router.get("/{product_id}/upsells", response_model=List[ProductUpsellResponse])
def list_product_upsells(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista as ofertas de UpSell cadastradas para o produto."""
    return product_service.list_product_upsells(db, product_id)

@router.post("/{product_id}/upsells", response_model=ProductUpsellResponse, status_code=status.HTTP_201_CREATED)
def create_product_upsell(
    product_id: int,
    data: ProductUpsellCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cadastra uma oferta de UpSell para o produto."""
    return product_service.create_product_upsell(db, product_id, data)

@router.put("/{product_id}/upsells/{upsell_id}", response_model=ProductUpsellResponse)
def update_product_upsell(
    product_id: int,
    upsell_id: int,
    data: ProductUpsellUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza a oferta de UpSell."""
    return product_service.update_product_upsell(db, product_id, upsell_id, data)

@router.delete("/{product_id}/upsells/{upsell_id}")
def delete_product_upsell(
    product_id: int,
    upsell_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui a oferta de UpSell."""
    return product_service.delete_product_upsell(db, product_id, upsell_id)

# ==============================================================================
# Identidade Visual e Aparência do Checkout (Expert)
# ==============================================================================

@router.get("/{product_id}/appearance", response_model=ProductAppearanceResponse)
def get_product_appearance(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém as configurações de aparência do checkout do produto (cores e logotipo)."""
    return product_service.get_product_appearance(db, product_id)

@router.put("/{product_id}/appearance", response_model=ProductAppearanceResponse)
def update_product_appearance(
    product_id: int,
    data: ProductAppearanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza as configurações de aparência do checkout do produto (cores e logotipo)."""
    return product_service.update_product_appearance(db, product_id, data)

# ==============================================================================
# Rota Pública do Checkout
# ==============================================================================

@router.get("/public/{slug}", response_model=ProductResponse)
def get_public_product_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Rota pública acessada pela tela de checkout para carregar os dados da oferta e do produto."""
    return product_service.get_product_by_slug(db, slug)
