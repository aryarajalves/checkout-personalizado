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
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def get_auth_headers():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_order_bump_linked_to_product_and_offer():
    headers = get_auth_headers()

    # 1. Cria produto principal (checkout principal)
    main_prod = client.post("/api/v1/products/", json={
        "name": "Curso de Tráfego Pago",
        "slug": "curso-trafego-pago-bump-test",
        "price_brl": 197.0,
        "is_active": True
    }, headers=headers).json()

    # 2. Cria produto que será vendido como order bump (produto independente no catálogo)
    bump_prod = client.post("/api/v1/products/", json={
        "name": "Planilha de Métricas de Tráfego",
        "slug": "planilha-metricas-trafego-catalog",
        "price_brl": 47.0,
        "is_active": True
    }, headers=headers).json()

    # 3. Cria oferta específica para o produto do bump
    offer = client.post(f"/api/v1/products/{bump_prod['id']}/offers", json={
        "name": "Oferta Especial Bump",
        "slug": "planilha-metricas-bump-especial",
        "price_brl": 27.0,
        "is_active": True
    }, headers=headers).json()

    # 4. Cria o order bump no produto principal vinculado ao bump_product_id e bump_offer_id
    bump_res = client.post(f"/api/v1/products/{main_prod['id']}/order-bumps", json={
        "title": "Leve também a Planilha de Métricas",
        "description": "Planilha pronta para controlar seus gastos em anúncios",
        "price_brl": 27.0,
        "is_active": True,
        "bump_product_id": bump_prod["id"],
        "bump_offer_id": offer["id"]
    }, headers=headers)

    assert bump_res.status_code == 201
    bump_data = bump_res.json()
    assert bump_data["title"] == "Leve também a Planilha de Métricas"
    assert bump_data["price_brl"] == 27.0
    assert bump_data["bump_product_id"] == bump_prod["id"]
    assert bump_data["bump_offer_id"] == offer["id"]
    assert bump_data["bump_product_name"] == "Planilha de Métricas de Tráfego"
    assert bump_data["bump_offer_name"] == "Oferta Especial Bump"

    # 5. Listagem de bumps do produto principal
    list_res = client.get(f"/api/v1/products/{main_prod['id']}/order-bumps", headers=headers)
    assert list_res.status_code == 200
    bumps = list_res.json()
    assert len(bumps) == 1
    assert bumps[0]["bump_product_name"] == "Planilha de Métricas de Tráfego"
    assert bumps[0]["bump_offer_name"] == "Oferta Especial Bump"

    # 6. Atualização do order bump (troca título e preço)
    update_res = client.put(f"/api/v1/products/{main_prod['id']}/order-bumps/{bump_data['id']}", json={
        "title": "Super Planilha de Métricas VIP",
        "price_brl": 37.0
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Super Planilha de Métricas VIP"
    assert update_res.json()["price_brl"] == 37.0
    assert update_res.json()["bump_product_id"] == bump_prod["id"]

def test_order_bump_invalid_linked_product():
    headers = get_auth_headers()
    main_prod = client.post("/api/v1/products/", json={
        "name": "Ebook SEO Moderno",
        "slug": "ebook-seo-moderno-test",
        "price_brl": 49.0,
        "is_active": True
    }, headers=headers).json()

    # Tenta vincular produto inexistente
    res = client.post(f"/api/v1/products/{main_prod['id']}/order-bumps", json={
        "title": "Bump Inválido",
        "price_brl": 10.0,
        "is_active": True,
        "bump_product_id": 999999
    }, headers=headers)
    assert res.status_code == 404
    assert "não encontrado" in res.json()["detail"]
