import pytest
from datetime import datetime, timezone
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

def test_product_conversion_config_crud():
    headers = get_auth_headers()

    # 1. Cria produto base
    prod_res = client.post("/api/v1/products/", json={
        "name": "Curso de Tráfego Pago",
        "slug": "curso-trafego-pago",
        "price_brl": 497.0,
        "price_usd": 99.0,
        "is_active": True
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Cria cupom de desconto
    coupon_res = client.post("/api/v1/coupons/", json={
        "code": "RELAMPAGO20",
        "discount_percent": 20.0,
        "never_expires": True,
        "is_active": True
    }, headers=headers)
    assert coupon_res.status_code == 201
    coupon_id = coupon_res.json()["id"]

    # 3. GET conversão inicial (desativado por padrão)
    get_conv = client.get(f"/api/v1/products/{prod_id}/conversion", headers=headers)
    assert get_conv.status_code == 200
    conv_data = get_conv.json()
    assert conv_data["enable_exit_intent"] is False
    assert conv_data["exit_intent_coupon_id"] is None
    assert conv_data["enable_social_proof"] is False
    assert conv_data["social_proof_mode"] == "hybrid"

    # 4. Atualiza configuração de conversão com cupom
    put_conv = client.put(f"/api/v1/products/{prod_id}/conversion", json={
        "enable_exit_intent": True,
        "exit_intent_coupon_id": coupon_id,
        "exit_intent_title": "Espere! Temos uma oferta única para você",
        "exit_intent_subtitle": "Aproveite 20% OFF de última chance agora!",
        "enable_social_proof": True,
        "social_proof_mode": "hybrid"
    }, headers=headers)
    assert put_conv.status_code == 200
    updated_conv = put_conv.json()
    assert updated_conv["enable_exit_intent"] is True
    assert updated_conv["exit_intent_coupon_id"] == coupon_id
    assert updated_conv["exit_intent_coupon_code"] == "RELAMPAGO20"
    assert updated_conv["exit_intent_coupon_discount_percent"] == 20.0
    assert updated_conv["enable_social_proof"] is True

    # 5. Consulta pública do checkout deve conter os dados do cupom de exit-intent
    public_res = client.get("/api/v1/products/public/curso-trafego-pago")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["enable_exit_intent"] is True
    assert pub_data["exit_intent_coupon_code"] == "RELAMPAGO20"
    assert pub_data["exit_intent_coupon_discount_percent"] == 20.0

def test_product_conversion_invalid_coupon():
    headers = get_auth_headers()
    prod_res = client.post("/api/v1/products/", json={
        "name": "Ebook Copywriting",
        "slug": "ebook-copywriting",
        "price_brl": 97.0,
        "is_active": True
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    # Tenta vincular cupom inexistente
    put_conv = client.put(f"/api/v1/products/{prod_id}/conversion", json={
        "enable_exit_intent": True,
        "exit_intent_coupon_id": 99999,
        "enable_social_proof": False,
        "social_proof_mode": "hybrid"
    }, headers=headers)
    assert put_conv.status_code == 404

def test_social_proof_notifications():
    headers = get_auth_headers()

    # Cria produto
    prod_res = client.post("/api/v1/products/", json={
        "name": "Mentoria Growth",
        "slug": "mentoria-growth",
        "price_brl": 1997.0,
        "is_active": True
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    # 1. Prova social desativada -> lista vazia
    res = client.get("/api/v1/checkout/social-proof/mentoria-growth")
    assert res.status_code == 200
    assert res.json() == []

    # 2. Ativa prova social no modo simulado
    client.put(f"/api/v1/products/{prod_id}/conversion", json={
        "enable_exit_intent": False,
        "enable_social_proof": True,
        "social_proof_mode": "simulated"
    }, headers=headers)

    res_sim = client.get("/api/v1/checkout/social-proof/mentoria-growth")
    assert res_sim.status_code == 200
    sim_items = res_sim.json()
    assert len(sim_items) > 0
    assert "customer_name" in sim_items[0]
    assert "city" in sim_items[0]
    assert "state" in sim_items[0]
    assert "time_ago" in sim_items[0]

    # 3. Modo real: adiciona um pedido pago no banco
    client.put(f"/api/v1/products/{prod_id}/conversion", json={
        "enable_exit_intent": False,
        "enable_social_proof": True,
        "social_proof_mode": "real"
    }, headers=headers)

    db = TestingSessionLocal()
    real_order = Order(
        order_code="ORD-TEST-1234",
        product_id=prod_id,
        customer_name="Carlos Eduardo Silva",
        customer_email="carlos@exemplo.com",
        customer_phone="11999998888",
        amount_brl=1997.0,
        payment_method="pix",
        status="paid",
        paid_at=datetime.now(timezone.utc)
    )
    db.add(real_order)
    db.commit()
    db.close()

    res_real = client.get("/api/v1/checkout/social-proof/mentoria-growth")
    assert res_real.status_code == 200
    real_items = res_real.json()
    assert len(real_items) == 1
    assert real_items[0]["customer_name"] == "Carlos S."
    assert real_items[0]["payment_method"] == "Pix"
