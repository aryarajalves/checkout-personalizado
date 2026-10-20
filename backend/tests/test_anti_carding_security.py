import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.models.security import BlacklistEntry, CardAttemptLog, SecuritySettings
from app.services import security_service

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


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Criar settings padrão
    security_service.get_security_settings(db)
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def test_blacklist_crud_and_normalization():
    db = TestingSessionLocal()
    
    # 1. Adicionar entrada de CPF com pontuação (deve ser normalizado)
    entry_cpf = security_service.add_blacklist_entry(
        db,
        security_service.BlacklistEntryCreate(
            entry_type="cpf",
            value="123.456.789-00",
            reason="Fraude confirmada"
        )
    )
    assert entry_cpf.value == "12345678900"
    assert entry_cpf.is_active is True

    # 2. Adicionar entrada de Email em maiúsculas (deve virar lowercase)
    entry_email = security_service.add_blacklist_entry(
        db,
        security_service.BlacklistEntryCreate(
            entry_type="email",
            value="GOLPISTA@FRAUDE.COM",
            reason="Tentativas de carding"
        )
    )
    assert entry_email.value == "golpista@fraude.com"

    # 3. Verificar bloqueio
    is_bl, reason = security_service.check_is_blacklisted(db, cpf="12345678900")
    assert is_bl is True
    assert "Fraude confirmada" in reason

    is_bl_email, _ = security_service.check_is_blacklisted(db, email="golpista@fraude.com")
    assert is_bl_email is True

    # Não bloqueia dados limpos
    is_bl_clean, _ = security_service.check_is_blacklisted(db, cpf="99988877766", email="cliente_bom@gmail.com")
    assert is_bl_clean is False

    # 4. Listagem e Busca
    entries = security_service.list_blacklist_entries(db, search="golpista")
    assert len(entries) == 1
    assert entries[0].entry_type == "email"

    # 5. Exclusão
    deleted = security_service.delete_blacklist_entry(db, entry_cpf.id)
    assert deleted is True
    is_bl_after_del, _ = security_service.check_is_blacklisted(db, cpf="12345678900")
    assert is_bl_after_del is False
    db.close()


def test_velocity_check_blocks_after_5_failed_attempts():
    db = TestingSessionLocal()
    ip_test = "192.168.1.100"
    cpf_test = "11122233344"

    # 0 tentativas: Liberado
    is_blocked, fails, _ = security_service.check_velocity_limit(db, ip_address=ip_test, cpf=cpf_test)
    assert is_blocked is False
    assert fails == 0

    # Simular 4 tentativas recusadas
    for i in range(4):
        security_service.log_card_attempt(
            db,
            ip_address=ip_test,
            cpf=cpf_test,
            status="declined",
            reason="Cartão recusado pelo banco"
        )

    # 4 tentativas: Ainda dentro do limite (< 5)
    is_blocked, fails, _ = security_service.check_velocity_limit(db, ip_address=ip_test, cpf=cpf_test)
    assert is_blocked is False
    assert fails == 4

    # 5ª tentativa recusada
    security_service.log_card_attempt(
        db,
        ip_address=ip_test,
        cpf=cpf_test,
        status="declined",
        reason="Saldo insuficiente"
    )

    # Agora deve estar BLOQUEADO (5 falhas atingidas em menos de 10 minutos)
    is_blocked, fails, msg = security_service.check_velocity_limit(db, ip_address=ip_test, cpf=cpf_test)
    assert is_blocked is True
    assert fails == 5
    assert "Múltiplas tentativas de cartão recusadas recentemente" in msg
    db.close()


def test_checkout_endpoint_blocks_blacklisted_customer():
    db = TestingSessionLocal()
    # Criar produto
    prod = Product(
        name="Mentoria VIP",
        slug="mentoria-vip",
        price_brl=150.0,
        is_active=True,
        payment_methods="all"
    )
    db.add(prod)
    db.commit()

    # Adicionar CPF do fraudador na Blacklist
    security_service.add_blacklist_entry(
        db,
        security_service.BlacklistEntryCreate(
            entry_type="cpf",
            value="12345678909",
            reason="Fraude anterior no gateway"
        )
    )

    # Tentar finalizar checkout com o CPF bloqueado
    payload = {
        "slug": "mentoria-vip",
        "name": "Fraudador",
        "email": "teste@fraude.com",
        "phone": "11988887777",
        "cpf": "12345678909",
        "payment_method": "credit_card",
        "card_number": "4000000000004242",
        "card_holder_name": "Fraudador",
        "card_expiry": "12/28",
        "card_cvv": "123"
    }

    res = client.post("/api/v1/checkout/process", json=payload)
    assert res.status_code == 403
    assert "Transação não autorizada" in res.json()["detail"]
    db.close()


def test_checkout_endpoint_blocks_velocity_exceeded():
    db = TestingSessionLocal()
    # Criar produto
    prod = Product(
        name="Curso Prático",
        slug="curso-pratico",
        price_brl=97.0,
        is_active=True,
        payment_methods="all"
    )
    db.add(prod)
    db.commit()

    # Simular 5 tentativas com status 'declined' para o mesmo email/IP
    client_ip = "200.100.50.25"
    test_email = "atacante@bot.com"

    for _ in range(5):
        security_service.log_card_attempt(
            db,
            ip_address=client_ip,
            email=test_email,
            status="declined",
            reason="Card test"
        )

    # Tentar compra no cartão com esse IP e email
    payload = {
        "slug": "curso-pratico",
        "name": "Robô de Testes",
        "email": test_email,
        "phone": "11999990000",
        "payment_method": "credit_card",
        "card_number": "4000000000004242",
        "card_holder_name": "Robo",
        "card_expiry": "10/30",
        "card_cvv": "999"
    }

    headers = {"x-forwarded-for": client_ip}
    res = client.post("/api/v1/checkout/process", json=payload, headers=headers)
    assert res.status_code == 429
    assert "Múltiplas tentativas de cartão recusadas recentemente" in res.json()["detail"]
    db.close()


def test_auto_blacklist_on_chargeback():
    db = TestingSessionLocal()
    # Criar pedido
    prod = Product(name="P", slug="p", price_brl=10.0, is_active=True)
    db.add(prod)
    db.commit()

    order = Order(
        order_code="ORD-CHG-999",
        product_id=prod.id,
        customer_name="Comprador Contestador",
        customer_email="contestador@gmail.com",
        customer_phone="11977776666",
        customer_cpf="33344455566",
        amount_brl=10.0,
        status="paid"
    )
    db.add(order)
    db.commit()

    # Executar auto blacklist
    entries = security_service.handle_auto_blacklist_chargeback(db, order)
    assert len(entries) >= 2 # CPF e Email adicionados

    # Validar que agora o CPF e o Email constam bloqueados
    is_bl_cpf, _ = security_service.check_is_blacklisted(db, cpf="33344455566")
    is_bl_email, _ = security_service.check_is_blacklisted(db, email="contestador@gmail.com")

    assert is_bl_cpf is True
    assert is_bl_email is True
    db.close()
