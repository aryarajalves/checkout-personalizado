"""
Testes unitários para o módulo de Domínios Personalizados (CNAME Whitelabel por Expert).
"""
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
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_configure_and_get_custom_domain():
    """Testa a configuração e consulta de domínio personalizado para um produto."""
    headers = get_auth_headers()

    # 1. Cria produto de teste
    prod_payload = {
        "name": "Mentoria Whitelabel CNAME",
        "slug": "mentoria-cname-test",
        "price_brl": 1997.0,
        "is_active": True,
        "payment_methods": "all"
    }
    res_prod = client.post("/api/v1/products", json=prod_payload, headers=headers)
    assert res_prod.status_code == 201
    prod_id = res_prod.json()["id"]

    # 2. Configura domínio próprio (com https:// e maiúsculas para testar sanitização)
    domain_payload = {
        "custom_domain": "HTTPS://PAY.MEUEXPERT.COM.BR/"
    }
    res_domain = client.put(f"/api/v1/products/{prod_id}/domain", json=domain_payload, headers=headers)
    assert res_domain.status_code == 200
    data = res_domain.json()
    assert data["product_id"] == prod_id
    assert data["custom_domain"] == "pay.meuexpert.com.br"
    assert "cname_target" in data
    assert data["status"] in ["active", "pending"]

    # 3. Consulta informações de domínio
    res_get = client.get(f"/api/v1/products/{prod_id}/domain", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["custom_domain"] == "pay.meuexpert.com.br"

def test_public_checkout_lookup_by_custom_domain():
    """Testa a resolução pública do checkout a partir do domínio personalizado."""
    headers = get_auth_headers()

    prod_payload = {
        "name": "Imersão Presencial VIP",
        "slug": "imersao-vip-domain",
        "price_brl": 3500.0,
        "custom_domain": "checkout.imersaovip.com",
        "is_active": True
    }
    res_prod = client.post("/api/v1/products", json=prod_payload, headers=headers)
    assert res_prod.status_code == 201

    # Resolução pública via rota by-domain
    res_pub = client.get("/api/v1/products/public/by-domain/checkout.imersaovip.com")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["name"] == "Imersão Presencial VIP"
    assert pub_data["custom_domain"] == "checkout.imersaovip.com"
    assert pub_data["price_brl"] == 3500.0

def test_custom_domain_uniqueness_conflict():
    """Garante que dois produtos não possam compartilhar o mesmo domínio personalizado."""
    headers = get_auth_headers()

    # Produto 1
    p1 = client.post("/api/v1/products", json={
        "name": "Curso A",
        "slug": "curso-a-dom",
        "price_brl": 100.0,
        "custom_domain": "pay.compartilhado.com"
    }, headers=headers)
    assert p1.status_code == 201

    # Produto 2 tentando o mesmo domínio
    p2 = client.post("/api/v1/products", json={
        "name": "Curso B",
        "slug": "curso-b-dom",
        "price_brl": 200.0,
        "custom_domain": "pay.compartilhado.com"
    }, headers=headers)
    assert p2.status_code == 400
    assert "já está em uso" in p2.json()["detail"]

def test_invalid_custom_domain_format():
    """Valida rejeição de formatos de domínio inválidos."""
    headers = get_auth_headers()

    res = client.post("/api/v1/products", json={
        "name": "Curso Inválido",
        "slug": "curso-invalido-dom",
        "price_brl": 100.0,
        "custom_domain": "dominio sem ponto"
    }, headers=headers)
    assert res.status_code == 400
    assert "Formato de domínio inválido" in res.json()["detail"]

def test_remove_custom_domain():
    """Testa remoção do domínio personalizado associado."""
    headers = get_auth_headers()

    res_prod = client.post("/api/v1/products", json={
        "name": "Treinamento para Remover Domínio",
        "slug": "treinamento-remove-dom",
        "price_brl": 500.0,
        "custom_domain": "pay.removerteste.com"
    }, headers=headers)
    prod_id = res_prod.json()["id"]

    # Remove enviando null
    res_del = client.put(f"/api/v1/products/{prod_id}/domain", json={"custom_domain": None}, headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["custom_domain"] is None
    assert res_del.json()["status"] == "unconfigured"
