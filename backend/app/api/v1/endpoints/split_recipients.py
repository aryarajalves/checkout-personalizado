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
    """Lista todos os recebedores cadastrados para o split de pagamentos."""
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

    recipient = SplitRecipient(
        name=data.name,
        email=data.email,
        document=data.document,
        pix_key=data.pix_key,
        pix_key_type=data.pix_key_type,
        crypto_wallet=data.crypto_wallet,
        crypto_network=data.crypto_network,
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
