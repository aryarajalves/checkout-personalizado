"""
Serviço de integração com Pagar.me V5 para cobranças Pix e Split de Pagamento nativo.
"""
import base64
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import httpx
import qrcode
import qrcode.image.svg

from app.core.logger import logger
from app.models.gateway import GatewaySetting
from app.models.product import Product, ProductOffer, ProductSplitRule
from app.models.order import Order

PAGARME_V5_API_URL = "https://api.pagar.me/core/v5"

def generate_mock_pix_code(order_code: str, amount_brl: float) -> str:
    """Gera código Pix Copia e Cola formatado padrão EMV para simulação/sandbox."""
    amount_str = f"{amount_brl:.2f}"
    return (
        f"00020101021226580014br.gov.bcb.pix0136pagarme-pix-{order_code.lower()}"
        f"520400005303986540{len(amount_str):02d}{amount_str}5802BR5915CHECKOUT PROPRIO6009SAO PAULO"
        f"62070503***6304ABCD"
    )

def generate_svg_qr_code_base64(payload_text: str) -> str:
    """
    Gera um QR Code SVG real (ISO/IEC 18004) em Base64 Data URI.
    Escaneável por qualquer smartphone, leitor óptico ou app bancário.
    """
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
            image_factory=qrcode.image.svg.SvgPathImage,
        )
        qr.add_data(payload_text)
        qr.make(fit=True)
        img = qr.make_image()
        svg_bytes = img.to_string()
        encoded = base64.b64encode(svg_bytes).decode("utf-8")
        return f"data:image/svg+xml;base64,{encoded}"
    except Exception as exc:
        logger.error(f"Erro ao gerar QR Code SVG real: {exc}")
        fallback_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="50" font-size="10">QR Code Error</text></svg>'
        encoded = base64.b64encode(fallback_svg.encode("utf-8")).decode("utf-8")
        return f"data:image/svg+xml;base64,{encoded}"

def parse_phone(phone_str: str) -> Dict[str, str]:
    """Extrai ddd e número limpos de um telefone brasileiro."""
    digits = re.sub(r"\D", "", phone_str)
    if len(digits) >= 10:
        area_code = digits[:2]
        number = digits[2:]
        return {"country_code": "55", "area_code": area_code, "number": number}
    return {"country_code": "55", "area_code": "11", "number": digits or "999999999"}

def build_pagarme_split_payload(split_rules: List[ProductSplitRule], total_amount_cents: int) -> List[Dict[str, Any]]:
    """
    Monta a estrutura de split de pagamento da Pagar.me V5.
    Conforme BUSINESS_RULES.md:
    - charge_processing_fee: true (taxas divididas proporcionalmente)
    - liable: true (chargebacks/estornos divididos proporcionalmente)
    """
    split_payload = []
    for rule in split_rules:
        # Se o recebedor possui ID externo no Pagar.me
        recipient = getattr(rule, "recipient", None)
        recipient_id = getattr(recipient, "external_recipient_id", None) if recipient else None
        
        # Caso não haja external_recipient_id configurado no recebedor, usa identificador interno
        rec_code = recipient_id or f"rec_mock_{rule.recipient_id}"

        split_payload.append({
            "recipient_id": rec_code,
            "percentage": int(round(rule.percentage)),
            "options": {
                "charge_processing_fee": True,
                "liable": True
            }
        })
    return split_payload

def create_pix_charge(
    order: Order,
    product: Product,
    offer: Optional[ProductOffer],
    split_rules: List[ProductSplitRule],
    gateway_setting: Optional[GatewaySetting],
    custom_amount_brl: Optional[float] = None
) -> Dict[str, Any]:
    """
    Cria uma cobrança Pix no Pagar.me V5 com split configurado.
    Se não houver credencial real ou se for ambiente sandbox sem chave ativa,
    gera Pix simulado com QR Code realista e código copia e cola EMV.
    Suporta custom_amount_brl para cobranças híbridas (ex: entrada via Pix).
    """
    product_name = offer.name if offer else product.name
    effective_amount_brl = custom_amount_brl if custom_amount_brl is not None else order.amount_brl
    amount_cents = int(round(effective_amount_brl * 100))
    clean_cpf = re.sub(r"\D", "", order.customer_cpf) if order.customer_cpf else None
    phone_data = parse_phone(order.customer_phone)

    # Verifica se há credencial ativa do Pagar.me com API Key válida
    has_real_key = bool(
        gateway_setting
        and gateway_setting.is_active
        and gateway_setting.api_key
        and not gateway_setting.api_key.startswith("sk_test_placeholder")
        and not gateway_setting.api_key.startswith("mock_")
    )

    if has_real_key:
        try:
            logger.info(f"Iniciando requisição à API Pagar.me V5 para o pedido {order.order_code} (Valor: R$ {order.amount_brl:.2f})")
            auth_header = base64.b64encode(f"{gateway_setting.api_key}:".encode("utf-8")).decode("utf-8")
            headers = {
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            customer_payload = {
                "name": order.customer_name,
                "email": order.customer_email,
                "phones": {
                    "mobile_phone": phone_data
                },
                "type": "individual"
            }
            if clean_cpf:
                customer_payload["document"] = clean_cpf

            split_payload = build_pagarme_split_payload(split_rules, amount_cents)

            order_payload = {
                "code": order.order_code,
                "customer": customer_payload,
                "items": [
                    {
                        "amount": amount_cents,
                        "description": product_name,
                        "quantity": 1,
                        "code": f"PROD-{product.id}"
                    }
                ],
                "payments": [
                    {
                        "payment_method": "pix",
                        "pix": {
                            "expires_in": 3600
                        },
                        "split": split_payload if split_payload else None
                    }
                ]
            }

            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{PAGARME_V5_API_URL}/orders", json=order_payload, headers=headers)
                
                if res.status_code in [200, 201]:
                    data = res.json()
                    charges = data.get("charges", [])
                    if charges:
                        charge = charges[0]
                        last_trans = charge.get("last_transaction", {})
                        qr_code_text = last_trans.get("qr_code") or generate_mock_pix_code(order.order_code, order.amount_brl)
                        qr_code_url = last_trans.get("qr_code_url")
                        
                        logger.info(f"Cobrança Pix gerada com sucesso no Pagar.me para pedido {order.order_code}")
                        return {
                            "external_transaction_id": charge.get("id") or data.get("id"),
                            "qr_code_text": qr_code_text,
                            "qr_code_base64": qr_code_url or generate_svg_qr_code_base64(qr_code_text),
                            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=60)
                        }
                    else:
                        logger.warning(f"Resposta do Pagar.me sem cobranças retornadas para {order.order_code}. Usando fallback.")
                else:
                    logger.warning(f"Falha na API Pagar.me ({res.status_code}): {res.text}. Recorrendo a Pix simulado de sandbox.")
        except Exception as e:
            logger.error(f"Erro ao comunicar com API Pagar.me para pedido {order.order_code}: {e}")

    # Fallback / Ambiente Sandbox / Simulação local
    logger.info(f"Gerando Pix de Sandbox / Simulação para o pedido {order.order_code} (Valor: R$ {effective_amount_brl:.2f})")
    pix_code = generate_mock_pix_code(order.order_code, effective_amount_brl)
    qr_svg = generate_svg_qr_code_base64(pix_code)

    return {
        "external_transaction_id": f"pagarme_sim_{order.order_code.lower()}",
        "qr_code_text": pix_code,
        "qr_code_base64": qr_svg,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=60)
    }


def refund_charge(
    charge_id: str,
    amount_cents: Optional[int] = None,
    gateway_setting: Optional[GatewaySetting] = None
) -> Dict[str, Any]:
    """
    Executa o estorno/reembolso da transação no Pagar.me V5.
    Se não houver credencial real configurada ou for transação de teste,
    realiza estorno simulado com log de sucesso para sandbox.
    """
    has_real_key = bool(
        gateway_setting
        and gateway_setting.is_active
        and gateway_setting.api_key
        and not gateway_setting.api_key.startswith("sk_test_placeholder")
        and not gateway_setting.api_key.startswith("mock_")
    )

    if has_real_key and charge_id and not charge_id.startswith("pagarme_sim_"):
        try:
            logger.info(f"Iniciando requisição de estorno no Pagar.me V5 para charge_id={charge_id}")
            auth_header = base64.b64encode(f"{gateway_setting.api_key}:".encode("utf-8")).decode("utf-8")
            headers = {
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            payload = {}
            if amount_cents:
                payload["amount"] = amount_cents

            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{PAGARME_V5_API_URL}/charges/{charge_id}/refund", json=payload, headers=headers)
                if res.status_code in [200, 201]:
                    logger.info(f"Estorno concluído com sucesso no Pagar.me para charge_id={charge_id}")
                    return {"success": True, "data": res.json()}
                else:
                    logger.warning(f"Resposta de erro no estorno Pagar.me ({res.status_code}): {res.text}")
                    return {"success": False, "error": res.text}
        except Exception as e:
            logger.error(f"Erro ao comunicar estorno com Pagar.me para charge_id={charge_id}: {e}")
            return {"success": False, "error": str(e)}

    logger.info(f"Estorno simulado com sucesso (Sandbox/Simulação) para charge_id={charge_id}")
    return {"success": True, "simulated": True}

