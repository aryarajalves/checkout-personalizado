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
from app.models.product import Product
from app.models.order import Order
from app.models.webhook import ProductWebhook, WebhookDispatchLog

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

    prod = Product(
        name="Curso de Cripto Pro",
        slug="curso-cripto-pro",
        description="Aprenda cripto",
        price_brl=150.00,
        price_usd=30.00,
        is_active=True
    )
    db.add(prod)
    db.commit()

    yield

    Base.metadata.drop_all(bind=engine)


def get_auth_token(client: TestClient) -> str:
    login_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    return login_resp.json()["access_token"]


def test_refund_paid_order_success():
    client = TestClient(app)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    prod = db.query(Product).first()

    # Cria pedido pago
    order = Order(
        order_code="ORD-REFUND-001",
        product_id=prod.id,
        customer_name="Marcos Silva",
        customer_email="marcos@teste.com",
        customer_phone="11999998888",
        amount_brl=150.0,
        payment_method="pix",
        status="paid",
        gateway_name="pagarme",
        external_transaction_id="pagarme_sim_test_123",
        paid_at=datetime.now(timezone.utc)
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()

    # Executa reembolso via API informando motivo e notas
    payload = {
        "reason": "Arrependimento de compra / Prazo de 7 dias",
        "notes": "Cliente solicitou cancelamento via WhatsApp."
    }
    resp = client.post(
        f"{settings.API_V1_STR}/sales/orders/{order_id}/refund",
        json=payload,
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "refunded"
    assert "Arrependimento de compra" in data["refund_reason"]
    assert "Cliente solicitou cancelamento via WhatsApp" in data["refund_reason"]
    assert data["refunded_at"] is not None

    # Verifica no banco de dados
    db = TestingSessionLocal()
    updated_order = db.query(Order).filter(Order.id == order_id).first()
    assert updated_order.status == "refunded"
    assert updated_order.refund_reason == "Arrependimento de compra / Prazo de 7 dias - Cliente solicitou cancelamento via WhatsApp."
    assert updated_order.refunded_at is not None
    db.close()


def test_refund_already_refunded_order_returns_400():
    client = TestClient(app)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    prod = db.query(Product).first()

    order = Order(
        order_code="ORD-REFUND-002",
        product_id=prod.id,
        customer_name="João Santos",
        customer_email="joao@teste.com",
        customer_phone="11988887777",
        amount_brl=150.0,
        payment_method="credit_card",
        status="refunded",
        gateway_name="pagarme",
        refund_reason="Já reembolsado",
        refunded_at=datetime.now(timezone.utc)
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()

    resp = client.post(
        f"{settings.API_V1_STR}/sales/orders/{order_id}/refund",
        json={"reason": "Tentando reembolsar de novo"},
        headers=headers
    )
    assert resp.status_code == 400
    assert "já foi reembolsado anteriormente" in resp.json()["detail"]


def test_refund_pending_order_returns_400():
    client = TestClient(app)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    prod = db.query(Product).first()

    order = Order(
        order_code="ORD-REFUND-003",
        product_id=prod.id,
        customer_name="Ana Costa",
        customer_email="ana@teste.com",
        customer_phone="11977776666",
        amount_brl=150.0,
        payment_method="pix",
        status="pending",
        gateway_name="pagarme"
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()

    resp = client.post(
        f"{settings.API_V1_STR}/sales/orders/{order_id}/refund",
        json={"reason": "Não pode reembolsar pendente"},
        headers=headers
    )
    assert resp.status_code == 400
    assert "Apenas pedidos com status 'Pago' podem ser reembolsados" in resp.json()["detail"]


def test_refund_dispatches_webhook():
    client = TestClient(app)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    prod = db.query(Product).first()

    # Cria webhook escutando "order.refunded"
    wh = ProductWebhook(
        product_id=prod.id,
        name="Webhook Reembolso",
        url="https://mock-receiver.com/webhook",
        secret_key="whsec_test123",
        events='["order.refunded"]',
        is_active=True
    )
    db.add(wh)

    order = Order(
        order_code="ORD-REFUND-004",
        product_id=prod.id,
        customer_name="Lucas Pereira",
        customer_email="lucas@teste.com",
        customer_phone="11966665555",
        amount_brl=150.0,
        payment_method="pix",
        status="paid",
        gateway_name="pagarme",
        paid_at=datetime.now(timezone.utc)
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()

    resp = client.post(
        f"{settings.API_V1_STR}/sales/orders/{order_id}/refund",
        json={"reason": "Insatisfação com o conteúdo / produto"},
        headers=headers
    )
    assert resp.status_code == 200

    # Verifica se gerou o log de disparo na tabela webhook_dispatch_logs
    db = TestingSessionLocal()
    log = db.query(WebhookDispatchLog).filter(WebhookDispatchLog.order_id == order_id).first()
    assert log is not None
    assert log.event == "order.refunded"
    assert "Insatisfação com o conteúdo" in log.payload
    db.close()
