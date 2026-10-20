"""
Endpoints para Gerenciamento de Recebedores de Split de Pagamento.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.gateway import SplitRecipient
from app.api.v1.endpoints.users import require_admin_or_superadmin
from app.schemas.gateway import (
    SplitRecipientCreate,
    SplitRecipientUpdate,
    SplitRecipientResponse
)
from app.core.logger import logger

router = APIRouter(prefix="/split-recipients", tags=["Split de Pagamento"])

@router.get("", response_model=List[SplitRecipientResponse])
def list_split_recipients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Lista todos os recebedores cadastrados para o split de pagamentos, sincronizando com os usuários da plataforma."""
    users = db.query(User).filter(User.is_active == True).all()
    for u in users:
        existing = db.query(SplitRecipient).filter(
            (SplitRecipient.user_id == u.id) | (SplitRecipient.email == u.email)
        ).first()
        if not existing:
            new_rec = SplitRecipient(
                user_id=u.id,
                name=u.name,
                email=u.email,
                document=u.document,
                pix_key=u.pix_key,
                pix_key_type=u.pix_key_type or "cpf",
                crypto_wallet=u.crypto_wallet,
                crypto_network=u.crypto_network or "polygon",
                external_recipient_id=u.external_recipient_id,
                default_percentage=0.0,
                is_active=True
            )
            db.add(new_rec)
        else:
            if not existing.user_id:
                existing.user_id = u.id
            if u.pix_key and not existing.pix_key:
                existing.pix_key = u.pix_key
                existing.pix_key_type = u.pix_key_type or "cpf"
            if u.document and not existing.document:
                existing.document = u.document
            if u.crypto_wallet and not existing.crypto_wallet:
                existing.crypto_wallet = u.crypto_wallet
    db.commit()

    return db.query(SplitRecipient).order_by(SplitRecipient.id.asc()).all()

@router.post("", response_model=SplitRecipientResponse, status_code=status.HTTP_201_CREATED)
def create_split_recipient(
    data: SplitRecipientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Cadastra um novo recebedor para receber divisões de pagamentos."""
    # Validações de consistência
    if data.default_percentage < 0 or data.default_percentage > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A porcentagem padrão de split deve estar entre 0% e 100%."
        )

    linked_user = None
    if data.user_id:
        linked_user = db.query(User).filter(User.id == data.user_id).first()
        if not linked_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário selecionado não foi encontrado."
            )
        existing = db.query(SplitRecipient).filter(SplitRecipient.user_id == linked_user.id).first()
        if existing:
            if data.default_percentage is not None:
                existing.default_percentage = data.default_percentage
            if data.external_recipient_id is not None:
                existing.external_recipient_id = data.external_recipient_id
            existing.is_active = data.is_active
            db.commit()
            db.refresh(existing)
            return existing

    name = data.name or (linked_user.name if linked_user else None)
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do parceiro / sócio é obrigatório."
        )

    email = data.email or (linked_user.email if linked_user else None)
    document = data.document or (linked_user.document if linked_user else None)
    pix_key = data.pix_key or (linked_user.pix_key if linked_user else None)
    pix_key_type = data.pix_key_type or (linked_user.pix_key_type or "cpf" if linked_user else "cpf")
    crypto_wallet = data.crypto_wallet or (linked_user.crypto_wallet if linked_user else None)
    crypto_network = data.crypto_network or (linked_user.crypto_network or "polygon" if linked_user else "polygon")

    recipient = SplitRecipient(
        user_id=linked_user.id if linked_user else None,
        name=name,
        email=email,
        document=document,
        pix_key=pix_key,
        pix_key_type=pix_key_type,
        crypto_wallet=crypto_wallet,
        crypto_network=crypto_network,
        external_recipient_id=data.external_recipient_id,
        default_percentage=data.default_percentage,
        is_active=data.is_active
    )
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    logger.info(f"Recebedor de split '{recipient.name}' (ID: {recipient.id}) cadastrado com sucesso.")
    return recipient


@router.put("/{recipient_id}", response_model=SplitRecipientResponse)
def update_split_recipient(
    recipient_id: int,
    data: SplitRecipientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Atualiza as informações de um recebedor de split existente."""
    recipient = db.query(SplitRecipient).filter(SplitRecipient.id == recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recebedor de split não encontrado."
        )

    if data.name is not None:
        recipient.name = data.name
    if data.email is not None:
        recipient.email = data.email
    if data.document is not None:
        recipient.document = data.document
    if data.pix_key is not None:
        recipient.pix_key = data.pix_key
    if data.pix_key_type is not None:
        recipient.pix_key_type = data.pix_key_type
    if data.crypto_wallet is not None:
        recipient.crypto_wallet = data.crypto_wallet
    if data.crypto_network is not None:
        recipient.crypto_network = data.crypto_network
    if data.external_recipient_id is not None:
        recipient.external_recipient_id = data.external_recipient_id
    if data.default_percentage is not None:
        if data.default_percentage < 0 or data.default_percentage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A porcentagem de split deve estar entre 0% e 100%."
            )
        recipient.default_percentage = data.default_percentage
    if data.is_active is not None:
        recipient.is_active = data.is_active

    db.commit()
    db.refresh(recipient)
    logger.info(f"Recebedor de split ID {recipient.id} atualizado com sucesso.")
    return recipient

@router.delete("/{recipient_id}")
def delete_split_recipient(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Remove um recebedor de split."""
    recipient = db.query(SplitRecipient).filter(SplitRecipient.id == recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recebedor de split não encontrado."
        )

    db.delete(recipient)
    db.commit()
    logger.info(f"Recebedor de split ID {recipient_id} excluído com sucesso.")
    return {"message": "Recebedor de split excluído com sucesso."}
