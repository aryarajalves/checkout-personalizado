import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.product import Product, ProductOffer
from app.models.order import Order
from app.models.ab_test import ABTest
from app.services import ab_test_service
from app.schemas.ab_test import ABTestCreate, ABTestUpdate
from app.api.v1.endpoints.users import get_current_user

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


def override_get_current_user():
    return User(id=1, email="admin@teste.com", name="Admin", role="superadmin", is_active=True)


client = TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Criar produto e duas ofertas para testes
    prod = Product(
        id=1,
        name="Curso de Marketing Digital",
        slug="curso-marketing",
        price_brl=197.0,
        is_active=True
    )
    db.add(prod)
    db.commit()

    offer_a = ProductOffer(
        id=1,
        product_id=1,
        name="Oferta A (R$ 197)",
        slug="curso-marketing-a",
        price_brl=197.0,
        is_active=True,
        is_default=True
    )
    offer_b = ProductOffer(
        id=2,
        product_id=1,
        name="Oferta B (R$ 147 Promocional)",
        slug="curso-marketing-b",
        price_brl=147.0,
        is_active=True,
        is_default=False
    )
    db.add(offer_a)
    db.add(offer_b)
    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def test_create_ab_test_success_and_validations():
    # 1. Tentar criar teste com mesma oferta nas duas variantes deve falhar (400)
    res_same = client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Mesmo Preco",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 1,
        "is_active": True,
        "split_ratio": 50
    })
    assert res_same.status_code == 400
    assert "diferentes" in res_same.json()["detail"]

    # 2. Criar com sucesso
    res_ok = client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Preço R$ 197 vs R$ 147",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 2,
        "is_active": True,
        "split_ratio": 50
    })
    assert res_ok.status_code == 201
    data = res_ok.json()
    assert data["name"] == "Teste Preço R$ 197 vs R$ 147"
    assert data["variant_a_price_brl"] == 197.0
    assert data["variant_b_price_brl"] == 147.0
    assert data["split_ratio"] == 50
    assert data["is_active"] is True


def test_track_ab_test_events_and_conversion_rates():
    # Criar teste
    res_create = client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Conversao",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 2,
        "is_active": True,
        "split_ratio": 50
    })
    test_id = res_create.json()["id"]

    # 1. Rastrear visita na Variante A
    client.post("/api/v1/ab-tests/track-event", json={
        "test_id": test_id,
        "variant": "A",
        "event_type": "visit"
    })
    # Mais uma visita na A e uma na B
    client.post("/api/v1/ab-tests/track-event", json={"test_id": test_id, "variant": "A", "event_type": "visit"})
    client.post("/api/v1/ab-tests/track-event", json={"test_id": test_id, "variant": "B", "event_type": "visit"})

    # 2. Rastrear initiate checkout
    client.post("/api/v1/ab-tests/track-event", json={"test_id": test_id, "variant": "A", "event_type": "initiate_checkout"})
    client.post("/api/v1/ab-tests/track-event", json={"test_id": test_id, "variant": "B", "event_type": "initiate_checkout"})

    # 3. Registrar conversão direta no serviço
    db = TestingSessionLocal()
    ab_test_service.record_ab_test_conversion(db, test_id=test_id, variant="B", amount_brl=147.0)

    # 4. Consultar métricas
    res_get = client.get("/api/v1/ab-tests/product/1")
    assert res_get.status_code == 200
    metrics = res_get.json()
    assert metrics["visits_a"] == 2
    assert metrics["visits_b"] == 1
    assert metrics["initiates_a"] == 1
    assert metrics["initiates_b"] == 1
    assert metrics["conversions_a"] == 0
    assert metrics["conversions_b"] == 1
    assert metrics["revenue_brl_b"] == 147.0
    assert metrics["conversion_rate_b"] == 100.0
    assert metrics["winning_variant"] == "B"


def test_ab_test_checkout_flow_and_conversion():
    # 1. Criar teste A/B
    res_create = client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Checkout Flow",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 2,
        "is_active": True,
        "split_ratio": 50
    })
    test_id = res_create.json()["id"]

    # 2. Processar compra com cartão aprovado vinculado à variante B
    payload = {
        "slug": "curso-marketing-b",
        "name": "Comprador Variante B",
        "email": "comprador.b@teste.com",
        "phone": "11988887777",
        "payment_method": "credit_card",
        "card_number": "4242424242424242",
        "card_holder": "COMPRADOR B",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 1,
        "ab_test_id": test_id,
        "ab_test_variant": "B"
    }
    res_checkout = client.post("/api/v1/checkout/process", json=payload)
    assert res_checkout.status_code in [200, 201]
    order_data = res_checkout.json()
    assert order_data["status"] == "paid"

    # 3. Validar se a conversão foi creditada no teste A/B
    res_metrics = client.get("/api/v1/ab-tests/product/1")
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert metrics["conversions_b"] == 1
    assert metrics["revenue_brl_b"] == 147.0


def test_update_and_delete_ab_test():
    # Criar
    res_create = client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Inicial",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 2,
        "is_active": True,
        "split_ratio": 50
    })
    test_id = res_create.json()["id"]

    # Atualizar (Pausar teste e renomear)
    res_update = client.put(f"/api/v1/ab-tests/{test_id}", json={
        "name": "Teste Pausado",
        "is_active": False,
        "split_ratio": 70
    })
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Teste Pausado"
    assert res_update.json()["is_active"] is False
    assert res_update.json()["split_ratio"] == 70

    # Excluir teste
    res_del = client.delete(f"/api/v1/ab-tests/{test_id}")
    assert res_del.status_code == 200

    # Consultar após exclusão deve retornar null
    res_get = client.get("/api/v1/ab-tests/product/1")
    assert res_get.status_code == 200
    assert res_get.json() is None


def test_public_product_response_includes_active_ab_test():
    # 1. Sem teste A/B ativo
    res_pub1 = client.get("/api/v1/products/public/curso-marketing")
    assert res_pub1.status_code == 200
    assert res_pub1.json()["active_ab_test"] is None

    # 2. Criar teste A/B ativo
    client.post("/api/v1/ab-tests/product/1", json={
        "name": "Teste Publico Ativo",
        "variant_a_offer_id": 1,
        "variant_b_offer_id": 2,
        "is_active": True,
        "split_ratio": 50
    })

    # 3. Com teste A/B ativo, a rota pública do produto deve conter as variantes para split
    res_pub2 = client.get("/api/v1/products/public/curso-marketing")
    assert res_pub2.status_code == 200
    active_test = res_pub2.json()["active_ab_test"]
    assert active_test is not None
    assert active_test["name"] == "Teste Publico Ativo"
    assert active_test["variant_a_slug"] == "curso-marketing-a"
    assert active_test["variant_b_slug"] == "curso-marketing-b"
    assert active_test["split_ratio"] == 50
