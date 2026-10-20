"""
Endpoints da Central Rápida do Comprador (/minhas-compras).
Permite autoatendimento do aluno/comprador sem atrito de senhas complexas (via OTP).
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.schemas.buyer_portal import (
    BuyerRequestCode,
    BuyerRequestCodeResponse,
    BuyerVerifyCode,
    BuyerAuthResponse,
    BuyerCustomerProfile,
    BuyerOrderItem,
    BuyerSubscriptionItem,
    BuyerUpdateCardRequest,
    BuyerRegeneratePixResponse,
)
from app.services import buyer_portal_service

router = APIRouter()


def get_current_buyer(authorization: str = Header(None)) -> Dict[str, Any]:
    """
    Dependência de autenticação leve para a sessão do comprador no portal.
    Exige Bearer Token assinado com type 'buyer_portal'.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso do comprador não fornecido ou inválido."
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "buyer_portal" or not payload.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão do comprador expirada ou inválida. Por favor, solicite um novo código de acesso."
        )
    return payload


@router.post("/request-code", response_model=BuyerRequestCodeResponse)
def request_access_code_endpoint(data: BuyerRequestCode, db: Session = Depends(get_db)):
    """
    Solicita um código de verificação OTP (6 dígitos) enviado ao e-mail do comprador.
    """
    return buyer_portal_service.request_access_code(db, email=data.email, cpf=data.cpf)


@router.post("/verify-code", response_model=BuyerAuthResponse)
def verify_access_code_endpoint(data: BuyerVerifyCode, db: Session = Depends(get_db)):
    """
    Verifica o código OTP de 6 dígitos e inicia a sessão autenticada do comprador (retorna JWT de 24h).
    """
    return buyer_portal_service.verify_access_code(db, email=data.email, code=data.code)


@router.get("/me", response_model=BuyerCustomerProfile)
def get_buyer_profile_endpoint(buyer: Dict[str, Any] = Depends(get_current_buyer)):
    """
    Retorna os dados do perfil do comprador atualmente autenticado.
    """
    return BuyerCustomerProfile(
        name=buyer.get("name", "Aluno(a)"),
        email=buyer.get("email", ""),
        cpf=buyer.get("cpf"),
        phone=buyer.get("phone")
    )


@router.get("/orders", response_model=List[BuyerOrderItem])
def list_buyer_orders_endpoint(
    db: Session = Depends(get_db),
    buyer: Dict[str, Any] = Depends(get_current_buyer)
):
    """
    Lista todos os pedidos realizados pelo comprador (com link de Área de Membros e 2ª via de Pix).
    """
    return buyer_portal_service.get_buyer_orders(db, email=buyer["email"])


@router.post("/orders/{order_code}/regenerate-pix", response_model=BuyerRegeneratePixResponse)
def regenerate_pix_endpoint(
    order_code: str,
    db: Session = Depends(get_db),
    buyer: Dict[str, Any] = Depends(get_current_buyer)
):
    """
    Gera um novo QR Code Pix e novo prazo de expiração para pedidos pendentes.
    """
    return buyer_portal_service.regenerate_buyer_pix(db, email=buyer["email"], order_code=order_code)


@router.get("/subscriptions", response_model=List[BuyerSubscriptionItem])
def list_buyer_subscriptions_endpoint(
    db: Session = Depends(get_db),
    buyer: Dict[str, Any] = Depends(get_current_buyer)
):
    """
    Lista todas as assinaturas recorrentes do comprador com histórico de faturas.
    """
    return buyer_portal_service.get_buyer_subscriptions(db, email=buyer["email"])


@router.post("/subscriptions/{subscription_code}/update-card")
def update_subscription_card_endpoint(
    subscription_code: str,
    card_data: BuyerUpdateCardRequest,
    db: Session = Depends(get_db),
    buyer: Dict[str, Any] = Depends(get_current_buyer)
):
    """
    Atualiza o cartão de crédito vinculado a uma assinatura recorrente ativa ou em atraso.
    """
    return buyer_portal_service.update_buyer_subscription_card(
        db,
        email=buyer["email"],
        subscription_code=subscription_code,
        card_data=card_data
    )
