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
from app.models.product import Product, ProductOffer
from app.models.gateway import GatewaySetting
from app.models.affiliate import Affiliate, AffiliateProductLink, AffiliateCommission

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

def get_auth_token():
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": settings.SUPERADMIN_EMAIL,
            "password": settings.SUPERADMIN_PASSWORD
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def create_test_product():
    db = TestingSessionLocal()
    prod = Product(
        name="Curso Alpha Afiliados",
        slug="curso-alpha",
        description="Treinamento Completo",
        price_brl=200.0,
        is_active=True,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    offer = ProductOffer(
        product_id=prod.id,
        name="Oferta Principal",
        slug="oferta-alpha",
        price_brl=200.0,
        is_active=True,
    )
    db.add(offer)
    db.commit()
    prod_id = prod.id
    db.close()
    return prod_id


def test_create_and_list_affiliate():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Carlos Parceiro",
        "email": "carlos@afiliado.com",
        "phone": "11988887777",
        "document": "12345678901",
        "affiliate_code": "CARLOS10",
        "pix_key": "carlos@afiliado.com",
        "pix_key_type": "email",
        "default_commission_percent": 25.0,
        "is_active": True,
        "notes": "Parceiro de YouTube",
    }

    response = client.post("/api/v1/affiliates", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Carlos Parceiro"
    assert data["affiliate_code"] == "CARLOS10"
    assert data["default_commission_percent"] == 25.0
    affiliate_id = data["id"]

    # Conflito de e-mail duplicado
    conflict_res = client.post("/api/v1/affiliates", json=payload, headers=headers)
    assert conflict_res.status_code == 400
    assert "e-mail" in conflict_res.json()["detail"].lower()

    # Listar afiliados
    list_res = client.get("/api/v1/affiliates", headers=headers)
    assert list_res.status_code == 200
    affiliates = list_res.json()
    assert len(affiliates) == 1
    assert affiliates[0]["id"] == affiliate_id

    # Detalhes do afiliado por ID
    get_res = client.get(f"/api/v1/affiliates/{affiliate_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["email"] == "carlos@afiliado.com"


def test_product_linking_and_tracking():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    prod_id = create_test_product()

    # Cria afiliado
    aff_res = client.post(
        "/api/v1/affiliates",
        json={
            "name": "Maria Influencer",
            "email": "maria@influencer.com",
            "phone": "21999990000",
            "affiliate_code": "MARIAVIP",
            "default_commission_percent": 20.0,
        },
        headers=headers,
    )
    aff_id = aff_res.json()["id"]

    # Vincula produto com comissão customizada (30%)
    link_res = client.post(
        f"/api/v1/affiliates/{aff_id}/products",
        json={
            "product_id": prod_id,
            "commission_percent": 30.0,
            "custom_ref_code": "MARIA-CURSO",
        },
        headers=headers,
    )
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["effective_commission_percent"] == 30.0
    assert link_data["ref_code"] == "MARIA-CURSO"
    link_id = link_data["id"]

    # Tracking de clique via endpoint público
    track_res = client.post(
        "/api/v1/affiliates/track-click",
        json={"slug": "curso-alpha", "ref_code": "MARIA-CURSO"},
    )
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["valid"] is True
    assert track_data["affiliate_name"] == "Maria Influencer"
    assert track_data["commission_percent"] == 30.0

    # Rastrear com código global do parceiro também funciona
    track_global = client.post(
        "/api/v1/affiliates/track-click",
        json={"slug": "oferta-alpha", "ref_code": "MARIAVIP"},
    )
    assert track_global.status_code == 200
    assert track_global.json()["valid"] is True

    # Código inválido
    track_inv = client.post(
        "/api/v1/affiliates/track-click",
        json={"slug": "curso-alpha", "ref_code": "NAOEXISTE"},
    )
    assert track_inv.status_code == 200
    assert track_inv.json()["valid"] is False

    # Deletar vínculo
    del_res = client.delete(f"/api/v1/affiliates/products/{link_id}", headers=headers)
    assert del_res.status_code == 200


def test_checkout_affiliate_commission_and_stats():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    prod_id = create_test_product()

    # Cria afiliado
    aff_res = client.post(
        "/api/v1/affiliates",
        json={
            "name": "Roberto Vendedor",
            "email": "roberto@vendas.com",
            "phone": "31977778888",
            "affiliate_code": "BETO",
            "default_commission_percent": 25.0,
            "pix_key": "31977778888",
        },
        headers=headers,
    )
    aff_id = aff_res.json()["id"]

    # Faz checkout com affiliate_code via Pix (simulação)
    checkout_payload = {
        "slug": "curso-alpha",
        "payment_method": "pix",
        "name": "Comprador Indicado",
        "email": "comprador@indicado.com",
        "phone": "11988884444",
        "cpf": "12345678909",
        "affiliate_code": "BETO",
    }
    chk_res = client.post("/api/v1/checkout/process", json=checkout_payload)
    assert chk_res.status_code == 201
    chk_data = chk_res.json()
    assert chk_data["status"] == "pending"
    # Pedido de R$ 200 com 25% de comissão = R$ 50.00
    assert chk_data.get("affiliate_code") == "BETO"
    assert chk_data.get("affiliate_commission_brl") == 50.0

    # Histórico de comissões
    comm_res = client.get("/api/v1/affiliates/commissions/history", headers=headers)
    assert comm_res.status_code == 200
    commissions = comm_res.json()
    assert len(commissions) == 1
    commission = commissions[0]
    assert commission["affiliate_code"] == "BETO"
    assert commission["amount_brl"] == 50.0
    assert commission["commission_percent"] == 25.0
    comm_id = commission["id"]

    # Marcar comissão como paga
    paid_res = client.patch(
        f"/api/v1/affiliates/commissions/{comm_id}/mark-paid",
        json={"notes": "Transferência Pix realizada Comprovante #9876"},
        headers=headers,
    )
    assert paid_res.status_code == 200
    assert paid_res.json()["status"] == "paid"
    assert paid_res.json()["paid_at"] is not None

    # Métricas consolidadas (stats)
    stats_res = client.get("/api/v1/affiliates/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_affiliates"] == 1
    assert stats["total_sales_via_affiliates"] == 1
    assert stats["total_sales_brl"] == 200.0
    assert stats["total_commissions_paid_brl"] == 50.0
