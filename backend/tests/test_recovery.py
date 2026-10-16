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
from app.models.product import Product, ProductOffer
from app.models.abandoned_cart import AbandonedCart
from app.models.order import Order

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
        api_key="ak_test_12345",
        public_key="pk_test_12345"
    )
    db.add(gw)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def get_auth_headers():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_lead_capture_and_abandoned_cart_flow():
    """Valida a captura do lead no Step 1, persistência e atualização do carrinho abandonado."""
    headers = get_auth_headers()

    # 1. Cria produto base
    prod_res = client.post("/api/v1/products/", json={
        "name": "Curso de Tráfego Direto",
        "slug": "curso-trafego",
        "price_brl": 497.0,
        "is_active": True
    }, headers=headers)
    assert prod_res.status_code == 201

    # 2. Captura lead no checkout público
    cap_res = client.post("/api/v1/checkout/capture-lead", json={
        "slug": "curso-trafego",
        "name": "Marcos Vinicius",
        "email": "marcos@example.com",
        "phone": "11988887777",
        "phone_ddi": "55",
        "estimated_amount_brl": 497.0
    })
    assert cap_res.status_code == 200
    data = cap_res.json()
    assert data["cart_id"] is not None
    assert data["status"] == "abandoned"
    cart_id = data["cart_id"]
    token = data["recovery_token"]
    assert len(token) > 10

    # 3. Segunda chamada de debounce do mesmo lead atualiza o carrinho existente
    cap2_res = client.post("/api/v1/checkout/capture-lead", json={
        "slug": "curso-trafego",
        "name": "Marcos Vinicius da Silva",
        "email": "marcos@example.com",
        "phone": "11988887777",
        "phone_ddi": "55",
        "estimated_amount_brl": 547.0
    })
    assert cap2_res.status_code == 200
    assert cap2_res.json()["cart_id"] == cart_id

    # 4. Listar carrinhos no painel administrativo
    list_res = client.get("/api/v1/recovery/abandoned-carts", headers=headers)
    assert list_res.status_code == 200
    carts = list_res.json()
    assert len(carts) == 1
    assert carts[0]["customer_name"] == "Marcos Vinicius da Silva"
    assert carts[0]["customer_email"] == "marcos@example.com"
    assert carts[0]["customer_phone_formatted"] == "+55 (11) 98888-7777"
    assert "/pay/curso-trafego?recover=" in carts[0]["recovery_url"]

    # 5. Atualizar carrinho abandonado (marcar como contatado e recuperado)
    patch_res = client.patch(f"/api/v1/recovery/abandoned-carts/{cart_id}", json={
        "status": "recovered",
        "contacted": True,
        "notes": "Cliente atendeu no WhatsApp e solicitou boleto/Pix com desconto."
    }, headers=headers)
    assert patch_res.status_code == 200
    updated_cart = patch_res.json()
    assert updated_cart["status"] == "recovered"
    assert updated_cart["contacted"] is True
    assert "Cliente atendeu" in updated_cart["notes"]


def test_checkout_converts_abandoned_cart_and_pending_pix():
    """Valida a conversão automática do carrinho ao criar pedido e a listagem de Pix pendente."""
    headers = get_auth_headers()

    # 1. Cria produto base
    prod_res = client.post("/api/v1/products/", json={
        "name": "E-book Automações",
        "slug": "ebook-automacoes",
        "price_brl": 97.0,
        "is_active": True
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Captura lead
    cap_res = client.post("/api/v1/checkout/capture-lead", json={
        "slug": "ebook-automacoes",
        "name": "Carla Mendes",
        "email": "carla@test.com",
        "phone": "21977776666",
        "phone_ddi": "55",
        "estimated_amount_brl": 97.0
    })
    assert cap_res.status_code == 200
    cart_id = cap_res.json()["cart_id"]

    # 3. Finaliza pedido via Pix
    order_res = client.post("/api/v1/checkout/process", json={
        "slug": "ebook-automacoes",
        "name": "Carla Mendes",
        "email": "carla@test.com",
        "phone": "21977776666",
        "phone_ddi": "55",
        "payment_method": "pix"
    })
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["payment_method"] == "pix"
    assert order_data["status"] == "pending"

    # 4. Verifica se o carrinho abandonado foi marcado como 'converted'
    list_res = client.get(f"/api/v1/recovery/abandoned-carts?product_id={prod_id}", headers=headers)
    assert list_res.status_code == 200
    carts = list_res.json()
    assert len(carts) == 1
    assert carts[0]["status"] == "converted"

    # 5. Verifica se o pedido Pix aparece na aba de Pix Pendente
    pix_res = client.get("/api/v1/recovery/pending-pix?status=pending", headers=headers)
    assert pix_res.status_code == 200
    pix_orders = pix_res.json()
    assert len(pix_orders) >= 1
    found_order = next((o for o in pix_orders if o["order_code"] == order_data["order_code"]), None)
    assert found_order is not None
    assert found_order["customer_name"] == "Carla Mendes"
    assert found_order["amount_brl"] == 97.0
    assert found_order["qr_code_text"] is not None

    # 6. Verifica métricas consolidadas
    stats_res = client.get("/api/v1/recovery/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_converted"] >= 1
    assert stats["total_pix_generated"] >= 1
    assert stats["total_pix_pending"] >= 1
    assert stats["total_pix_pending_amount_brl"] >= 97.0
