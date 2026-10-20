import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.product import Product, ProductOffer
from app.models.order import Order
from app.models.subscription import Subscription, SubscriptionInvoice
from app.models.buyer_portal import BuyerAccessCode

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

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def db():
    database = TestingSessionLocal()
    try:
        yield database
    finally:
        database.close()


def test_request_code_no_orders_returns_404():
    res = client.post(
        "/api/v1/buyer-portal/request-code",
        json={"email": "inexistente@exemplo.com"}
    )
    assert res.status_code == 404
    assert "Nenhum pedido ou assinatura" in res.json()["detail"]


def test_request_code_and_verify_flow(db):
    # Cria produto e ordem para o comprador
    prod = Product(
        name="Curso Masterclass de Vendas",
        slug="masterclass-vendas",
        price_brl=997.0,
        member_area_url="https://membros.meudominio.com.br/masterclass",
        is_active=True
    )
    db.add(prod)
    db.commit()

    order = Order(
        order_code="ORD-TEST-001",
        product_id=prod.id,
        customer_name="Mariana Santos",
        customer_email="mariana@teste.com",
        customer_phone="11988887777",
        customer_cpf="12345678900",
        amount_brl=997.0,
        payment_method="pix",
        status="pending",
        qr_code_text="00020101021226880014br.gov.bcb.pix...",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    db.add(order)
    db.commit()

    # 1. Solicita código OTP
    res_req = client.post(
        "/api/v1/buyer-portal/request-code",
        json={"email": "mariana@teste.com"}
    )
    assert res_req.status_code == 200
    data_req = res_req.json()
    assert data_req["email"] == "mariana@teste.com"
    otp_code = data_req["dev_code"]
    assert len(otp_code) == 6

    # 2. Tenta código inválido
    res_err = client.post(
        "/api/v1/buyer-portal/verify-code",
        json={"email": "mariana@teste.com", "code": "000000"}
    )
    assert res_err.status_code == 400

    # 3. Código válido
    res_ok = client.post(
        "/api/v1/buyer-portal/verify-code",
        json={"email": "mariana@teste.com", "code": otp_code}
    )
    assert res_ok.status_code == 200
    data_ok = res_ok.json()
    assert "access_token" in data_ok
    assert data_ok["customer"]["name"] == "Mariana Santos"
    assert data_ok["customer"]["email"] == "mariana@teste.com"
    token = data_ok["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Consulta Perfil
    res_me = client.get("/api/v1/buyer-portal/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["name"] == "Mariana Santos"


def test_buyer_orders_and_regenerate_pix(db):
    prod = Product(
        name="Formação Completa Dev",
        slug="formacao-dev",
        price_brl=1497.0,
        member_area_url="https://area.aluno.com/dev",
        is_active=True
    )
    db.add(prod)
    db.commit()

    # Ordem 1: Paga com área de membros
    order_paid = Order(
        order_code="ORD-PAID-888",
        product_id=prod.id,
        customer_name="Carlos Eduardo",
        customer_email="carlos@teste.com",
        customer_phone="21999998888",
        customer_cpf="33344455566",
        amount_brl=1497.0,
        payment_method="credit_card",
        status="paid",
        paid_at=datetime.now(timezone.utc)
    )
    # Ordem 2: Pix Pendente Vencido
    order_pending = Order(
        order_code="ORD-PIX-999",
        product_id=prod.id,
        customer_name="Carlos Eduardo",
        customer_email="carlos@teste.com",
        customer_phone="21999998888",
        customer_cpf="33344455566",
        amount_brl=1497.0,
        payment_method="pix",
        status="pending",
        qr_code_text="00020101021226880014br.gov.bcb.pix...old",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=10) # Vencido
    )
    db.add_all([order_paid, order_pending])
    db.commit()

    # Autentica
    res_req = client.post("/api/v1/buyer-portal/request-code", json={"email": "carlos@teste.com"})
    code = res_req.json()["dev_code"]
    res_ver = client.post("/api/v1/buyer-portal/verify-code", json={"email": "carlos@teste.com", "code": code})
    headers = {"Authorization": f"Bearer {res_ver.json()['access_token']}"}

    # Lista pedidos
    res_orders = client.get("/api/v1/buyer-portal/orders", headers=headers)
    assert res_orders.status_code == 200
    orders_data = res_orders.json()
    assert len(orders_data) == 2

    # Verifica pedido pago com link de entrega
    paid_item = next(o for o in orders_data if o["order_code"] == "ORD-PAID-888")
    assert paid_item["status"] == "paid"
    assert paid_item["member_area_url"] == "https://area.aluno.com/dev"

    # Verifica pedido pix vencido
    pending_item = next(o for o in orders_data if o["order_code"] == "ORD-PIX-999")
    assert pending_item["status"] == "pending"
    assert pending_item["is_pix_expired"] is True

    # Regenera Pix
    res_regen = client.post("/api/v1/buyer-portal/orders/ORD-PIX-999/regenerate-pix", headers=headers)
    assert res_regen.status_code == 200
    regen_data = res_regen.json()
    assert "qr_code_text" in regen_data
    assert regen_data["status"] == "pending"


def test_buyer_subscriptions_and_update_card(db):
    prod = Product(
        name="Clube VIP Recorrente",
        slug="clube-vip",
        price_brl=97.0,
        member_area_url="https://clube.com/conteudo",
        is_active=True
    )
    db.add(prod)
    db.commit()

    sub = Subscription(
        subscription_code="SUB-CLUB-123",
        customer_name="Larissa Manoela",
        customer_email="larissa@teste.com",
        customer_phone="11977776666",
        customer_document="99988877700",
        product_id=prod.id,
        billing_cycle="monthly",
        amount_brl=97.0,
        status="past_due",
        card_last_four="1111",
        card_brand="mastercard",
        current_cycle=2
    )
    db.add(sub)
    db.commit()

    inv = SubscriptionInvoice(
        subscription_id=sub.id,
        invoice_code="INV-CLUB-001",
        cycle_number=1,
        amount_brl=97.0,
        status="paid",
        paid_at=datetime.now(timezone.utc) - timedelta(days=30)
    )
    db.add(inv)
    db.commit()

    # Autentica
    res_req = client.post("/api/v1/buyer-portal/request-code", json={"email": "larissa@teste.com"})
    code = res_req.json()["dev_code"]
    res_ver = client.post("/api/v1/buyer-portal/verify-code", json={"email": "larissa@teste.com", "code": code})
    headers = {"Authorization": f"Bearer {res_ver.json()['access_token']}"}

    # Lista assinaturas
    res_subs = client.get("/api/v1/buyer-portal/subscriptions", headers=headers)
    assert res_subs.status_code == 200
    subs_data = res_subs.json()
    assert len(subs_data) == 1
    assert subs_data[0]["subscription_code"] == "SUB-CLUB-123"
    assert subs_data[0]["status"] == "past_due"
    assert len(subs_data[0]["invoices"]) == 1

    # Atualiza cartão
    payload_card = {
        "card_number": "4111111111114242",
        "card_holder": "LARISSA MANOELA",
        "card_expiry": "10/29",
        "card_cvv": "999"
    }
    res_card = client.post("/api/v1/buyer-portal/subscriptions/SUB-CLUB-123/update-card", json=payload_card, headers=headers)
    assert res_card.status_code == 200
    card_res = res_card.json()
    assert card_res["card_last_four"] == "4242"
    assert card_res["status"] == "active"
