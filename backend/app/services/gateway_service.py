"""
Serviço de gerenciamento e validação de Gateways de Pagamento (Pagar.me, Asaas, NOWPayments).
"""
from typing import List, Optional
import httpx
from sqlalchemy.orm import Session

from app.core.logger import logger
from app.models.gateway import GatewaySetting, SplitRecipient
from app.schemas.gateway import (
    GatewaySettingUpdate,
    GatewaySettingResponse,
    GatewayTestConnectionRequest,
    GatewayTestConnectionResponse
)

SUPPORTED_GATEWAYS = ["pagarme", "asaas", "nowpayments"]

def mask_secret(secret: Optional[str]) -> Optional[str]:
    """Mascara chaves sensíveis preservando prefixo e sufixo para segurança."""
    if not secret:
        return None
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}****{secret[-4:]}"

def get_all_gateways(db: Session) -> List[GatewaySettingResponse]:
    """Retorna o status de todos os gateways suportados no sistema."""
    settings_in_db = {s.gateway_name: s for s in db.query(GatewaySetting).all()}
    result = []

    for name in SUPPORTED_GATEWAYS:
        s = settings_in_db.get(name)
        if s:
            result.append(
                GatewaySettingResponse(
                    id=s.id,
                    gateway_name=s.gateway_name,
                    is_active=s.is_active,
                    environment=s.environment,
                    api_key_masked=mask_secret(s.api_key),
                    public_key=s.public_key,
                    webhook_secret_masked=mask_secret(s.webhook_secret),
                    merchant_id=s.merchant_id,
                    is_configured=bool(s.api_key),
                    created_at=s.created_at,
                    updated_at=s.updated_at
                )
            )
        else:
            result.append(
                GatewaySettingResponse(
                    id=None,
                    gateway_name=name,
                    is_active=False,
                    environment="sandbox",
                    api_key_masked=None,
                    public_key=None,
                    webhook_secret_masked=None,
                    merchant_id=None,
                    is_configured=False,
                    created_at=None,
                    updated_at=None
                )
            )
    return result

def save_gateway_setting(db: Session, data: GatewaySettingUpdate) -> GatewaySettingResponse:
    """Cria ou atualiza as configurações do gateway."""
    setting = db.query(GatewaySetting).filter(GatewaySetting.gateway_name == data.gateway_name).first()
    if not setting:
        setting = GatewaySetting(gateway_name=data.gateway_name)
        db.add(setting)

    setting.is_active = data.is_active
    setting.environment = data.environment

    # Só atualiza a chave se não for a máscara "****"
    if data.api_key and "****" not in data.api_key:
        setting.api_key = data.api_key
    elif data.api_key == "":
        setting.api_key = None

    if data.public_key is not None:
        setting.public_key = data.public_key if data.public_key != "" else None

    if data.webhook_secret and "****" not in data.webhook_secret:
        setting.webhook_secret = data.webhook_secret
    elif data.webhook_secret == "":
        setting.webhook_secret = None

    if data.merchant_id is not None:
        setting.merchant_id = data.merchant_id if data.merchant_id != "" else None

    db.commit()
    db.refresh(setting)

    logger.info(f"Configurações do gateway '{setting.gateway_name}' atualizadas com sucesso. Ativo: {setting.is_active}, Modo: {setting.environment}")

    return GatewaySettingResponse(
        id=setting.id,
        gateway_name=setting.gateway_name,
        is_active=setting.is_active,
        environment=setting.environment,
        api_key_masked=mask_secret(setting.api_key),
        public_key=setting.public_key,
        webhook_secret_masked=mask_secret(setting.webhook_secret),
        merchant_id=setting.merchant_id,
        is_configured=bool(setting.api_key),
        created_at=setting.created_at,
        updated_at=setting.updated_at
    )

def test_gateway_connection(data: GatewayTestConnectionRequest, db: Session) -> GatewayTestConnectionResponse:
    """Testa a conectividade e autenticação com o gateway selecionado."""
    # Resolve api_key
    api_key = data.api_key
    if not api_key or "****" in api_key:
        setting = db.query(GatewaySetting).filter(GatewaySetting.gateway_name == data.gateway_name).first()
        if setting and setting.api_key:
            api_key = setting.api_key

    if not api_key:
        return GatewayTestConnectionResponse(
            success=False,
            message="Chave de API não informada. Forneça uma chave de API para testar."
        )

    environment = data.environment or "sandbox"

    try:
        if data.gateway_name == "pagarme":
            # Pagar.me v5 API check
            url = "https://api.pagar.me/core/v5/orders?page=1&size=1"
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, auth=(api_key, ""))
                if res.status_code == 401:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message="Falha de autenticação no Pagar.me. Verifique sua Chave Secreta (Secret Key)."
                    )
                elif res.status_code in [200, 400]:
                    return GatewayTestConnectionResponse(
                        success=True,
                        message="Conexão com Pagar.me estabelecida com sucesso! Credenciais válidas.",
                        details={"status_code": res.status_code}
                    )
                else:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message=f"Pagar.me retornou status {res.status_code}: {res.text[:200]}"
                    )

        elif data.gateway_name == "asaas":
            base_url = "https://sandbox.asaas.com/api/v3" if environment == "sandbox" else "https://api.asaas.com/api/v3"
            url = f"{base_url}/customers?limit=1"
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, headers={"access_token": api_key})
                if res.status_code == 200:
                    return GatewayTestConnectionResponse(
                        success=True,
                        message=f"Conexão com Asaas ({environment.upper()}) estabelecida com sucesso! API Key válida.",
                        details={"status_code": res.status_code}
                    )
                elif res.status_code == 401:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message="Falha de autenticação no Asaas. Verifique sua chave de API (access_token)."
                    )
                else:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message=f"Asaas retornou status {res.status_code}: {res.text[:200]}"
                    )

        elif data.gateway_name == "nowpayments":
            base_url = "https://api-sandbox.nowpayments.io/v1" if environment == "sandbox" else "https://api.nowpayments.io/v1"
            url = f"{base_url}/status"
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, headers={"x-api-key": api_key})
                if res.status_code == 200:
                    return GatewayTestConnectionResponse(
                        success=True,
                        message=f"Conexão com NOWPayments ({environment.upper()}) bem-sucedida! Servidores operacionais."
                    )
                elif res.status_code in [401, 403]:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message="Chave de API do NOWPayments inválida."
                    )
                else:
                    return GatewayTestConnectionResponse(
                        success=False,
                        message=f"NOWPayments retornou status {res.status_code}: {res.text[:200]}"
                    )

        return GatewayTestConnectionResponse(
            success=False,
            message=f"Gateway '{data.gateway_name}' não suportado para teste automatizado."
        )

    except httpx.TimeoutException:
        logger.error(f"Timeout ao testar conexão com gateway {data.gateway_name}")
        return GatewayTestConnectionResponse(
            success=False,
            message="Tempo limite esgotado ao comunicar com o servidor do gateway. Tente novamente."
        )
    except Exception as e:
        logger.error(f"Erro inesperado ao testar conexão com gateway {data.gateway_name}: {e}")
        return GatewayTestConnectionResponse(
            success=False,
            message=f"Erro ao testar gateway: {str(e)}"
        )
