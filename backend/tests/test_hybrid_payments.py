import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from fastapi import HTTPException
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
from app.models.order import Order, OrderPayment
from app.services.checkout_service import process_checkout, simulate_order_payment, get_order_status
from app.schemas.order import CheckoutProcessRequest

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
        api_key="sk_test_placeholder_key",
        public_key="pk_test_12345"
    )
    db.add(gw)

    prod = Product(
        name="Curso Master Híbrido",
        description="Treinamento completo com opção de pagamento híbrido",
        price_brl=600.0,
        slug="curso-master-hibrido",
        is_active=True
    )
    db.add(prod)
    db.flush()

    offer = ProductOffer(
        product_id=prod.id,
        name="Oferta Promocional",
        slug="oferta-promocional",
        price_brl=500.0,
        is_active=True
    )
    db.add(offer)

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def test_hybrid_pix_card_success():
    db = TestingSessionLocal()
    prod = db.query(Product).first()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Lucas Ferreira",
        email="lucas@example.com",
        cpf="111.444.777-35",
        phone="11988887777",
        payment_method="hybrid_pix_card",
        pix_amount_brl=200.0,
        card_amount_brl=400.0, # Preço do produto principal sem oferta explícita é 600.0
        card_number="4111111111111111",
        card_holder="Lucas Ferreira",
        card_expiry="12/28",
        card_cvv="123",
        installments=3
    )

    resp = process_checkout(db, req)

    assert resp.status == "pending"
    assert resp.payment_method == "hybrid_pix_card"
    assert resp.hybrid_type == "pix_card"
    assert resp.amount_brl == 600.0
    assert resp.paid_amount_brl == 400.0
    assert resp.remaining_amount_brl == 200.0
    assert len(resp.payments) == 2

    # Verifica fatia 1 (Cartão de Crédito)
    p_card = next(p for p in resp.payments if p.payment_method == "credit_card")
    assert p_card.part_number == 1
    assert p_card.amount_brl == 400.0
    assert p_card.status == "paid"
    assert p_card.installments == 3
    assert p_card.card_last_four == "1111"

    # Verifica fatia 2 (Pix)
    p_pix = next(p for p in resp.payments if p.payment_method == "pix")
    assert p_pix.part_number == 2
    assert p_pix.amount_brl == 200.0
    assert p_pix.status == "pending"
    assert p_pix.qr_code_text is not None

    # Simulação da quitação do Pix restante
    sim_status = simulate_order_payment(db, resp.order_id)
    assert sim_status.status == "paid"
    assert sim_status.paid_amount_brl == 600.0
    assert sim_status.remaining_amount_brl == 0.0
    assert all(p.status == "paid" for p in sim_status.payments)
    db.close()

def test_hybrid_two_cards_success():
    db = TestingSessionLocal()
    prod = db.query(Product).first()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Mariana Santos",
        email="mariana@example.com",
        cpf="111.444.777-35",
        phone="11988887777",
        payment_method="hybrid_two_cards",
        card_amount_brl=400.0,
        card_number="4111111111111111",
        card_holder="Mariana Santos",
        card_expiry="12/28",
        card_cvv="123",
        installments=5,
        card2_amount_brl=200.0,
        card2_number="5555444433332222",
        card2_holder="Mariana Santos",
        card2_expiry="08/29",
        card2_cvv="456",
        card2_installments=2
    )

    resp = process_checkout(db, req)

    assert resp.status == "paid"
    assert resp.payment_method == "hybrid_two_cards"
    assert resp.hybrid_type == "two_cards"
    assert resp.amount_brl == 600.0
    assert resp.paid_amount_brl == 600.0
    assert resp.remaining_amount_brl == 0.0
    assert len(resp.payments) == 2

    p1 = next(p for p in resp.payments if p.part_number == 1)
    assert p1.amount_brl == 400.0
    assert p1.status == "paid"
    assert p1.card_last_four == "1111"
    assert p1.installments == 5

    p2 = next(p for p in resp.payments if p.part_number == 2)
    assert p2.amount_brl == 200.0
    assert p2.status == "paid"
    assert p2.card_last_four == "2222"
    assert p2.installments == 2
    db.close()

def test_hybrid_pix_card_sum_mismatch_raises_400():
    db = TestingSessionLocal()
    prod = db.query(Product).first()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Erro Soma",
        email="erro@example.com",
        cpf="111.444.777-35",
        phone="11988887777",
        payment_method="hybrid_pix_card",
        pix_amount_brl=100.0,
        card_amount_brl=300.0 # Soma dá 400.0, mas o total é 600.0!
    )

    with pytest.raises(HTTPException) as excinfo:
        process_checkout(db, req)

    assert excinfo.value.status_code == 400
    assert "deve ser igual ao total do pedido" in excinfo.value.detail
    db.close()

def test_hybrid_two_cards_zero_amount_raises_400():
    db = TestingSessionLocal()
    prod = db.query(Product).first()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Erro Zero",
        email="zero@example.com",
        cpf="111.444.777-35",
        phone="11988887777",
        payment_method="hybrid_two_cards",
        card_amount_brl=600.0,
        card2_amount_brl=0.0
    )

    with pytest.raises(HTTPException) as excinfo:
        process_checkout(db, req)

    assert excinfo.value.status_code == 400
    assert "devem ser maiores que zero" in excinfo.value.detail
    db.close()

def test_api_checkout_hybrid_endpoint():
    client = TestClient(app)
    db = TestingSessionLocal()
    prod = db.query(Product).first()

    payload = {
        "slug": prod.slug,
        "name": "API Tester",
        "email": "api_test@example.com",
        "cpf": "111.444.777-35",
        "phone": "11988887777",
        "payment_method": "hybrid_pix_card",
        "pix_amount_brl": 300.0,
        "card_amount_brl": 300.0,
        "card_number": "4111111111111111",
        "card_holder": "API Tester",
        "card_expiry": "12/28",
        "card_cvv": "123",
        "installments": 2
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()

    assert data["payment_method"] == "hybrid_pix_card"
    assert data["hybrid_type"] == "pix_card"
    assert data["status"] == "pending"
    assert data["paid_amount_brl"] == 300.0
    assert data["remaining_amount_brl"] == 300.0
    assert len(data["payments"]) == 2

    order_id = data["order_id"]

    # Consulta de status
    res_status = client.get(f"/api/v1/checkout/orders/{order_id}/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["hybrid_type"] == "pix_card"
    assert len(status_data["payments"]) == 2

    # Simulação do pagamento
    res_sim = client.post(f"/api/v1/checkout/orders/{order_id}/simulate-paid")
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["status"] == "paid"
    assert sim_data["paid_amount_brl"] == 600.0
    assert sim_data["remaining_amount_brl"] == 0.0

    db.close()
