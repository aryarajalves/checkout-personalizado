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
from app.models.order import Order
from app.models.subscription import Subscription, SubscriptionInvoice
from app.services.subscription_service import (
    calculate_mrr,
    calculate_next_billing,
    create_subscription_from_order,
    get_subscription_stats,
    cancel_subscription,
    pause_subscription,
    resume_subscription
)

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
    response = client.post(
        "/api/v1/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_sample_product_and_recurring_offer(db):
    product = Product(
        name="Clube VIP Recorrente",
        slug="clube-vip",
        price_brl=97.00,
        is_active=True,
        require_cpf=False
    )
    db.add(product)
    db.flush()

    offer = ProductOffer(
        product_id=product.id,
        name="Plano Mensal Recorrente",
        slug="clube-vip-mensal",
        price_brl=97.00,
        pricing_type="recurring",
        billing_cycle="monthly",
        is_active=True,
        is_default=True
    )
    db.add(offer)
    db.commit()
    db.refresh(product)
    db.refresh(offer)
    return product, offer


def test_calculate_mrr():
    assert calculate_mrr(100.0, "monthly") == 100.0
    assert calculate_mrr(300.0, "quarterly") == 100.0
    assert calculate_mrr(600.0, "semiannual") == 100.0
    assert calculate_mrr(1200.0, "annual") == 100.0


def test_calculate_next_billing():
    now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert calculate_next_billing(now, "monthly") == now + timedelta(days=30)
    assert calculate_next_billing(now, "quarterly") == now + timedelta(days=90)
    assert calculate_next_billing(now, "semiannual") == now + timedelta(days=180)
    assert calculate_next_billing(now, "annual") == now + timedelta(days=365)


def test_subscription_creation_and_stats():
    db = TestingSessionLocal()
    product, offer = create_sample_product_and_recurring_offer(db)

    order = Order(
        order_code="ORD-TEST-SUB-01",
        product_id=product.id,
        offer_id=offer.id,
        customer_name="João Assinante",
        customer_email="joao@example.com",
        customer_phone="11999998888",
        amount_brl=97.00,
        payment_method="credit_card",
        status="paid"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    sub = create_subscription_from_order(db, order, offer, card_last_four="1234", card_brand="mastercard")
    db.commit()

    assert sub.id is not None
    assert sub.subscription_code.startswith("SUB-")
    assert sub.status == "active"
    assert sub.billing_cycle == "monthly"
    assert sub.card_last_four == "1234"
    assert len(sub.invoices) == 1
    assert sub.invoices[0].amount_brl == 97.00
    assert sub.invoices[0].status == "paid"

    stats = get_subscription_stats(db)
    assert stats["active_subscriptions"] == 1
    assert stats["mrr_brl"] == 97.00
    assert stats["total_invoices_paid_brl"] == 97.00

    # Pausa e Reativação
    paused_sub = pause_subscription(db, sub.id)
    assert paused_sub.status == "paused"

    resumed_sub = resume_subscription(db, sub.id)
    assert resumed_sub.status == "active"

    # Cancelamento
    canceled_sub = cancel_subscription(db, sub.id, reason="Cliente pediu cancelamento")
    assert canceled_sub.status == "canceled"
    assert canceled_sub.cancel_reason == "Cliente pediu cancelamento"
    assert canceled_sub.canceled_at is not None

    db.close()


def test_subscriptions_api_flow():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    product, offer = create_sample_product_and_recurring_offer(db)

    order = Order(
        order_code="ORD-TEST-API-01",
        product_id=product.id,
        offer_id=offer.id,
        customer_name="Maria Recorrente",
        customer_email="maria@example.com",
        customer_phone="11988887777",
        amount_brl=150.00,
        payment_method="credit_card",
        status="paid"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    sub = create_subscription_from_order(db, order, offer)
    db.commit()
    sub_id = sub.id
    db.close()

    # 1. Obter Estatísticas
    res_stats = client.get("/api/v1/subscriptions/stats", headers=headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["active_subscriptions"] >= 1
    assert stats["mrr_brl"] >= 150.00

    # 2. Listar Assinaturas
    res_list = client.get("/api/v1/subscriptions", headers=headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) >= 1
    assert any(item["customer_email"] == "maria@example.com" for item in items)

    # 3. Detalhes de Assinatura
    res_detail = client.get(f"/api/v1/subscriptions/{sub_id}", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == sub_id
    assert len(detail["invoices"]) == 1

    # 4. Pausar e Reativar via API
    res_pause = client.post(f"/api/v1/subscriptions/{sub_id}/pause", headers=headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    res_resume = client.post(f"/api/v1/subscriptions/{sub_id}/resume", headers=headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "active"

    # 5. Cancelar via API
    res_cancel = client.post(
        f"/api/v1/subscriptions/{sub_id}/cancel",
        json={"reason": "Cancelado via teste API"},
        headers=headers
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "canceled"

    # 6. Listar Faturas
    res_invoices = client.get("/api/v1/subscriptions/invoices/all", headers=headers)
    assert res_invoices.status_code == 200
    invoices = res_invoices.json()
    assert len(invoices) >= 1


def test_checkout_process_recurring_subscription():
    db = TestingSessionLocal()
    product, offer = create_sample_product_and_recurring_offer(db)
    db.close()

    checkout_payload = {
        "slug": "clube-vip-mensal",
        "name": "Carlos Assinante",
        "email": "carlos@example.com",
        "phone": "11977776666",
        "payment_method": "credit_card"
    }

    response = client.post("/api/v1/checkout/process", json=checkout_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "paid"
    assert data["subscription_code"] is not None
    assert data["subscription_code"].startswith("SUB-")

    # Verifica no banco se a assinatura e fatura foram criadas
    db2 = TestingSessionLocal()
    sub = db2.query(Subscription).filter(Subscription.subscription_code == data["subscription_code"]).first()
    assert sub is not None
    assert sub.customer_email == "carlos@example.com"
    assert sub.status == "active"
    assert len(sub.invoices) == 1
    assert sub.invoices[0].amount_brl == 97.00
    db2.close()
