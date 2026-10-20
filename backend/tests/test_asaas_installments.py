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
from app.models.product import Product, ProductOffer
from app.models.order import Order, OrderInstallment

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

    asaas_gw = GatewaySetting(
        gateway_name="asaas",
        is_active=True,
        environment="sandbox",
        api_key="mock_asaas_api_key_123",
        webhook_secret="sec_asaas_token_xyz"
    )
    db.add(asaas_gw)

    prod = Product(
        name="Mentoria High-Ticket Asaas",
        slug="mentoria-asaas-carnet",
        description="Mentoria em 12x no boleto/pix parcelado",
        price_brl=1200.00,
        is_active=True,
        enable_asaas_installments=True,
        asaas_max_installments=12,
        asaas_require_entry_pix=True
    )
    db.add(prod)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)

def get_auth_token(client: TestClient) -> str:
    res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SUPERADMIN_EMAIL, "password": settings.SUPERADMIN_PASSWORD}
    )
    return res.json()["access_token"]

def test_product_asaas_installment_fields():
    client = TestClient(app)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar produto com suporte a carnê
    res = client.post(
        "/api/v1/products/",
        json={
            "name": "Curso Carnê Digital",
            "slug": "curso-carne-digital",
            "price_brl": 600.0,
            "enable_asaas_installments": True,
            "asaas_max_installments": 6,
            "asaas_interest_percent": 1.5,
            "asaas_require_entry_pix": True
        },
        headers=headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["enable_asaas_installments"] is True
    assert data["asaas_max_installments"] == 6
    assert data["asaas_interest_percent"] == 1.5
    assert data["asaas_require_entry_pix"] is True

def test_process_asaas_installment_checkout_success():
    client = TestClient(app)

    # Simular checkout com 4 parcelas no carnê Asaas
    payload = {
        "slug": "mentoria-asaas-carnet",
        "name": "Comprador de Teste",
        "email": "comprador@teste.com",
        "phone": "11988887777",
        "phone_ddi": "55",
        "cpf": "12345678909",
        "payment_method": "asaas_installments",
        "asaas_installments": 4,
        "billing_zip_code": "01310100",
        "billing_street": "Avenida Paulista",
        "billing_number": "1000",
        "billing_neighborhood": "Bela Vista",
        "billing_city": "São Paulo",
        "billing_state": "SP"
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["payment_method"] == "asaas_installments"
    assert data["status"] == "pending"
    assert data["amount_brl"] == 1200.00
    assert len(data["installments_list"]) == 4

    # Parcela 1 é a entrada Pix
    p1 = data["installments_list"][0]
    assert p1["installment_number"] == 1
    assert p1["payment_method"] == "pix"
    assert p1["amount_brl"] == 300.00
    assert p1["qr_code_text"] is not None
    assert p1["bank_slip_url"] is not None

    # Parcelas 2, 3, 4 são boletos
    p2 = data["installments_list"][1]
    assert p2["installment_number"] == 2
    assert p2["payment_method"] == "boleto"
    assert p2["amount_brl"] == 300.00

def test_process_asaas_installment_validation_missing_cpf_and_address():
    client = TestClient(app)

    # 1. Sem CPF
    payload_no_cpf = {
        "slug": "mentoria-asaas-carnet",
        "name": "Sem CPF",
        "email": "semcpf@teste.com",
        "phone": "11999999999",
        "payment_method": "asaas_installments",
        "asaas_installments": 4,
        "billing_zip_code": "01310100",
        "billing_street": "Rua Teste",
        "billing_number": "10",
        "billing_city": "SP",
        "billing_state": "SP"
    }
    res = client.post("/api/v1/checkout/process", json=payload_no_cpf)
    assert res.status_code == 400
    assert "CPF válido" in res.json()["detail"]

    # 2. Sem endereço completo
    payload_no_addr = {
        "slug": "mentoria-asaas-carnet",
        "name": "Sem Endereço",
        "email": "semend@teste.com",
        "phone": "11999999999",
        "cpf": "12345678909",
        "payment_method": "asaas_installments",
        "asaas_installments": 4
    }
    res = client.post("/api/v1/checkout/process", json=payload_no_addr)
    assert res.status_code == 400
    assert "Endereço de cobrança completo" in res.json()["detail"]

def test_asaas_webhook_payment_confirmed_entry_approves_order():
    client = TestClient(app)

    # 1. Criar pedido carnê
    payload = {
        "slug": "mentoria-asaas-carnet",
        "name": "Aluno Carnê",
        "email": "aluno.carne@teste.com",
        "phone": "11977776666",
        "cpf": "12345678909",
        "payment_method": "asaas_installments",
        "asaas_installments": 3,
        "billing_zip_code": "01310100",
        "billing_street": "Avenida Paulista",
        "billing_number": "1500",
        "billing_city": "São Paulo",
        "billing_state": "SP"
    }
    order_res = client.post("/api/v1/checkout/process", json=payload).json()
    order_code = order_res["order_code"]
    p1 = order_res["installments_list"][0]

    # Obter payment_id da parcela 1
    db = TestingSessionLocal()
    inst1 = db.query(OrderInstallment).filter(OrderInstallment.id == p1["id"]).first()
    pay_id = inst1.asaas_payment_id
    db.close()

    # 2. Simular disparo do Webhook do Asaas confirmando o pagamento da entrada
    webhook_payload = {
        "event": "PAYMENT_CONFIRMED",
        "payment": {
            "id": pay_id,
            "status": "RECEIVED",
            "value": 400.0,
            "billingType": "PIX"
        }
    }

    res = client.post(
        "/api/v1/webhooks/asaas",
        json=webhook_payload,
        headers={"asaas-access-token": "sec_asaas_token_xyz"}
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "success"
    assert res_data["installment_status"] == "paid"
    assert res_data["order_status"] == "paid"

    # 3. Conferir no endpoint de status do pedido
    status_res = client.get(f"/api/v1/checkout/orders/by-code/{order_code}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "paid"
    assert status_data["paid_at"] is not None
    assert status_data["installments_list"][0]["status"] == "paid"
    assert status_data["installments_list"][1]["status"] == "pending"

def test_asaas_webhook_payment_overdue():
    client = TestClient(app)

    payload = {
        "slug": "mentoria-asaas-carnet",
        "name": "Aluno Inadimplente",
        "email": "aluno.atraso@teste.com",
        "phone": "11977775555",
        "cpf": "12345678909",
        "payment_method": "asaas_installments",
        "asaas_installments": 3,
        "billing_zip_code": "01310100",
        "billing_street": "Avenida Paulista",
        "billing_number": "1500",
        "billing_city": "São Paulo",
        "billing_state": "SP"
    }
    order_res = client.post("/api/v1/checkout/process", json=payload).json()
    p2 = order_res["installments_list"][1]

    db = TestingSessionLocal()
    inst2 = db.query(OrderInstallment).filter(OrderInstallment.id == p2["id"]).first()
    pay_id = inst2.asaas_payment_id
    db.close()

    # Simular webhook de parcela vencida (overdue)
    webhook_payload = {
        "event": "PAYMENT_OVERDUE",
        "payment": {
            "id": pay_id,
            "status": "OVERDUE",
            "value": 400.0,
            "billingType": "BOLETO"
        }
    }

    res = client.post(
        "/api/v1/webhooks/asaas",
        json=webhook_payload,
        headers={"asaas-access-token": "sec_asaas_token_xyz"}
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["installment_status"] == "overdue"
