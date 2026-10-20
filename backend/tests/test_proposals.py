import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.gateway import GatewaySetting
from app.models.product import Product
from app.models.custom_proposal import CustomProposal

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
    db = TestingSessionLocal()

    admin = User(
        email=settings.SUPERADMIN_EMAIL,
        name=settings.SUPERADMIN_NAME,
        hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
        role="superadmin",
        is_active=True
    )
    db.add(admin)

    gw = GatewaySetting(
        gateway_name="pagarme",
        is_active=True,
        environment="sandbox",
        api_key="ak_test_12345",
        public_key="pk_test_12345"
    )
    db.add(gw)
    db.commit()
    db.close()

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

def get_auth_headers() -> dict:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_product(db) -> Product:
    prod = Product(
        name="Mentoria VIP High-Ticket",
        slug="mentoria-vip-closer",
        description="Mentoria exclusiva 1 a 1",
        price_brl=5000.0,
        price_usd=1000.0,
        is_active=True
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod


def test_create_custom_proposal(test_product: Product):
    headers = get_auth_headers()
    payload = {
        "product_id": test_product.id,
        "title": "Mentoria VIP - Condição Especial WhatsApp",
        "customer_name": "Carlos Roberto",
        "customer_email": "carlos.roberto@gmail.com",
        "customer_phone": "11988887777",
        "customer_cpf": "12345678909",
        "amount_brl": 3500.0,
        "payment_method_allowed": "all",
        "max_installments": 10,
        "closer_name": "Closer Bruno",
        "notes": "Fechamento realizado via Zoom com desconto especial",
        "expires_hours": 48
    }

    res = client.post("/api/v1/proposals", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["proposal_code"].startswith("PROP-")
    assert data["amount_brl"] == 3500.0
    assert data["customer_name"] == "Carlos Roberto"
    assert data["closer_name"] == "Closer Bruno"
    assert data["status"] == "active"
    assert data["is_expired"] is False
    assert "/pay/mentoria-vip-closer?proposal=PROP-" in data["checkout_url"]


def test_list_and_metrics_proposals(test_product: Product, db):
    headers = get_auth_headers()
    prop = CustomProposal(
        proposal_code="PROP-TEST-LIST01",
        product_id=test_product.id,
        title="Proposta Teste List",
        customer_name="Mariana Souza",
        customer_email="mariana@test.com",
        customer_phone="21999998888",
        amount_brl=2000.0,
        payment_method_allowed="pix",
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(prop)
    db.commit()

    # Listagem
    res = client.get("/api/v1/proposals", headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert "items" in res_data
    assert res_data["total"] >= 1

    # Métricas
    metrics_res = client.get("/api/v1/proposals/metrics", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total_proposals"] >= 1
    assert metrics["total_amount_negotiated"] >= 2000.0


def test_public_proposal_endpoint(test_product: Product, db):
    prop = CustomProposal(
        proposal_code="PROP-PUBLIC-999",
        product_id=test_product.id,
        title="Condição Exclusiva de Mentoria",
        description="Acesso a 6 meses de acompanhamento",
        customer_name="Lucas Pereira",
        customer_email="lucas@test.com",
        customer_phone="31977776666",
        amount_brl=2800.0,
        payment_method_allowed="credit_card",
        max_installments=12,
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=12)
    )
    db.add(prop)
    db.commit()

    # Endpoint público não deve exigir auth
    res = client.get(f"/api/v1/proposals/public/{prop.proposal_code}")
    assert res.status_code == 200
    data = res.json()
    assert data["proposal_code"] == "PROP-PUBLIC-999"
    assert data["amount_brl"] == 2800.0
    assert data["customer_name"] == "Lucas Pereira"
    assert data["product_slug"] == "mentoria-vip-closer"
    assert data["payment_method_allowed"] == "credit_card"
    assert data["is_expired"] is False


def test_checkout_with_custom_proposal(test_product: Product, db):
    # Produto custa 5.000, mas a proposta negociada é de R$ 3.000
    prop = CustomProposal(
        proposal_code="PROP-BUY-3000",
        product_id=test_product.id,
        title="Proposta Fechada Closer",
        customer_name="Renata Lima",
        customer_email="renata@test.com",
        customer_phone="11955554444",
        amount_brl=3000.0,
        payment_method_allowed="all",
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(prop)
    db.commit()

    # Compra via Cartão de Crédito aplicando proposal_code
    payload = {
        "slug": test_product.slug,
        "name": "Renata Lima",
        "email": "renata@test.com",
        "phone": "11955554444",
        "payment_method": "credit_card",
        "card_number": "4111111111111111",
        "card_holder": "RENATA LIMA",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1,
        "proposal_code": "PROP-BUY-3000"
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()
    # Verifica que o valor cobrado foi R$ 3.000 e não os R$ 5.000 de tabela!
    assert data["amount_brl"] == 3000.0
    assert data["status"] == "paid"
    assert data["proposal_code"] == "PROP-BUY-3000"

    # Verifica se a proposta no banco foi marcada como 'paid'
    db.refresh(prop)
    assert prop.status == "paid"
    assert prop.order_id == data["order_id"]
    assert prop.paid_at is not None


def test_expired_proposal_blocked(test_product: Product, db):
    # Proposta vencida
    prop = CustomProposal(
        proposal_code="PROP-EXPIRED-000",
        product_id=test_product.id,
        title="Proposta Antiga",
        customer_name="Comprador Atrasado",
        customer_email="atrasado@test.com",
        customer_phone="11944443333",
        amount_brl=2500.0,
        payment_method_allowed="all",
        status="active",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1) # Expirada há 1 hora
    )
    db.add(prop)
    db.commit()

    payload = {
        "slug": test_product.slug,
        "name": "Comprador Atrasado",
        "email": "atrasado@test.com",
        "phone": "11944443333",
        "payment_method": "pix",
        "proposal_code": "PROP-EXPIRED-000"
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 400
    assert "expirou" in res.json()["detail"].lower()


def test_filter_proposals_by_payment_method(test_product: Product, db):
    headers = get_auth_headers()
    p1 = CustomProposal(
        proposal_code="PROP-FILTER-PIX",
        product_id=test_product.id,
        title="Proposta Pix",
        customer_name="Cliente Pix",
        customer_email="pix@test.com",
        customer_phone="11911111111",
        amount_brl=1500.0,
        payment_method_allowed="pix",
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    p2 = CustomProposal(
        proposal_code="PROP-FILTER-HYBRID",
        product_id=test_product.id,
        title="Proposta Híbrida",
        customer_name="Cliente Híbrido",
        customer_email="hybrid@test.com",
        customer_phone="11922222222",
        amount_brl=2000.0,
        payment_method_allowed="hybrid_pix_card",
        custom_pix_amount_brl=500.0,
        custom_card_amount_brl=1500.0,
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add_all([p1, p2])
    db.commit()

    # Filtro por pix
    res_pix = client.get("/api/v1/proposals?payment_method=pix", headers=headers)
    assert res_pix.status_code == 200
    items_pix = res_pix.json()["items"]
    assert any(p["proposal_code"] == "PROP-FILTER-PIX" for p in items_pix)
    assert not any(p["proposal_code"] == "PROP-FILTER-HYBRID" for p in items_pix)

    # Filtro por hybrid_pix_card
    res_hybrid = client.get("/api/v1/proposals?payment_method=hybrid_pix_card", headers=headers)
    assert res_hybrid.status_code == 200
    items_hybrid = res_hybrid.json()["items"]
    assert any(p["proposal_code"] == "PROP-FILTER-HYBRID" for p in items_hybrid)
    assert not any(p["proposal_code"] == "PROP-FILTER-PIX" for p in items_hybrid)


def test_update_custom_proposal(test_product: Product, db):
    headers = get_auth_headers()
    prop = CustomProposal(
        proposal_code="PROP-UPDATE-001",
        product_id=test_product.id,
        title="Título Antigo",
        customer_name="Cliente Antigo",
        customer_email="antigo@test.com",
        customer_phone="11999990000",
        amount_brl=1000.0,
        payment_method_allowed="all",
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(prop)
    db.commit()

    update_payload = {
        "title": "Título Atualizado com Sucesso",
        "customer_name": "Cliente Novo VIP",
        "amount_brl": 1200.0,
        "payment_method_allowed": "credit_card",
        "max_installments": 6,
        "closer_name": "Closer Mariana"
    }

    res = client.put(f"/api/v1/proposals/{prop.id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Título Atualizado com Sucesso"
    assert data["customer_name"] == "Cliente Novo VIP"
    assert data["amount_brl"] == 1200.0
    assert data["payment_method_allowed"] == "credit_card"
    assert data["max_installments"] == 6
    assert data["closer_name"] == "Closer Mariana"

    # Confirma persistência no banco
    db.refresh(prop)
    assert prop.title == "Título Atualizado com Sucesso"
    assert prop.amount_brl == 1200.0

