"""
Testes Unitários para Regras de Parcelamento no Cartão e Simulador de Split (#4).
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
from app.models.gateway import GatewaySetting, SplitRecipient
from app.models.product import Product, ProductOffer, ProductSplitRule
from app.services.installment_service import (
    calculate_single_installment,
    calculate_product_installments,
    simulate_product_splits,
)
from app.schemas.order import CheckoutProcessRequest
from app.services.checkout_service import process_checkout

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
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def auth_headers():
    client = TestClient(app)
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_calculate_single_installment_free_and_with_interest():
    # 1x à vista
    opt_1x = calculate_single_installment(principal=100.0, installments=1)
    assert opt_1x.installments == 1
    assert opt_1x.installment_value == 100.0
    assert opt_1x.total_amount == 100.0
    assert opt_1x.has_interest is False
    assert "à vista" in opt_1x.label

    # 3x sem juros (dentro de free_installments_count=3)
    opt_3x = calculate_single_installment(
        principal=300.0,
        installments=3,
        free_installments_count=3,
        interest_rate_percent=2.99,
        interest_payer="buyer"
    )
    assert opt_3x.installments == 3
    assert opt_3x.installment_value == 100.0
    assert opt_3x.total_amount == 300.0
    assert opt_3x.has_interest is False
    assert "sem juros" in opt_3x.label

    # 12x com juros repassados ao comprador (free_installments_count=1, payer='buyer')
    opt_12x = calculate_single_installment(
        principal=100.0,
        installments=12,
        free_installments_count=1,
        interest_rate_percent=2.99,
        interest_payer="buyer"
    )
    assert opt_12x.installments == 12
    assert opt_12x.has_interest is True
    assert opt_12x.interest_rate == 2.99
    assert opt_12x.installment_value > 8.33 # maior que 100/12 devido aos juros
    assert opt_12x.total_amount > 100.0
    assert "total:" in opt_12x.label

    # 12x com juros absorvidos pelo produtor (payer='producer')
    opt_12x_producer = calculate_single_installment(
        principal=120.0,
        installments=12,
        free_installments_count=1,
        interest_rate_percent=2.99,
        interest_payer="producer"
    )
    assert opt_12x_producer.installments == 12
    assert opt_12x_producer.has_interest is False
    assert opt_12x_producer.installment_value == 10.0
    assert opt_12x_producer.total_amount == 120.0
    assert "sem juros" in opt_12x_producer.label


def test_calculate_product_installments_respects_max():
    opts = calculate_product_installments(
        price_brl=200.0,
        max_installments=6,
        free_installments_count=2,
        interest_rate_percent=2.99,
        interest_payer="buyer"
    )
    assert len(opts) == 6
    assert opts[0].installments == 1
    assert opts[0].has_interest is False
    assert opts[1].installments == 2
    assert opts[1].has_interest is False
    assert opts[2].installments == 3
    assert opts[2].has_interest is True # > free_installments_count
    assert opts[-1].installments == 6


def test_simulate_product_splits_distribution():
    db = TestingSessionLocal()
    # Criar recebedor e produto com split de 30%
    recipient = SplitRecipient(
        name="Co-produtor Alpha",
        email="alpha@test.com",
        document="11144477735",
        default_percentage=30.0,
        is_active=True
    )
    db.add(recipient)
    db.flush()

    prod = Product(
        name="Curso Master Split",
        slug="curso-master-split",
        price_brl=200.0,
        is_active=True,
        max_installments=12,
        free_installments_count=1,
        interest_rate_percent=2.99,
        interest_payer="buyer"
    )
    db.add(prod)
    db.flush()

    rule = ProductSplitRule(
        product_id=prod.id,
        recipient_id=recipient.id,
        percentage=30.0
    )
    db.add(rule)
    db.commit()

    simulation = simulate_product_splits(db, prod.id)
    assert simulation.product_id == prod.id
    assert simulation.base_price_brl == 200.0
    assert simulation.max_installments == 12
    assert len(simulation.installment_options) == 12
    assert len(simulation.scenarios) >= 4

    # Verificar cenário Pix
    pix_scen = next(s for s in simulation.scenarios if s.payment_method == "pix")
    assert pix_scen.gross_amount_brl == 200.0
    assert pix_scen.gateway_fee_brl == 0.99
    assert pix_scen.net_amount_brl == round(200.0 - 0.99, 2)
    assert pix_scen.producer_percentage == 70.0
    assert len(pix_scen.partners_distribution) == 1
    partner_share = pix_scen.partners_distribution[0]
    assert partner_share.recipient_name == "Co-produtor Alpha"
    assert partner_share.percentage == 30.0
    assert partner_share.amount_brl == round(pix_scen.net_amount_brl * 0.3, 2)
    assert pix_scen.producer_amount_brl == round(pix_scen.net_amount_brl - partner_share.amount_brl, 2)
    db.close()


def test_product_crud_and_simulation_endpoint(auth_headers):
    client = TestClient(app)

    # 1. Cria produto com regras de parcelamento customizadas
    res = client.post(
        f"{settings.API_V1_STR}/products",
        headers=auth_headers,
        json={
            "name": "Mentoria 6x Sem Juros",
            "slug": "mentoria-6x",
            "price_brl": 600.0,
            "max_installments": 6,
            "free_installments_count": 6,
            "interest_rate_percent": 1.99,
            "interest_payer": "producer"
        }
    )
    assert res.status_code == 201
    prod_data = res.json()
    assert prod_data["max_installments"] == 6
    assert prod_data["free_installments_count"] == 6
    assert prod_data["interest_rate_percent"] == 1.99
    assert prod_data["interest_payer"] == "producer"

    prod_id = prod_data["id"]

    # 2. Testa endpoint de simulação em tempo real
    sim_res = client.get(
        f"{settings.API_V1_STR}/products/{prod_id}/installment-simulation",
        headers=auth_headers
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["product_id"] == prod_id
    assert sim_data["max_installments"] == 6
    assert len(sim_data["installment_options"]) == 6
    assert sim_data["installment_options"][5]["has_interest"] is False # 6x sem juros
    assert len(sim_data["scenarios"]) >= 3


def test_checkout_applies_installment_rules():
    db = TestingSessionLocal()
    prod = Product(
        name="Mentoria High End",
        slug="mentoria-high-end",
        price_brl=100.0,
        is_active=True,
        max_installments=6,
        free_installments_count=1,
        interest_rate_percent=2.99,
        interest_payer="buyer"
    )
    db.add(prod)
    db.flush()

    offer = ProductOffer(
        product_id=prod.id,
        name="Principal",
        slug="mentoria-high-end",
        price_brl=100.0,
        is_active=True,
        is_default=True
    )
    db.add(offer)
    db.commit()

    # Tentativa de pagar em 12x quando max_installments é 6 -> Deve limitar a 6x e aplicar juros
    req = CheckoutProcessRequest(
        slug="mentoria-high-end",
        name="Comprador Cartão",
        email="cartao@test.com",
        phone="11999998888",
        payment_method="credit_card",
        card_number="4111111111111111",
        card_holder="COMPRADOR CARTAO",
        card_expiry="12/28",
        card_cvv="123",
        installments=12
    )

    res = process_checkout(db, req, client_ip="127.0.0.1")
    assert res.status == "paid"
    assert res.amount_brl > 100.0 # valor acrescido dos juros calculados da parcela 6x
    db.close()
