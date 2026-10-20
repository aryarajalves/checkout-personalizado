import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
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
        "name": "Mentoria High-Ticket VIP",
        "slug": "mentoria-vip",
        "price_brl": 997.0,
        "is_active": True,
        "payment_methods": "all",
        "require_billing_address": True,
        "enable_card_fallback": False,
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
        hashed_password="fakehash",
        name="Produtor Teste",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

def test_card_payment_fails_when_billing_address_is_missing():
    db = TestingSessionLocal()
    prod = create_test_product(db, require_billing_address=True)

    payload = {
        "slug": prod.slug,
        "name": "Carlos Silva",
        "email": "carlos@example.com",
        "phone": "11988887777",
        "payment_method": "credit_card",
        "card_number": "4111111111111111",
        "card_holder": "CARLOS SILVA",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1,
        # billing address ausente
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 400
    assert "Endereço de cobrança incompleto" in res.json()["detail"]
    assert "CEP" in res.json()["detail"]
    db.close()

def test_card_payment_succeeds_when_billing_address_is_provided():
    db = TestingSessionLocal()
    prod = create_test_product(db, require_billing_address=True)

    payload = {
        "slug": prod.slug,
        "name": "Carlos Silva",
        "email": "carlos@example.com",
        "phone": "11988887777",
        "payment_method": "credit_card",
        "card_number": "4111111111111111",
        "card_holder": "CARLOS SILVA",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1,
        "billing_zip_code": "01310-100",
        "billing_street": "Avenida Paulista",
        "billing_number": "1000",
        "billing_complement": "Apto 42",
        "billing_neighborhood": "Bela Vista",
        "billing_city": "São Paulo",
        "billing_state": "SP",
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] in ["paid", "pending"]

    # Verifica persistência no banco
    order = db.query(Order).filter(Order.order_code == data["order_code"]).first()
    assert order is not None
    assert order.billing_zip_code == "01310-100"
    assert order.billing_street == "Avenida Paulista"
    assert order.billing_number == "1000"
    assert order.billing_complement == "Apto 42"
    assert order.billing_neighborhood == "Bela Vista"
    assert order.billing_city == "São Paulo"
    assert order.billing_state == "SP"
    db.close()

def test_pix_payment_succeeds_without_billing_address_even_if_required():
    db = TestingSessionLocal()
    prod = create_test_product(db, require_billing_address=True)

    payload = {
        "slug": prod.slug,
        "name": "Mariana Souza",
        "email": "mariana@example.com",
        "phone": "21999998888",
        "payment_method": "pix",
        # Sem campos de endereço
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["payment_method"] == "pix"
    assert data["order_code"].startswith("ORD-")
    db.close()

def test_cep_lookup_endpoint_valid_and_invalid():
    # CEP inválido (menos de 8 dígitos)
    res_inv = client.get("/api/v1/checkout/cep/123")
    assert res_inv.status_code == 400
    assert "CEP inválido" in res_inv.json()["detail"]

    # Simular resposta de sucesso do ViaCEP
    fake_viacep_response = {
        "cep": "01310-100",
        "logradouro": "Avenida Paulista",
        "complemento": "lado ímpar",
        "bairro": "Bela Vista",
        "localidade": "São Paulo",
        "uf": "SP",
    }

    class MockResponse:
        status_code = 200
        def json(self):
            return fake_viacep_response

    class MockAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def get(self, url):
            return MockResponse()

    with patch("httpx.AsyncClient", return_value=MockAsyncClient()):
        res = client.get("/api/v1/checkout/cep/01310-100")
        assert res.status_code == 200
        data = res.json()
        assert data["street"] == "Avenida Paulista"
        assert data["neighborhood"] == "Bela Vista"
        assert data["city"] == "São Paulo"
        assert data["state"] == "SP"

def test_product_update_require_billing_address():
    db = TestingSessionLocal()
    headers = get_auth_headers(db)
    prod = create_test_product(db, require_billing_address=False)

    update_payload = {
        "require_billing_address": True
    }

    res = client.put(f"/api/v1/products/{prod.id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["require_billing_address"] is True

    db.refresh(prod)
    assert prod.require_billing_address is True
    db.close()
