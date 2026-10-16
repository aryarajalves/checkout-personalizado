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
from app.models.gateway import GatewaySetting, SplitRecipient
from app.models.product import Product, ProductOffer, ProductSplitRule
from app.models.order import Order, OrderSplit
from app.services.checkout_service import process_checkout
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


def test_update_product_split_rules_with_valid_until(auth_headers):
    client = TestClient(app)
    db = TestingSessionLocal()

    # Cria dois recebedores
    rec1 = SplitRecipient(name="Produtor Principal", document="11111111111", is_active=True)
    rec2 = SplitRecipient(name="Co-produtor de Lançamento", document="22222222222", is_active=True)
    db.add_all([rec1, rec2])
    db.commit()

    # Cria produto
    prod = Product(
        name="Curso de Lançamento",
        slug="curso-lancamento",
        price_brl=1000.0,
        is_active=True
    )
    db.add(prod)
    db.commit()

    expiry_date = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()

    # Configura split com valid_until no co-produtor
    payload = {
        "rules": [
            {
                "recipient_id": rec1.id,
                "percentage": 70.0,
                "valid_until": None  # Permanente
            },
            {
                "recipient_id": rec2.id,
                "percentage": 30.0,
                "valid_until": expiry_date  # Válido por 90 dias
            }
        ]
    }

    response = client.put(
        f"{settings.API_V1_STR}/products/{prod.id}/split-rules",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Verifica campos de resposta
    rule_perm = next(r for r in data if r["recipient_id"] == rec1.id)
    rule_coprod = next(r for r in data if r["recipient_id"] == rec2.id)

    assert rule_perm["valid_until"] is None
    assert rule_perm["is_expired"] is False

    assert rule_coprod["valid_until"] is not None
    assert rule_coprod["is_expired"] is False


def test_split_rules_response_detects_expired_contract(auth_headers):
    client = TestClient(app)
    db = TestingSessionLocal()

    rec = SplitRecipient(name="Agência Temporária", document="33333333333", is_active=True)
    db.add(rec)
    db.commit()

    prod = Product(
        name="Mentoria VIP",
        slug="mentoria-vip",
        price_brl=500.0,
        is_active=True
    )
    db.add(prod)
    db.commit()

    # Data de expiração no passado (ontem)
    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    payload = {
        "rules": [
            {
                "recipient_id": rec.id,
                "percentage": 25.0,
                "valid_until": past_date
            }
        ]
    }

    response = client.put(
        f"{settings.API_V1_STR}/products/{prod.id}/split-rules",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["is_expired"] is True


def test_checkout_reallocates_expired_coproducer_share_to_main_producer():
    db = TestingSessionLocal()

    rec1 = SplitRecipient(name="Produtor Principal", document="11111111111", is_active=True)
    rec2 = SplitRecipient(name="Co-produtor Expirado", document="22222222222", is_active=True)
    db.add_all([rec1, rec2])
    db.commit()

    prod = Product(
        name="Masterclass",
        slug="masterclass-expirada",
        price_brl=1000.0,
        is_active=True
    )
    db.add(prod)
    db.commit()

    # Rec1 é permanente (70%), Rec2 expirou ontem (30%)
    past_date = datetime.now(timezone.utc) - timedelta(days=2)
    rule1 = ProductSplitRule(product_id=prod.id, recipient_id=rec1.id, percentage=70.0, valid_until=None)
    rule2 = ProductSplitRule(product_id=prod.id, recipient_id=rec2.id, percentage=30.0, valid_until=past_date)
    db.add_all([rule1, rule2])
    db.commit()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Comprador Teste",
        email="comprador@example.com",
        phone="11988887777",
        payment_method="pix"
    )

    result = process_checkout(db=db, request=req)

    # Verifica os splits gerados no pedido
    splits = db.query(OrderSplit).filter(OrderSplit.order_id == result.order_id).all()

    # O co-produtor expirado NÃO deve estar no split
    recipient_ids = [s.recipient_id for s in splits]
    assert rec2.id not in recipient_ids

    # O produtor principal deve ter absorvido a cota de 30%, ficando com 100%
    assert len(splits) == 1
    assert splits[0].recipient_id == rec1.id
    assert splits[0].percentage == 100.0
    assert splits[0].amount_brl == 1000.0


def test_checkout_keeps_active_coproducer_split():
    db = TestingSessionLocal()

    rec1 = SplitRecipient(name="Produtor Principal", document="11111111111", is_active=True)
    rec2 = SplitRecipient(name="Co-produtor Ativo", document="22222222222", is_active=True)
    db.add_all([rec1, rec2])
    db.commit()

    prod = Product(
        name="Workshop Online",
        slug="workshop-ativo",
        price_brl=1000.0,
        is_active=True
    )
    db.add(prod)
    db.commit()

    # Rec1 permanente (60%), Rec2 ativo até daqui a 60 dias (40%)
    future_date = datetime.now(timezone.utc) + timedelta(days=60)
    rule1 = ProductSplitRule(product_id=prod.id, recipient_id=rec1.id, percentage=60.0, valid_until=None)
    rule2 = ProductSplitRule(product_id=prod.id, recipient_id=rec2.id, percentage=40.0, valid_until=future_date)
    db.add_all([rule1, rule2])
    db.commit()

    req = CheckoutProcessRequest(
        slug=prod.slug,
        name="Aluno Ativo",
        email="aluno@example.com",
        phone="11977776666",
        payment_method="credit_card"
    )

    result = process_checkout(db=db, request=req)

    splits = db.query(OrderSplit).filter(OrderSplit.order_id == result.order_id).order_by(OrderSplit.recipient_id.asc()).all()

    assert len(splits) == 2
    split_rec1 = next(s for s in splits if s.recipient_id == rec1.id)
    split_rec2 = next(s for s in splits if s.recipient_id == rec2.id)

    assert split_rec1.percentage == 60.0
    assert split_rec1.amount_brl == 600.0

    assert split_rec2.percentage == 40.0
    assert split_rec2.amount_brl == 400.0
