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
from app.models.product import Product, ProductOffer, ProductSplitRule
from app.models.coupon import Coupon

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

def test_coupon_crud_and_validation():
    """Valida criação, listagem, atualização e exclusão de cupons de desconto."""
    headers = get_auth_headers()

    # 1. Cria produto base
    prod_res = client.post("/api/v1/products/", json={
        "name": "Mentoria Exclusiva",
        "slug": "mentoria-exclusiva",
        "price_brl": 1000.0,
        "price_usd": 200.0,
        "is_active": True
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 2. Criar cupom global vitalício de 20%
    c1_res = client.post("/api/v1/coupons", json={
        "code": "PROMO20",
        "discount_percent": 20.0,
        "never_expires": True,
        "is_active": True
    }, headers=headers)
    assert c1_res.status_code == 201
    c1 = c1_res.json()
    assert c1["code"] == "PROMO20"
    assert c1["discount_percent"] == 20.0
    assert c1["never_expires"] is True
    assert c1["current_uses"] == 0

    # 3. Listar cupons
    list_res = client.get("/api/v1/coupons", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Validar cupom na rota pública de checkout
    val_res = client.post("/api/v1/checkout/validate-coupon", json={
        "code": "promo20", # testa normalização uppercase
        "slug": "mentoria-exclusiva"
    })
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["discount_percent"] == 20.0
    assert val_data["discount_amount_brl"] == 200.0
    assert val_data["final_amount_brl"] == 800.0
    assert val_data["discount_amount_usd"] == 40.0
    assert val_data["final_amount_usd"] == 160.0

    # 5. Criar cupom com limite de 1 uso
    c2_res = client.post("/api/v1/coupons", json={
        "code": "LIMITADO1",
        "discount_percent": 50.0,
        "max_uses": 1,
        "never_expires": True,
        "is_active": True
    }, headers=headers)
    assert c2_res.status_code == 201

    # 6. Processar compra com cupom LIMITADO1
    order1_res = client.post("/api/v1/checkout/process", json={
        "slug": "mentoria-exclusiva",
        "name": "Comprador 1",
        "email": "comprador1@teste.com",
        "phone": "11999998888",
        "payment_method": "pix",
        "coupon_code": "LIMITADO1"
    })
    assert order1_res.status_code == 201
    ord1_data = order1_res.json()
    assert ord1_data["coupon_code"] == "LIMITADO1"
    assert ord1_data["discount_amount_brl"] == 500.0
    assert ord1_data["amount_brl"] == 500.0
    assert ord1_data["original_amount_brl"] == 1000.0

    # 7. Segunda compra com LIMITADO1 deve ser recusada por limite de utilizações
    order2_res = client.post("/api/v1/checkout/process", json={
        "slug": "mentoria-exclusiva",
        "name": "Comprador 2",
        "email": "comprador2@teste.com",
        "phone": "11999998888",
        "payment_method": "pix",
        "coupon_code": "LIMITADO1"
    })
    assert order2_res.status_code == 400
    assert "limite máximo" in order2_res.json()["detail"]

    # 8. Criar cupom com data de expiração no passado
    past_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    c3_res = client.post("/api/v1/coupons", json={
        "code": "EXPIRADO10",
        "discount_percent": 10.0,
        "never_expires": False,
        "expires_at": past_date,
        "is_active": True
    }, headers=headers)
    assert c3_res.status_code == 201

    # Tentativa de validar cupom expirado
    exp_res = client.post("/api/v1/checkout/validate-coupon", json={
        "code": "EXPIRADO10",
        "slug": "mentoria-exclusiva"
    })
    assert exp_res.status_code == 400
    assert "já expirou" in exp_res.json()["detail"]

    # 9. Excluir cupom
    del_res = client.delete(f"/api/v1/coupons/{c1['id']}", headers=headers)
    assert del_res.status_code == 204
