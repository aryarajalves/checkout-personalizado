"""
Testes unitários para o Link de Checkout Pré-Preenchido e Recuperação por Token (#2).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.coupon import Coupon
from app.models.product import Product, ProductOffer
from app.models.abandoned_cart import AbandonedCart
from app.services.recovery_service import build_recovery_url, list_abandoned_carts
from app.services.webhook_dispatcher_service import build_abandoned_cart_webhook_payload

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

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def db():
    database = TestingSessionLocal()
    try:
        yield database
    finally:
        database.close()


def test_build_recovery_url_with_all_params():
    cart = AbandonedCart(
        customer_name="Carlos Eduardo",
        customer_email="carlos@exemplo.com",
        customer_phone="11988887777",
        customer_phone_ddi="55",
        customer_cpf="12345678901",
        coupon_code="VIP20",
        recovery_token="tok_123456",
    )
    url = build_recovery_url("curso-python", cart)
    assert url is not None
    assert url.startswith("/pay/curso-python?")
    assert "name=Carlos+Eduardo" in url
    assert "email=carlos%40exemplo.com" in url
    assert "phone=11988887777" in url
    assert "cpf=12345678901" in url
    assert "coupon=VIP20" in url
    assert "recover=tok_123456" in url


def test_build_recovery_url_empty_slug():
    cart = AbandonedCart(customer_name="Teste")
    url = build_recovery_url("", cart)
    assert url is None


def test_cart_by_token_endpoint(db):
    product = Product(
        name="Mentoria VIP",
        slug="mentoria-vip-test",
        price_brl=997.0,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    cart = AbandonedCart(
        product_id=product.id,
        customer_name="Mariana Lima",
        customer_email="mariana@teste.com",
        customer_phone="21977778888",
        customer_phone_ddi="55",
        customer_cpf="98765432100",
        coupon_code="DESCONTO10",
        recovery_token="token_mariana_test_123",
        estimated_amount_brl=997.0,
        status="abandoned",
    )
    db.add(cart)
    db.commit()
    db.refresh(cart)

    response = client.get(f"/api/v1/recovery/cart-by-token/{cart.recovery_token}")
    assert response.status_code == 200
    data = response.json()
    assert data["customer_name"] == "Mariana Lima"
    assert data["customer_email"] == "mariana@teste.com"
    assert data["customer_phone"] == "21977778888"
    assert data["customer_cpf"] == "98765432100"
    assert data["coupon_code"] == "DESCONTO10"
    assert data["product_slug"] == "mentoria-vip-test"


def test_cart_by_token_not_found():
    response = client.get("/api/v1/recovery/cart-by-token/token_inexistente_999")
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"].lower()


def test_webhook_payload_contains_enriched_recovery_url(db):
    product = Product(
        name="Curso Master",
        slug="curso-master-test",
        price_brl=497.0,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    cart = AbandonedCart(
        product_id=product.id,
        customer_name="Lucas Rocha",
        customer_email="lucas@teste.com",
        customer_phone="31999991111",
        customer_phone_ddi="55",
        coupon_code="MASTER50",
        recovery_token="token_lucas_456",
        status="abandoned",
    )
    db.add(cart)
    db.commit()

    payload = build_abandoned_cart_webhook_payload(cart, db)
    rec_url = payload["cart"]["recovery_url"]
    assert rec_url.startswith("/pay/curso-master-test?")
    assert "name=Lucas+Rocha" in rec_url
    assert "email=lucas%40teste.com" in rec_url
    assert "coupon=MASTER50" in rec_url
