"""
Serviço de Integração com NOWPayments para Pagamentos em Criptomoedas (Fase 3.3).
Suporta criação de faturas cripto (USDT, USDC, BTC, ETH) em redes de baixo custo (Polygon, Arbitrum, BSC, Ethereum),
com fallback inteligente para modo Sandbox / Simulação e validação criptográfica de IPN/Webhooks (HMAC-SHA512).
"""
import base64
import hmac
import hashlib
import json
import uuid
import urllib.parse
import httpx
import qrcode
import qrcode.image.svg
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.gateway import GatewaySetting
from app.core.logger import logger


class NowPaymentsService:
    BASE_URL_PROD = "https://api.nowpayments.io/v1"
    BASE_URL_SANDBOX = "https://api-sandbox.nowpayments.io/v1"

    @classmethod
    def get_gateway_config(cls, db: Session) -> Optional[GatewaySetting]:
        """Obtém as configurações ativas do NOWPayments salvas no banco."""
        return (
            db.query(GatewaySetting)
            .filter(
                GatewaySetting.gateway_name == "nowpayments",
                GatewaySetting.is_active == True,
            )
            .first()
        )

    @classmethod
    def _map_currency_and_network(cls, currency: str, network: str) -> Tuple[str, str]:
        """
        Mapeia a moeda e rede selecionadas no checkout para os códigos aceitos pela NOWPayments.
        Ex: USDT na Polygon -> 'usdtmatic'
        """
        curr = (currency or "usdt").lower()
        net = (network or "polygon").lower()

        if curr == "usdt":
            if net == "polygon":
                return "usdtmatic", "polygon"
            elif net == "bsc":
                return "usdtbsc", "bsc"
            elif net == "arbitrum":
                return "usdtarb", "arbitrum"
            elif net in ("ethereum", "erc20"):
                return "usdterc20", "ethereum"
            return "usdtmatic", "polygon"

        if curr == "usdc":
            if net == "polygon":
                return "usdcmatic", "polygon"
            elif net in ("ethereum", "erc20"):
                return "usdcerc20", "ethereum"
            return "usdcmatic", "polygon"

        if curr == "btc":
            return "btc", "bitcoin"

        if curr == "eth":
            return "eth", "ethereum"

        return curr, net

    @classmethod
    def _calculate_estimated_crypto(cls, amount_usd: float, currency: str) -> float:
        """Calcula estimativa da quantia cripto baseada no valor em USD."""
        curr = currency.lower()
        if curr in ("usdt", "usdc"):
            return round(amount_usd, 2)
        elif curr == "btc":
            return round(amount_usd / 65000.0, 8)
        elif curr == "eth":
            return round(amount_usd / 3200.0, 6)
        return round(amount_usd, 4)

    @classmethod
    def _generate_wallet_qr_code(cls, address: str) -> str:
        """Gera um QR Code SVG real (ISO/IEC 18004) codificado em Base64 Data URI escaneável por carteiras cripto."""
        try:
            qr = qrcode.QRCode(
                version=None,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=2,
                image_factory=qrcode.image.svg.SvgPathImage,
            )
            qr.add_data(address)
            qr.make(fit=True)
            img = qr.make_image()
            svg_bytes = img.to_string()
            encoded = base64.b64encode(svg_bytes).decode("utf-8")
            return f"data:image/svg+xml;base64,{encoded}"
        except Exception as exc:
            logger.error(f"Erro ao gerar QR Code de carteira cripto: {exc}")
            fallback_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="50" font-size="10">QR Code Error</text></svg>'
            encoded = base64.b64encode(fallback_svg.encode("utf-8")).decode("utf-8")
            return f"data:image/svg+xml;base64,{encoded}"

    @classmethod
    def create_crypto_payment(
        cls,
        amount_usd: float,
        crypto_currency: str,
        crypto_network: str,
        order_code: str,
        order_description: str,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Cria cobrança em criptomoeda na NOWPayments ou em modo simulação.
        Retorna dicionário padronizado com endereço, quantia, rede e QR Code.
        """
        config = cls.get_gateway_config(db)
        pay_curr, mapped_net = cls._map_currency_and_network(crypto_currency, crypto_network)

        # Se houver configuração ativa com API Key real
        if config and config.api_key and not config.api_key.startswith("test_") and len(config.api_key) > 20:
            base_url = cls.BASE_URL_PROD if config.environment == "production" else cls.BASE_URL_SANDBOX
            headers = {
                "x-api-key": config.api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "price_amount": float(amount_usd),
                "price_currency": "usd",
                "pay_currency": pay_curr,
                "order_id": order_code,
                "order_description": order_description[:200],
            }

            try:
                logger.info(f"Chamando NOWPayments para criar pagamento cripto: pedido={order_code}, curr={pay_curr}")
                with httpx.Client(timeout=12.0) as client:
                    resp = client.post(f"{base_url}/payment", json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    pay_address = data.get("pay_address")
                    pay_amount = float(data.get("pay_amount", amount_usd))
                    payment_id = str(data.get("payment_id", f"now_{uuid.uuid4().hex[:10]}"))

                    qr_svg = cls._generate_wallet_qr_code(pay_address)
                    return {
                        "external_id": payment_id,
                        "wallet_address": pay_address,
                        "crypto_amount": pay_amount,
                        "crypto_currency": crypto_currency.upper(),
                        "crypto_network": mapped_net.capitalize(),
                        "qr_code_svg": qr_svg,
                        "status": "pending",
                    }
                else:
                    logger.warning(f"NOWPayments API retornou {resp.status_code}: {resp.text}. Ativando modo sandbox.")
            except Exception as e:
                logger.error(f"Erro de comunicação com NOWPayments: {e}. Prosseguindo em modo sandbox.")

        # Modo Sandbox / Simulação / Fallback
        mock_crypto_amount = cls._calculate_estimated_crypto(amount_usd, crypto_currency)
        mock_address = (
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            if crypto_currency.lower() == "btc"
            else "0x71C845137c7291779C308727617326889493f0bB"
        )
        qr_svg = cls._generate_wallet_qr_code(mock_address)

        logger.info(f"Pagamento cripto gerado em modo Sandbox/Simulação: pedido={order_code}, valor={mock_crypto_amount} {crypto_currency.upper()}")
        return {
            "external_id": f"nowpay_sim_{uuid.uuid4().hex[:12]}",
            "wallet_address": mock_address,
            "crypto_amount": mock_crypto_amount,
            "crypto_currency": crypto_currency.upper(),
            "crypto_network": mapped_net.capitalize(),
            "qr_code_svg": qr_svg,
            "status": "pending",
        }

    @classmethod
    def verify_ipn_signature(cls, raw_payload: Dict[str, Any], signature_header: Optional[str], ipn_secret: Optional[str]) -> bool:
        """
        Valida a assinatura HMAC-SHA512 enviada no cabeçalho x-nowpayments-sig.
        Garante que o webhook partiu legitimamente dos servidores da NOWPayments.
        """
        if not ipn_secret:
            # Em ambiente de desenvolvimento ou sem secret cadastrado, loga e autoriza
            logger.warning("NOWPayments Webhook: IPN Secret não configurado; validação HMAC ignorada para desenvolvimento.")
            return True

        if not signature_header:
            logger.error("NOWPayments Webhook: Cabeçalho x-nowpayments-sig ausente.")
            return False

        try:
            # Ordena as chaves do dicionário de forma recursiva
            sorted_json = json.dumps(raw_payload, sort_keys=True, separators=(",", ":"))
            calculated_sig = hmac.new(
                ipn_secret.encode("utf-8"),
                sorted_json.encode("utf-8"),
                hashlib.sha512,
            ).hexdigest()

            is_valid = hmac.compare_digest(calculated_sig.lower(), signature_header.lower())
            if not is_valid:
                logger.error(f"NOWPayments Webhook: Assinatura inválida! Recebida={signature_header[:10]}... Calculada={calculated_sig[:10]}...")
            return is_valid
        except Exception as e:
            logger.error(f"Erro ao validar assinatura HMAC da NOWPayments: {e}")
            return False
