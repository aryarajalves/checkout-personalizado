from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

class CheckoutProcessRequest(BaseModel):
    slug: str = Field(..., min_length=2, description="Slug do produto ou da oferta")
    name: str = Field(..., min_length=3, max_length=150, description="Nome do comprador")
    email: EmailStr = Field(..., description="E-mail do comprador")
    phone: str = Field(..., min_length=6, max_length=30, description="WhatsApp ou celular")
    phone_ddi: Optional[str] = Field("55", description="DDI do país (ex: '55', '351', '1')")
    cpf: Optional[str] = Field(None, description="CPF do comprador se exigido")
    payment_method: str = Field("pix", description="'pix', 'credit_card' ou 'crypto'")

    # Dados do Cartão (se payment_method == 'credit_card')
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    card_expiry: Optional[str] = None
    card_cvv: Optional[str] = None
    installments: Optional[int] = Field(1, ge=1, le=12)
    card_installments: Optional[int] = Field(None, ge=1, le=12)

    # Dados de Criptomoeda (se payment_method == 'crypto')
    crypto_currency: Optional[str] = None
    crypto_network: Optional[str] = None

    # Dados de Pagamento Híbrido ('hybrid_pix_card' ou 'hybrid_two_cards')
    hybrid_type: Optional[str] = None # 'pix_card', 'two_cards'
    pix_amount_brl: Optional[float] = None
    card_amount_brl: Optional[float] = None
    card2_amount_brl: Optional[float] = None
    card2_number: Optional[str] = None
    card2_holder: Optional[str] = None
    card2_expiry: Optional[str] = None
    card2_cvv: Optional[str] = None
    card2_installments: Optional[int] = Field(1, ge=1, le=12)

    # Order Bumps selecionados
    bump_ids: Optional[List[int]] = None

    # Cupom de desconto
    coupon_code: Optional[str] = None

    # Afiliado
    affiliate_code: Optional[str] = None

    # Parâmetros UTM e Rastreamento de Tráfego
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    src: Optional[str] = None
    sck: Optional[str] = None

    # Proposta Personalizada (High-Ticket / Closer)
    proposal_code: Optional[str] = None


class OrderSplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recipient_id: int
    recipient_name: str
    percentage: float
    amount_brl: float


class OrderPaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    part_number: int
    payment_method: str
    amount_brl: float
    installments: int = 1
    status: str # 'pending', 'paid', 'failed'
    external_transaction_id: Optional[str] = None
    qr_code_base64: Optional[str] = None
    qr_code_text: Optional[str] = None
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    paid_at: Optional[datetime] = None


class CheckoutProcessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    order_code: str
    status: str
    payment_method: str
    hybrid_type: Optional[str] = None
    amount_brl: float
    amount_usd: Optional[float] = None
    paid_amount_brl: Optional[float] = 0.0
    remaining_amount_brl: Optional[float] = 0.0
    payments: List[OrderPaymentResponse] = []
    coupon_code: Optional[str] = None
    discount_amount_brl: Optional[float] = 0.0
    discount_amount_usd: Optional[float] = 0.0
    original_amount_brl: Optional[float] = None
    original_amount_usd: Optional[float] = None
    affiliate_code: Optional[str] = None
    affiliate_commission_brl: Optional[float] = 0.0
    qr_code_base64: Optional[str] = None
    qr_code_text: Optional[str] = None
    crypto_wallet_address: Optional[str] = None
    crypto_network: Optional[str] = None
    crypto_currency: Optional[str] = None
    crypto_amount: Optional[float] = None
    expires_at: Optional[datetime] = None
    splits: List[OrderSplitResponse] = []
    thank_you_url: Optional[str] = None
    subscription_code: Optional[str] = None
    proposal_code: Optional[str] = None


class OrderStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    order_code: str
    status: str
    hybrid_type: Optional[str] = None
    paid_at: Optional[datetime] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_phone_ddi: Optional[str] = None
    product_name: str
    payment_method: Optional[str] = None
    amount_brl: float
    amount_usd: Optional[float] = None
    paid_amount_brl: Optional[float] = 0.0
    remaining_amount_brl: Optional[float] = 0.0
    payments: List[OrderPaymentResponse] = []
    thank_you_url: Optional[str] = None
    has_upsell: bool = False
    upsell_url: Optional[str] = None
    proposal_code: Optional[str] = None
    external_transaction_id: Optional[str] = None
    crypto_wallet_address: Optional[str] = None
    crypto_network: Optional[str] = None
    crypto_currency: Optional[str] = None
    crypto_amount: Optional[float] = None
    coupon_code: Optional[str] = None
    discount_amount_brl: Optional[float] = 0.0
    discount_amount_usd: Optional[float] = 0.0
    original_amount_brl: Optional[float] = None
    original_amount_usd: Optional[float] = None


class Web3PaymentConfirmRequest(BaseModel):
    tx_hash: str = Field(..., min_length=6, description="Hash da transação assinada na MetaMask/Web3")
    sender_address: Optional[str] = Field(None, description="Endereço da carteira do comprador")

