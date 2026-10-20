import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_image_success():
    # Cria uma imagem PNG de teste (bytes simples de cabeçalho PNG)
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("banner.png", io.BytesIO(png_bytes), "image/png")}
    response = client.post("/api/v1/uploads", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/api/v1/uploads/")
    assert "filename" in data

    # Testa busca da imagem pelo endpoint GET
    filename = data["filename"]
    get_res = client.get(f"/api/v1/uploads/{filename}")
    assert get_res.status_code == 200
    assert get_res.content == png_bytes

def test_upload_image_invalid_extension():
    txt_bytes = b"arquivo texto nao permitido"
    files = {"file": ("arquivo.exe", io.BytesIO(txt_bytes), "application/octet-stream")}
    response = client.post("/api/v1/uploads", files=files)
    assert response.status_code == 400
    assert "Extensão de arquivo inválida" in response.json()["detail"]

def test_upload_audio_success():
    # Cria bytes simulados de arquivo MP3
    mp3_bytes = b"ID3\x03\x00\x00\x00\x00\x00#TSSE\x00\x00\x00\x0f\x00\x00\x03Lavf58.29.100\x00"
    files = {"file": ("audio_especialista.mp3", io.BytesIO(mp3_bytes), "audio/mpeg")}
    response = client.post("/api/v1/uploads", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/api/v1/uploads/")
    assert data["filename"].endswith(".mp3")

    filename = data["filename"]
    get_res = client.get(f"/api/v1/uploads/{filename}")
    assert get_res.status_code == 200
    assert "audio/mpeg" in get_res.headers.get("content-type", "")
    assert get_res.content == mp3_bytes

def test_upload_video_success():
    # Cria bytes simulados de arquivo MP4 (assinatura ftyp)
    mp4_bytes = b"\x00\x00\x00 ftypisom\x02\x00\x00\x00isomiso2avc1mp41"
    files = {"file": ("minivsl.mp4", io.BytesIO(mp4_bytes), "video/mp4")}
    response = client.post("/api/v1/uploads", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/api/v1/uploads/")
    assert data["filename"].endswith(".mp4")

    filename = data["filename"]
    get_res = client.get(f"/api/v1/uploads/{filename}")
    assert get_res.status_code == 200
    assert "video/mp4" in get_res.headers.get("content-type", "")
    assert get_res.content == mp4_bytes

def test_get_nonexistent_image():
    response = client.get("/api/v1/uploads/inexistente_12345.png")
    assert response.status_code == 404

