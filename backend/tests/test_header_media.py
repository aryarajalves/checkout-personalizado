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
from app.models.gateway import GatewaySetting
from app.models.product import Product

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
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_product_header_media_defaults():
    headers = get_auth_headers()
    
    # Criar produto
    prod_payload = {
        "name": "Curso de Produção",
        "slug": "curso-producao",
        "price_brl": 197.0
    }
    res = client.post("/api/v1/products/", json=prod_payload, headers=headers)
    assert res.status_code == 201
    prod_id = res.json()["id"]

    # Verificar aparência padrão
    app_res = client.get(f"/api/v1/products/{prod_id}/appearance", headers=headers)
    assert app_res.status_code == 200
    data = app_res.json()
    assert data["header_media_type"] == "none"
    assert data["header_video_url"] is None
    assert data["header_audio_url"] is None
    assert data["header_audio_author_name"] == "Mensagem do Especialista"

def test_update_product_appearance_video():
    headers = get_auth_headers()
    
    prod_res = client.post("/api/v1/products/", json={
        "name": "Formação Master",
        "slug": "formacao-master",
        "price_brl": 497.0
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    update_payload = {
        "header_media_type": "video",
        "header_video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
    put_res = client.put(f"/api/v1/products/{prod_id}/appearance", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["header_media_type"] == "video"
    assert data["header_video_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    # Verificar se get retorna
    get_res = client.get(f"/api/v1/products/{prod_id}/appearance", headers=headers)
    assert get_res.json()["header_media_type"] == "video"

def test_update_product_appearance_audio_whatsapp():
    headers = get_auth_headers()
    
    prod_res = client.post("/api/v1/products/", json={
        "name": "Consultoria VIP",
        "slug": "consultoria-vip",
        "price_brl": 997.0
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    update_payload = {
        "header_media_type": "audio",
        "header_audio_url": "https://cdn.exemplo.com/audios/recado_dr_roberto.mp3",
        "header_audio_author_name": "Dr. Roberto Silva",
        "header_audio_author_avatar": "https://cdn.exemplo.com/avatars/roberto.jpg"
    }
    put_res = client.put(f"/api/v1/products/{prod_id}/appearance", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["header_media_type"] == "audio"
    assert data["header_audio_url"] == "https://cdn.exemplo.com/audios/recado_dr_roberto.mp3"
    assert data["header_audio_author_name"] == "Dr. Roberto Silva"
    assert data["header_audio_author_avatar"] == "https://cdn.exemplo.com/avatars/roberto.jpg"

def test_checkout_public_product_contains_header_media():
    headers = get_auth_headers()
    
    prod_res = client.post("/api/v1/products/", json={
        "name": "Mentoria Express",
        "slug": "mentoria-express",
        "price_brl": 297.0
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    # Salva com vídeo
    client.put(f"/api/v1/products/{prod_id}/appearance", json={
        "header_media_type": "video",
        "header_video_url": "https://player.vimeo.com/video/76979871"
    }, headers=headers)

    # Consulta endpoint público de checkout (/api/v1/products/public/{slug})
    public_res = client.get("/api/v1/products/public/mentoria-express")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["header_media_type"] == "video"
    assert pub_data["header_video_url"] == "https://player.vimeo.com/video/76979871"

def test_update_product_appearance_both_video_and_audio():
    headers = get_auth_headers()
    
    prod_res = client.post("/api/v1/products/", json={
        "name": "Combo Super Conversão",
        "slug": "combo-super-conversao",
        "price_brl": 397.0
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    update_payload = {
        "header_media_type": "both",
        "header_video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "header_audio_url": "https://cdn.exemplo.com/audios/recado_especial.mp3",
        "header_audio_author_name": "Especialista VIP",
        "header_audio_author_avatar": "https://cdn.exemplo.com/avatars/vip.jpg"
    }
    put_res = client.put(f"/api/v1/products/{prod_id}/appearance", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["header_media_type"] == "both"
    assert data["header_video_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert data["header_audio_url"] == "https://cdn.exemplo.com/audios/recado_especial.mp3"

    # Verifica na rota pública de checkout
    public_res = client.get("/api/v1/products/public/combo-super-conversao")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["header_media_type"] == "both"
    assert pub_data["header_video_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert pub_data["header_audio_url"] == "https://cdn.exemplo.com/audios/recado_especial.mp3"

