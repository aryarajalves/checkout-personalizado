import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.gateway import GatewaySetting, SplitRecipient
from app.models.product import Product, ProductSplitRule
from app.models.coupon import Coupon
from app.models.order import Order
from app.schemas.order import CheckoutProcessRequest
from app.services.checkout_service import process_checkout

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    superadmin = User(
        email=settings.SUPERADMIN_EMAIL,
        name=settings.SUPERADMIN_NAME,
        hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
        role="superadmin",
        is_active=True
    )
    db.add(superadmin)

    gw = GatewaySetting(
        gateway_name="pagarme",
        is_active=True,
        environment="sandbox",
        api_key="sk_test_placeholder_key",
        public_key="pk_test_12345"
    )
    db.add(gw)

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def auth_headers():
    client = TestClient(app)
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_product_crud_with_payment_discounts(auth_headers):
    client = TestClient(app)
    
    # 1. Cria produto com descontos por método
    res = client.post(
        f"{settings.API_V1_STR}/products",
        headers=auth_headers,
        json={
            "name": "Mentoria Vip",
            "slug": "mentoria-vip",
            "price_brl": 500.0,
            "price_usd": 100.0,
            "pix_discount_percent": 10.0,
            "crypto_discount_percent": 15.0
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["pix_discount_percent"] == 10.0
    assert data["crypto_discount_percent"] == 15.0
    prod_id = data["id"]

    # 2. Atualiza os descontos
    res_update = client.put(
        f"{settings.API_V1_STR}/products/{prod_id}",
        headers=auth_headers,
        json={
            "pix_discount_percent": 5.0,
            "crypto_discount_percent": 20.0
        }
    )
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["pix_discount_percent"] == 5.0
    assert updated_data["crypto_discount_percent"] == 20.0

@patch("app.services.checkout_service.pagarme_service.create_pix_charge")
def test_checkout_pix_discount_and_split(mock_create_pix):
    mock_create_pix.return_value = {
        "external_transaction_id": "ch_mock_pix_123",
        "qr_code_text": "00020126580014br.gov.bcb.pix...",
        "qr_code_base64": "data:image/svg+xml;base64,PHN2Zy...",
        "expires_at": None
    }

    db = TestingSessionLocal()
    # Cria produto com 10% de desconto no Pix e preço R$ 200,00
    product = Product(
        name="Curso Master",
        slug="curso-master",
        price_brl=200.0,
        price_usd=40.0,
        pix_discount_percent=10.0,
        crypto_discount_percent=5.0,
        is_active=True
    )
    db.add(product)
    db.flush()

    # Adiciona co-produtor com split de 50%
    recipient = SplitRecipient(
        name="Coprodutor Carlos",
        email="carlos@coprod.com",
        document="12345678901",
        pix_key="carlos@pix.com",
        pix_key_type="email",
        is_active=True
    )
    db.add(recipient)
    db.flush()

    rule = ProductSplitRule(
        product_id=product.id,
        recipient_id=recipient.id,
        percentage=50.0
    )
    db.add(rule)
    db.commit()

    # Executa checkout no Pix
    req = CheckoutProcessRequest(
        slug=product.slug,
        name="Aluno Comprador",
        email="aluno@teste.com",
        phone="11999998888",
        payment_method="pix"
    )

    res = process_checkout(db, req)
    assert res.status == "pending"

    order = db.query(Order).filter(Order.product_id == product.id).first()
    assert order is not None

    # Preço original: 200.00
    # Desconto Pix (10%): 20.00
    # Valor final: 180.00
    assert order.amount_brl == 180.0
    assert order.original_amount_brl == 200.0
    assert order.discount_amount_brl == 20.0

    # Verifica split recalculado sobre os 180.00 (50% = 90.00)
    assert len(order.splits) == 1
    split_entry = order.splits[0]
    assert split_entry.amount_brl == 90.0
    assert split_entry.recipient_id == recipient.id

    db.close()

def test_checkout_card_does_not_receive_pix_discount():
    db = TestingSessionLocal()
    product = Product(
        name="Livro Digital",
        slug="livro-digital",
        price_brl=100.0,
        pix_discount_percent=15.0, # 15% apenas no Pix
        crypto_discount_percent=0.0,
        is_active=True
    )
    db.add(product)
    db.commit()

    # Checkout com Cartão de Crédito
    req = CheckoutProcessRequest(
        slug=product.slug,
        name="Comprador Cartao",
        email="cartao@teste.com",
        phone="11999997777",
        payment_method="credit_card",
        card_number="4111111111111111",
        card_holder="COMPRADOR CARTAO",
        card_expiry="12/28",
        card_cvv="123",
        installments=1
    )

    res = process_checkout(db, req)
    assert res.status == "paid"

    order = db.query(Order).filter(Order.product_id == product.id).first()
    assert order.amount_brl == 100.0
    assert order.discount_amount_brl == 0.0
    assert order.original_amount_brl is None

    db.close()

@patch("app.services.checkout_service.NowPaymentsService.create_crypto_payment")
def test_checkout_crypto_discount(mock_create_crypto):
    mock_create_crypto.return_value = {
        "status": "pending",
        "payment_id": "np_pay_123",
        "pay_address": "0x1234567890abcdef1234567890abcdef12345678",
        "pay_amount": 17.0,
        "pay_currency": "USDT",
        "network": "polygon"
    }

    db = TestingSessionLocal()
    product = Product(
        name="Crypto Pass",
        slug="crypto-pass",
        price_brl=100.0,
        price_usd=20.0,
        pix_discount_percent=0.0,
        crypto_discount_percent=15.0, # 15% em Cripto
        is_active=True
    )
    db.add(product)
    db.commit()

    req = CheckoutProcessRequest(
        slug=product.slug,
        name="Web3 Buyer",
        email="web3@teste.com",
        phone="11988887777",
        payment_method="crypto",
        crypto_currency="USDT",
        crypto_network="polygon"
    )

    res = process_checkout(db, req)
    assert res.status == "pending"

    order = db.query(Order).filter(Order.product_id == product.id).first()
    # 20.00 USD - 15% (3.00 USD) = 17.00 USD
    assert order.amount_usd == 17.0
    assert order.original_amount_usd == 20.0
    assert order.discount_amount_usd == 3.0
    # BRL também proporcional: 100.00 - 15% (15.00) = 85.00
    assert order.amount_brl == 85.0

    db.close()

@patch("app.services.checkout_service.pagarme_service.create_pix_charge")
def test_checkout_coupon_plus_pix_discount(mock_create_pix):
    mock_create_pix.return_value = {
        "external_transaction_id": "ch_mock_pix_coupon",
        "qr_code_text": "00020126580014br.gov.bcb.pix...",
        "qr_code_base64": "data:image/svg+xml;base64,PHN2Zy...",
        "expires_at": None
    }

    db = TestingSessionLocal()
    product = Product(
        name="Combo Especial",
        slug="combo-especial",
        price_brl=100.0,
        pix_discount_percent=10.0,
        is_active=True
    )
    db.add(product)

    coupon = Coupon(
        code="PROMO10",
        discount_percent=10.0, # 10% do cupom
        product_id=None,
        is_active=True
    )
    db.add(coupon)
    db.commit()

    # Preço: 100.00
    # Cupom 10% -> 90.00 (desconto 10.00)
    # Pix 10% sobre 90.00 -> 81.00 (desconto adicional de 9.00)
    # Desconto total acumulado = 19.00
    req = CheckoutProcessRequest(
        slug=product.slug,
        name="Cliente Fiel",
        email="fiel@teste.com",
        phone="11977776666",
        payment_method="pix",
        coupon_code="PROMO10"
    )

    res = process_checkout(db, req)
    assert res.status == "pending"

    order = db.query(Order).filter(Order.product_id == product.id).first()
    assert order.amount_brl == 81.0
    assert order.original_amount_brl == 100.0
    assert order.discount_amount_brl == 19.0
    assert order.coupon_code == "PROMO10"

    db.close()
