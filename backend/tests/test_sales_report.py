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
from app.services.sales_report_service import (
    get_sales_metrics,
    list_orders_report,
    get_utm_bi_analytics,
    export_orders_csv
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

def create_sample_orders(db):
    product = Product(
        name="Curso Tráfego Pago",
        slug="curso-trafego",
        price_brl=100.0,
        is_active=True,
        require_cpf=False
    )
    db.add(product)
    db.flush()

    o1 = Order(
        order_code="ORD-TEST-001",
        product_id=product.id,
        customer_name="João Vendedor",
        customer_email="joao@test.com",
        customer_phone="11999990001",
        amount_brl=100.0,
        payment_method="pix",
        status="paid",
        utm_source="facebook",
        utm_campaign="blackfriday",
        utm_medium="stories",
        src="bio_insta",
        paid_at=datetime.now(timezone.utc)
    )
    o2 = Order(
        order_code="ORD-TEST-002",
        product_id=product.id,
        customer_name="Maria Compradora",
        customer_email="maria@test.com",
        customer_phone="11999990002",
        amount_brl=200.0,
        payment_method="credit_card",
        status="paid",
        utm_source="google",
        utm_campaign="search_lead",
        utm_medium="cpc",
        src="adwords",
        paid_at=datetime.now(timezone.utc)
    )
    o3 = Order(
        order_code="ORD-TEST-003",
        product_id=product.id,
        customer_name="Pedro Pendente",
        customer_email="pedro@test.com",
        customer_phone="11999990003",
        amount_brl=150.0,
        payment_method="pix",
        status="pending",
        utm_source="facebook",
        utm_campaign="blackfriday",
        utm_medium="feed"
    )
    o4 = Order(
        order_code="ORD-TEST-004",
        product_id=product.id,
        customer_name="Lucas Cancelado",
        customer_email="lucas@test.com",
        customer_phone="11999990004",
        amount_brl=100.0,
        payment_method="credit_card",
        status="canceled"
    )
    db.add_all([o1, o2, o3, o4])
    db.commit()
    return product, [o1, o2, o3, o4]


def test_sales_metrics_calculation():
    db = TestingSessionLocal()
    product, orders = create_sample_orders(db)

    metrics = get_sales_metrics(db)
    assert metrics.total_orders_count == 4
    assert metrics.paid_orders_count == 2
    assert metrics.pending_orders_count == 1
    assert metrics.failed_orders_count == 1
    assert metrics.total_revenue_brl == 300.0  # 100 + 200
    assert metrics.pending_revenue_brl == 150.0
    assert metrics.average_ticket_brl == 150.0  # 300 / 2
    assert metrics.conversion_rate_percent == 50.0  # 2 / 4

    # Verifica breakdown por método
    pix_metric = next(m for m in metrics.payment_methods_metrics if m.method == "pix")
    assert pix_metric.count == 2
    assert pix_metric.paid_count == 1
    assert pix_metric.revenue_brl == 100.0

    card_metric = next(m for m in metrics.payment_methods_metrics if m.method == "credit_card")
    assert card_metric.count == 2
    assert card_metric.paid_count == 1
    assert card_metric.revenue_brl == 200.0

    db.close()


def test_utm_bi_aggregation():
    db = TestingSessionLocal()
    product, orders = create_sample_orders(db)

    bi = get_utm_bi_analytics(db)
    # Por source
    sources = {item.name: item for item in bi.by_source}
    assert "facebook" in sources
    assert sources["facebook"].total_orders == 2
    assert sources["facebook"].paid_orders == 1
    assert sources["facebook"].revenue_brl == 100.0

    assert "google" in sources
    assert sources["google"].total_orders == 1
    assert sources["google"].paid_orders == 1
    assert sources["google"].revenue_brl == 200.0

    assert "(direto / orgânico)" in sources
    assert sources["(direto / orgânico)"].total_orders == 1

    # Por campanha
    campaigns = {item.name: item for item in bi.by_campaign}
    assert "blackfriday" in campaigns
    assert campaigns["blackfriday"].total_orders == 2

    db.close()


def test_orders_report_filters_and_export():
    db = TestingSessionLocal()
    product, orders = create_sample_orders(db)

    # Filtro por status
    paid_items, total_paid = list_orders_report(db, status_filter="paid")
    assert total_paid == 2
    assert len(paid_items) == 2

    # Filtro por UTM Source
    fb_items, total_fb = list_orders_report(db, utm_source="facebook")
    assert total_fb == 2

    # Busca por texto
    search_items, total_search = list_orders_report(db, search="Maria")
    assert total_search == 1
    assert search_items[0].customer_name == "Maria Compradora"

    # Exportação CSV
    csv_str = export_orders_csv(db)
    assert "\ufeff" in csv_str  # UTF-8 BOM
    assert "Código;Data/Hora;Cliente" in csv_str
    assert "ORD-TEST-001" in csv_str
    assert "facebook" in csv_str

    db.close()


def test_sales_endpoints_api():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    product, orders = create_sample_orders(db)
    order_id = orders[0].id
    db.close()

    # 1. Métricas
    res_metrics = client.get("/api/v1/sales/metrics", headers=headers)
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert metrics["total_revenue_brl"] == 300.0
    assert metrics["paid_orders_count"] == 2

    # 2. Relatório de Pedidos
    res_orders = client.get("/api/v1/sales/orders", headers=headers)
    assert res_orders.status_code == 200
    order_list = res_orders.json()
    assert len(order_list) == 4

    # 3. Detalhes de Pedido
    res_detail = client.get(f"/api/v1/sales/orders/{order_id}", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["order_code"] == "ORD-TEST-001"
    assert detail["utm_source"] == "facebook"

    # 4. BI de UTMs
    res_bi = client.get("/api/v1/sales/utm-bi", headers=headers)
    assert res_bi.status_code == 200
    bi_data = res_bi.json()
    assert "by_source" in bi_data
    assert len(bi_data["by_source"]) >= 2

    # 5. Exportação CSV
    res_csv = client.get("/api/v1/sales/export-csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "attachment; filename=" in res_csv.headers["content-disposition"]


def test_checkout_captures_utm_parameters():
    db = TestingSessionLocal()
    product = Product(
        name="E-book Marketing",
        slug="ebook-mkt",
        price_brl=49.90,
        is_active=True,
        require_cpf=False
    )
    db.add(product)
    db.commit()
    db.close()

    payload = {
        "slug": "ebook-mkt",
        "name": "Cliente UTM",
        "email": "utm@example.com",
        "phone": "11966665555",
        "payment_method": "pix",
        "utm_source": "tiktok",
        "utm_medium": "reels",
        "utm_campaign": "viral_01",
        "utm_content": "video_a",
        "utm_term": "empreendedorismo",
        "src": "link_bio",
        "sck": "chk_01"
    }

    response = client.post("/api/v1/checkout/process", json=payload)
    assert response.status_code == 201

    db2 = TestingSessionLocal()
    order = db2.query(Order).filter(Order.customer_email == "utm@example.com").first()
    assert order is not None
    assert order.utm_source == "tiktok"
    assert order.utm_medium == "reels"
    assert order.utm_campaign == "viral_01"
    assert order.utm_content == "video_a"
    assert order.utm_term == "empreendedorismo"
    assert order.src == "link_bio"
    assert order.sck == "chk_01"
    db2.close()
