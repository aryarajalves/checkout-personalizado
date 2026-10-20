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
from app.models.product import Product, ProductOffer, ProductSplitRule, ProductUpsell
from app.models.order import Order, OrderPayment, OrderSplit
from app.schemas.product import ProductUpsellCreate, ProductUpsellUpdate
from app.schemas.order import OneClickBuyRequest
from app.services import upsell_service

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
        api_key="ak_test_upsell_12345",
        public_key="pk_test_upsell_12345"
    )
    db.add(gw)

    # Produto Principal
    p_main = Product(
        name="Mentoria Principal",
        slug="mentoria-principal",
        price_brl=197.00,
        is_active=True
    )
    db.add(p_main)
    db.flush()

    # Produto B do Catálogo (para UpSell)
    p_upsell = Product(
        name="Acelerador VIP",
        slug="acelerador-vip",
        price_brl=297.00,
        is_active=True
    )
    db.add(p_upsell)
    db.flush()

    # Oferta para o Produto B
    off_vip = ProductOffer(
        product_id=p_upsell.id,
        name="Oferta Promocional VIP",
        slug="vip-promocional",
        price_brl=97.00,
        is_active=True
    )
    db.add(off_vip)

    # Produto C do Catálogo (para Downsell)
    p_downsell = Product(
        name="E-book Essencial",
        slug="ebook-essencial",
        price_brl=47.00,
        is_active=True
    )
    db.add(p_downsell)

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)

def get_auth_token(client: TestClient) -> str:
    res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    return res.json()["access_token"]

def test_upsell_crud_with_catalog_and_downsell():
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()
    p_upsell = db.query(Product).filter(Product.slug == "acelerador-vip").first()
    off_vip = db.query(ProductOffer).filter(ProductOffer.slug == "vip-promocional").first()
    p_dw = db.query(Product).filter(Product.slug == "ebook-essencial").first()

    create_data = ProductUpsellCreate(
        title="Espere! Acesso ao Acelerador VIP",
        subtitle="Leve com super desconto",
        description="Treinamento avançado com mentoria semanal.",
        price_brl=97.00,
        upsell_product_id=p_upsell.id,
        upsell_offer_id=off_vip.id,
        enable_downsell=True,
        downsell_product_id=p_dw.id,
        downsell_title="Não perca o E-book Essencial",
        downsell_description="Versão resumida e prática.",
        downsell_price_brl=27.00
    )

    created = upsell_service.create_product_upsell(db, p_main.id, create_data)
    assert created.id is not None
    assert created.upsell_product_id == p_upsell.id
    assert created.upsell_offer_id == off_vip.id
    assert created.upsell_product_name == "Acelerador VIP"
    assert created.upsell_offer_name == "Oferta Promocional VIP"
    assert created.enable_downsell is True
    assert created.downsell_product_id == p_dw.id
    assert created.downsell_product_name == "E-book Essencial"
    assert created.downsell_price_brl == 27.00

    # Atualiza Downsell
    update_data = ProductUpsellUpdate(
        price_brl=87.00,
        downsell_price_brl=19.90,
        enable_downsell=False
    )
    updated = upsell_service.update_product_upsell(db, p_main.id, created.id, update_data)
    assert updated.price_brl == 87.00
    assert updated.downsell_price_brl == 19.90
    assert updated.enable_downsell is False

    # Deleta Upsell
    del_res = upsell_service.delete_product_upsell(db, p_main.id, created.id)
    assert "removido com sucesso" in del_res["message"]
    db.close()

def test_one_click_buy_credit_card():
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()
    p_upsell = db.query(Product).filter(Product.slug == "acelerador-vip").first()

    # Cria upsell no produto principal
    up = ProductUpsell(
        product_id=p_main.id,
        upsell_product_id=p_upsell.id,
        title="Upgrade VIP 1-Clique",
        price_brl=97.00,
        is_active=True
    )
    db.add(up)

    # Cria pedido pai pago com Cartão de Crédito
    parent_order = Order(
        order_code="ORD-20261017-CC01",
        product_id=p_main.id,
        customer_name="Roberto Silva",
        customer_email="roberto@teste.com",
        customer_phone="11999998888",
        customer_cpf="12345678909",
        amount_brl=197.00,
        payment_method="credit_card",
        status="paid",
        card_token="tok_card_roberto_123",
        paid_at=datetime.now(timezone.utc)
    )
    db.add(parent_order)
    db.commit()

    req = OneClickBuyRequest(
        order_code="ORD-20261017-CC01",
        offer_type="upsell"
    )

    resp = upsell_service.process_one_click_buy(db, req)
    assert resp.success is True
    assert resp.status == "paid"
    assert resp.payment_method == "credit_card"
    assert resp.amount_brl == 97.00
    assert resp.parent_order_code == "ORD-20261017-CC01"
    assert resp.order_code.endswith("-UP")

    # Verifica pedido filho no banco
    child = db.query(Order).filter(Order.order_code == resp.order_code).first()
    assert child is not None
    assert child.parent_order_id == parent_order.id
    assert child.order_type == "upsell"
    assert child.status == "paid"
    assert child.product_id == p_upsell.id
    assert len(child.payments) == 1
    assert child.payments[0].status == "paid"
    db.close()

def test_one_click_buy_pix_generates_qr():
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()
    p_upsell = db.query(Product).filter(Product.slug == "acelerador-vip").first()

    up = ProductUpsell(
        product_id=p_main.id,
        upsell_product_id=p_upsell.id,
        title="Upgrade VIP via Pix",
        price_brl=97.00,
        is_active=True
    )
    db.add(up)

    # Pedido pai pago por Pix
    parent_order = Order(
        order_code="ORD-20261017-PIX01",
        product_id=p_main.id,
        customer_name="Amanda Souza",
        customer_email="amanda@teste.com",
        customer_phone="11988887777",
        amount_brl=197.00,
        payment_method="pix",
        status="paid"
    )
    db.add(parent_order)
    db.commit()

    req = OneClickBuyRequest(
        order_code="ORD-20261017-PIX01",
        offer_type="upsell"
    )

    resp = upsell_service.process_one_click_buy(db, req)
    assert resp.success is True
    assert resp.status == "pending"
    assert resp.payment_method == "pix"
    assert resp.amount_brl == 97.00
    assert resp.qr_code_base64 is not None
    assert resp.qr_code_text is not None

    child = db.query(Order).filter(Order.order_code == resp.order_code).first()
    assert child is not None
    assert child.status == "pending"
    assert child.payment_method == "pix"
    db.close()

def test_one_click_buy_downsell_transition():
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()
    p_dw = db.query(Product).filter(Product.slug == "ebook-essencial").first()

    up = ProductUpsell(
        product_id=p_main.id,
        title="UpSell Normal",
        price_brl=197.00,
        enable_downsell=True,
        downsell_product_id=p_dw.id,
        downsell_title="Oferta Especial Downsell",
        downsell_price_brl=29.00,
        is_active=True
    )
    db.add(up)

    parent_order = Order(
        order_code="ORD-20261017-DW01",
        product_id=p_main.id,
        customer_name="Carlos Downsell",
        customer_email="carlos@teste.com",
        customer_phone="11977776666",
        amount_brl=197.00,
        payment_method="credit_card",
        status="paid",
        card_token="tok_carlos_123"
    )
    db.add(parent_order)
    db.commit()

    req = OneClickBuyRequest(
        order_code="ORD-20261017-DW01",
        offer_type="downsell"
    )

    resp = upsell_service.process_one_click_buy(db, req)
    assert resp.success is True
    assert resp.status == "paid"
    assert resp.offer_type == "downsell"
    assert resp.amount_brl == 29.00
    assert resp.order_code.endswith("-DW")

    child = db.query(Order).filter(Order.order_code == resp.order_code).first()
    assert child.order_type == "downsell"
    assert child.amount_brl == 29.00
    assert child.product_id == p_dw.id
    db.close()

def test_one_click_buy_downsell_disabled_blocked():
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()

    up = ProductUpsell(
        product_id=p_main.id,
        title="UpSell Sem Downsell",
        price_brl=97.00,
        enable_downsell=False, # Downsell desabilitado
        is_active=True
    )
    db.add(up)

    parent_order = Order(
        order_code="ORD-20261017-NO-DW",
        product_id=p_main.id,
        customer_name="Teste Blocked",
        customer_email="blocked@teste.com",
        customer_phone="11977776666",
        amount_brl=197.00,
        payment_method="credit_card",
        status="paid"
    )
    db.add(parent_order)
    db.commit()

    req = OneClickBuyRequest(
        order_code="ORD-20261017-NO-DW",
        offer_type="downsell"
    )

    with pytest.raises(Exception) as exc_info:
        upsell_service.process_one_click_buy(db, req)
    assert "Downsell não está habilitado" in str(exc_info.value)
    db.close()

def test_api_one_click_buy_endpoint():
    client = TestClient(app)
    db = TestingSessionLocal()
    p_main = db.query(Product).filter(Product.slug == "mentoria-principal").first()

    up = ProductUpsell(
        product_id=p_main.id,
        title="Oferta API 1-Clique",
        price_brl=49.00,
        is_active=True
    )
    db.add(up)

    parent_order = Order(
        order_code="ORD-20261017-API-UP",
        product_id=p_main.id,
        customer_name="Cliente API",
        customer_email="api@teste.com",
        customer_phone="11955554444",
        amount_brl=100.00,
        payment_method="credit_card",
        status="paid",
        card_token="tok_card_api"
    )
    db.add(parent_order)
    db.commit()
    db.close()

    res = client.post(
        f"{settings.API_V1_STR}/checkout/one-click-buy",
        json={"order_code": "ORD-20261017-API-UP", "offer_type": "upsell"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "paid"
    assert data["amount_brl"] == 49.00
    assert data["order_code"].endswith("-UP")
