"""
Endpoints para Gerenciamento de Gateways de Pagamento (Pagar.me, Asaas, NOWPayments).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.v1.endpoints.users import require_admin_or_superadmin
from app.schemas.gateway import (
    GatewaySettingUpdate,
    GatewaySettingResponse,
    GatewayTestConnectionRequest,
    GatewayTestConnectionResponse
)
from app.services.gateway_service import (
    get_all_gateways,
    save_gateway_setting,
    test_gateway_connection
)

router = APIRouter(prefix="/gateways", tags=["Gateways de Pagamento"])

@router.get("", response_model=List[GatewaySettingResponse])
def list_gateways(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Lista todos os gateways suportados e o status das credenciais salvas."""
    return get_all_gateways(db)

@router.post("", response_model=GatewaySettingResponse)
def update_gateway(
    data: GatewaySettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Atualiza ou salva as credenciais e ambiente (Sandbox/Produção) de um gateway."""
    return save_gateway_setting(db, data)

@router.post("/test-connection", response_model=GatewayTestConnectionResponse)
def test_connection(
    data: GatewayTestConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    """Realiza um teste de comunicação com a API do gateway para validar as credenciais."""
    return test_gateway_connection(data, db)
