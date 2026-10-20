from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.api.v1.endpoints.users import get_current_user
from app.schemas.ab_test import (
    ABTestCreate,
    ABTestUpdate,
    ABTestResponse,
    ABTestTrackEvent,
)
from app.services import ab_test_service

router = APIRouter()


@router.get("/product/{product_id}", response_model=Optional[ABTestResponse])
def get_product_ab_test(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o teste A/B cadastrado para o produto, incluindo funil de métricas."""
    return ab_test_service.get_product_ab_test(db, product_id)


@router.post("/product/{product_id}", response_model=ABTestResponse, status_code=status.HTTP_201_CREATED)
def create_product_ab_test(
    product_id: int,
    data: ABTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo teste A/B dividindo 50/50 entre duas ofertas do produto."""
    return ab_test_service.create_product_ab_test(db, product_id, data)


@router.put("/{test_id}", response_model=ABTestResponse)
def update_ab_test(
    test_id: int,
    data: ABTestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza configurações de um teste A/B (nome, status ativo/pausado, divisão)."""
    return ab_test_service.update_ab_test(db, test_id, data)


@router.delete("/{test_id}")
def delete_ab_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui o teste A/B e encerra a distribuição de tráfego."""
    return ab_test_service.delete_ab_test(db, test_id)


@router.post("/track-event")
def track_ab_test_event(
    data: ABTestTrackEvent,
    db: Session = Depends(get_db),
):
    """Rota pública acessada pelo checkout para registrar eventos de visita e início de checkout."""
    return ab_test_service.track_ab_test_event(
        db=db,
        test_id=data.test_id,
        variant=data.variant,
        event_type=data.event_type,
    )
