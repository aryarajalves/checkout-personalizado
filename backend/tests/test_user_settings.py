"""
Testes unitários para o módulo de Configurações do Usuário, Perfil Financeiro,
e Unificação de Coprodução e Afiliação por Usuário.
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
from app.models.gateway import SplitRecipient
from app.models.affiliate import Affiliate
from app.models.product import Product, ProductSplitRule

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
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_and_update_financial_profile(client, auth_headers):
    # 1. Consulta inicial: perfil financeiro vazio
    res = client.get("/api/v1/auth/me/financial", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["has_financial_profile"] is False
    assert data["pix_key"] is None

    # 2. Atualiza dados financeiros
    payload = {
        "document": "123.456.789-00",
        "document_type": "cpf",
        "phone": "(11) 98888-7777",
        "pix_key": "socio@pix.com.br",
        "pix_key_type": "email",
        "crypto_wallet": "0x1234567890123456789012345678901234567890",
        "crypto_network": "polygon",
        "external_recipient_id": "re_pagarme_12345"
    }
    update_res = client.put("/api/v1/auth/me/financial", json=payload, headers=auth_headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["has_financial_profile"] is True
    assert updated_data["pix_key"] == "socio@pix.com.br"
    assert updated_data["document"] == "123.456.789-00"

    # 3. Verifica sincronização automática com SplitRecipient
    db = TestingSessionLocal()
    rec = db.query(SplitRecipient).filter(SplitRecipient.pix_key == "socio@pix.com.br").first()
    assert rec is not None
    assert rec.email == settings.SUPERADMIN_EMAIL
    assert rec.document == "123.456.789-00"
    db.close()

def test_update_profile_and_change_password(client, auth_headers):
    # 1. Altera apenas o nome
    res = client.put("/api/v1/auth/me/profile", json={"name": "Super Admin Atualizado"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Super Admin Atualizado"

    # 2. Tenta trocar senha com senha atual incorreta -> 400
    res_bad = client.put("/api/v1/auth/me/profile", json={
        "current_password": "SenhaErrada@123!",
        "new_password": "NovaSenhaForte@2026!"
    }, headers=auth_headers)
    assert res_bad.status_code == 400
    assert "incorreta" in res_bad.json()["detail"].lower()

    # 3. Troca senha com sucesso
    res_ok = client.put("/api/v1/auth/me/profile", json={
        "current_password": settings.SUPERADMIN_PASSWORD,
        "new_password": "NovaSenhaForte@2026!"
    }, headers=auth_headers)
    assert res_ok.status_code == 200

    # 4. Testa login com a nova senha
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": "NovaSenhaForte@2026!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_split_recipients_automatically_syncs_users(client, auth_headers):
    # Cria um novo usuário comum no banco
    db = TestingSessionLocal()
    coprodutor = User(
        email="coprodutor.expert@email.com",
        name="Jordão Coprodutor",
        hashed_password=get_password_hash("Senha@12345678"),
        role="admin",
        document="999.888.777-66",
        pix_key="99988877766",
        pix_key_type="cpf",
        is_active=True
    )
    db.add(coprodutor)
    db.commit()
    db.close()

    # Lista recebedores de split via API
    res = client.get("/api/v1/split-recipients", headers=auth_headers)
    assert res.status_code == 200
    recipients = res.json()
    
    # O usuário Jordão deve constar automaticamente na lista de recebedores
    matched = [r for r in recipients if r["email"] == "coprodutor.expert@email.com"]
    assert len(matched) == 1
    assert matched[0]["name"] == "Jordão Coprodutor"
    assert matched[0]["pix_key"] == "99988877766"

def test_user_joins_as_affiliate_and_uses_same_pix(client, auth_headers):
    # 1. Configura dados financeiros do usuário
    client.put("/api/v1/auth/me/financial", json={
        "document": "111.222.333-44",
        "phone": "(11) 97777-6666",
        "pix_key": "chave.afiliado@pix.com",
        "pix_key_type": "email"
    }, headers=auth_headers)

    # 2. Usuário ativa afiliação (/api/v1/affiliates/me/join)
    join_res = client.post("/api/v1/affiliates/me/join", headers=auth_headers)
    assert join_res.status_code == 200
    aff_data = join_res.json()
    assert aff_data["email"] == settings.SUPERADMIN_EMAIL
    assert aff_data["pix_key"] == "chave.afiliado@pix.com"
    assert aff_data["document"] == "111.222.333-44"
    assert "affiliate_code" in aff_data

    # 3. Consulta perfil de afiliado
    get_res = client.get("/api/v1/affiliates/me/profile", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["affiliate_code"] == aff_data["affiliate_code"]

def test_user_is_coproducer_and_affiliate_simultaneously(client, auth_headers):
    # Cria usuário sócio/afiliado
    db = TestingSessionLocal()
    user_multi = User(
        email="multi.perfil@email.com",
        name="Parceiro Multifunção",
        hashed_password=get_password_hash("Senha@12345678"),
        role="admin",
        document="555.444.333-22",
        pix_key="multi@pix.com.br",
        is_active=True
    )
    db.add(user_multi)
    db.commit()
    db.refresh(user_multi)

    # Cria produto para split
    prod = Product(
        name="Curso Master",
        slug="curso-master",
        price_brl=100.0,
        is_active=True
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    # Cria split_recipient para o usuário
    rec = SplitRecipient(
        user_id=user_multi.id,
        name=user_multi.name,
        email=user_multi.email,
        document=user_multi.document,
        pix_key=user_multi.pix_key,
        default_percentage=30.0,
        is_active=True
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Vincula o usuário como coprodutor (split) do Curso Master
    rule = ProductSplitRule(
        product_id=prod.id,
        recipient_id=rec.id,
        percentage=30.0
    )
    db.add(rule)

    # Vincula o mesmo usuário como afiliado
    aff = Affiliate(
        user_id=user_multi.id,
        name=user_multi.name,
        email=user_multi.email,
        phone="11999998888",
        document=user_multi.document,
        pix_key=user_multi.pix_key,
        affiliate_code="MULTI10",
        default_commission_percent=20.0,
        is_active=True
    )
    db.add(aff)
    db.commit()

    # Valida que o mesmo user_id é coprodutor no produto e afiliado
    split_count = db.query(ProductSplitRule).filter(ProductSplitRule.recipient_id == rec.id).count()
    aff_count = db.query(Affiliate).filter(Affiliate.user_id == user_multi.id).count()
    assert split_count == 1
    assert aff_count == 1
    assert rec.pix_key == aff.pix_key == "multi@pix.com.br"
    db.close()
