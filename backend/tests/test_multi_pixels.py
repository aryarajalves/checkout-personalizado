import pytest
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

def test_product_multi_pixel_crud():
    headers = get_auth_headers()

    # 1. Criação do produto com pixels configurados
    payload = {
        "name": "Mentoria Tráfego Multi-Plataforma",
        "slug": "mentoria-trafego",
        "price_brl": 997.0,
        "meta_pixel_id": "1122334455",
        "google_ads_id": "AW-987654321",
        "google_ads_conversion_label": "ConvLabelPurchase123",
        "tiktok_pixel_id": "TT-C9876543210ABCDEF",
    }
    create_res = client.post("/api/v1/products/", json=payload, headers=headers)
    assert create_res.status_code == 201
    prod_data = create_res.json()
    assert prod_data["meta_pixel_id"] == "1122334455"
    assert prod_data["google_ads_id"] == "AW-987654321"
    assert prod_data["google_ads_conversion_label"] == "ConvLabelPurchase123"
    assert prod_data["tiktok_pixel_id"] == "TT-C9876543210ABCDEF"
    prod_id = prod_data["id"]

    # 2. Atualização dos pixels
    update_payload = {
        "google_ads_id": "AW-111222333",
        "google_ads_conversion_label": "NewLabel456",
        "tiktok_pixel_id": "TT-NEW123456789",
    }
    update_res = client.put(f"/api/v1/products/{prod_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["google_ads_id"] == "AW-111222333"
    assert updated_data["google_ads_conversion_label"] == "NewLabel456"
    assert updated_data["tiktok_pixel_id"] == "TT-NEW123456789"
    assert updated_data["meta_pixel_id"] == "1122334455" # manteve o anterior

def test_checkout_public_multi_pixel():
    headers = get_auth_headers()

    payload = {
        "name": "Formação Especialista em Vendas",
        "slug": "formacao-vendas",
        "price_brl": 497.0,
        "meta_pixel_id": "FB_PIXEL_100",
        "google_ads_id": "AW-555666777",
        "google_ads_conversion_label": "PurchaseLabel777",
        "tiktok_pixel_id": "TT_PIXEL_888",
    }
    res = client.post("/api/v1/products/", json=payload, headers=headers)
    assert res.status_code == 201

    # Consulta a rota pública de checkout
    public_res = client.get("/api/v1/products/public/formacao-vendas")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["meta_pixel_id"] == "FB_PIXEL_100"
    assert public_data["google_ads_id"] == "AW-555666777"
    assert public_data["google_ads_conversion_label"] == "PurchaseLabel777"
    assert public_data["tiktok_pixel_id"] == "TT_PIXEL_888"
