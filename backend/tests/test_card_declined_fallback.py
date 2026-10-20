import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.models.security import CardAttemptLog
from app.core.security import create_access_token

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

@pytest.fixture(scope="function", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def create_test_product(db, **kwargs):
    defaults = {
        "name": "Curso de Tráfego Avançado",
        "slug": "curso-trafego",
        "price_brl": 100.0,
        "is_active": True,
        "payment_methods": "all",
        "enable_card_fallback": True,
        "card_fallback_discount_percent": 10.0,
        "pix_discount_percent": 0.0,
    }
    defaults.update(kwargs)
    product = Product(**defaults)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def get_auth_headers(db):
    user = User(
        email="producer@test.com",
        name="Produtor Teste",
        hashed_password="fakehashedpassword",
        role="producer",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

def test_card_declined_raises_402_and_logs_attempt():
    db = TestingSessionLocal()
    prod = create_test_product(db)

    payload = {
        "slug": prod.slug,
        "name": "Comprador Cartão Negado",
        "email": "negado@teste.com",
        "phone": "11988887777",
        "cpf": "12345678909",
        "payment_method": "credit_card",
        "card_number": "4000000000000002",  # Final 0002 simula cartão recusado
        "card_holder": "Comprador Negado",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 402
    data = res.json()
    assert "recusado" in data["detail"].lower()
    assert res.headers.get("X-Error-Code") == "card_declined"

    # Verifica log de tentativa registrada como 'declined'
    log = db.query(CardAttemptLog).filter(CardAttemptLog.email == "negado@teste.com").first()
    assert log is not None
    assert log.status == "declined"
    assert log.reason == "card_declined"
    db.close()

def test_valid_card_payment_succeeds_normally():
    db = TestingSessionLocal()
    prod = create_test_product(db)

    payload = {
        "slug": prod.slug,
        "name": "Comprador Aprovado",
        "email": "aprovado@teste.com",
        "phone": "11988887777",
        "cpf": "12345678909",
        "payment_method": "credit_card",
        "card_number": "4000000000004242",  # Cartão válido padrão de teste
        "card_holder": "Comprador Aprovado",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "paid"
    assert data["order_code"].startswith("ORD-")

    log = db.query(CardAttemptLog).filter(CardAttemptLog.email == "aprovado@teste.com").first()
    assert log is not None
    assert log.status == "approved"
    db.close()

def test_pix_fallback_discount_applied():
    db = TestingSessionLocal()
    prod = create_test_product(db, price_brl=200.0, card_fallback_discount_percent=15.0)

    # Cliente caiu no fallback de cartão e optou por Pix com desconto de recuperação
    payload = {
        "slug": prod.slug,
        "name": "Cliente Fallback Pix",
        "email": "fallback@teste.com",
        "phone": "11988887777",
        "payment_method": "pix",
        "card_fallback_applied": True
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["payment_method"] == "pix"
    # R$ 200 - 15% (R$ 30) = R$ 170
    assert data["amount_brl"] == 170.0
    assert data["discount_amount_brl"] == 30.0
    assert data["original_amount_brl"] == 200.0
    db.close()

def test_hybrid_payment_card_declined():
    db = TestingSessionLocal()
    prod = create_test_product(db, price_brl=200.0)

    payload = {
        "slug": prod.slug,
        "name": "Cliente Híbrido Negado",
        "email": "hibrido@teste.com",
        "phone": "11988887777",
        "payment_method": "hybrid_pix_card",
        "pix_amount_brl": 100.0,
        "card_amount_brl": 100.0,
        "card_number": "4000000000000002",  # Cartão recusado
        "card_holder": "DECLINE TEST",
        "card_expiry": "12/28",
        "card_cvv": "123"
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 402
    assert res.headers.get("X-Error-Code") == "card_declined"
    db.close()

def test_product_conversion_config_update_card_fallback():
    db = TestingSessionLocal()
    headers = get_auth_headers(db)
    prod = create_test_product(db)

    # 1. Obter config atual
    res = client.get(f"/api/v1/products/{prod.id}/conversion", headers=headers)
    assert res.status_code == 200
    cfg = res.json()
    assert cfg["enable_card_fallback"] is True
    assert cfg["card_fallback_discount_percent"] == 10.0

    # 2. Atualizar config
    update_payload = {
        "enable_exit_intent": False,
        "enable_social_proof": False,
        "social_proof_mode": "hybrid",
        "enable_card_fallback": True,
        "card_fallback_discount_percent": 20.0
    }
    res_up = client.put(f"/api/v1/products/{prod.id}/conversion", json=update_payload, headers=headers)
    assert res_up.status_code == 200
    updated_cfg = res_up.json()
    assert updated_cfg["enable_card_fallback"] is True
    assert updated_cfg["card_fallback_discount_percent"] == 20.0

    # 3. Verificar persistência no banco
    db.refresh(prod)
    assert prod.card_fallback_discount_percent == 20.0
    db.close()
