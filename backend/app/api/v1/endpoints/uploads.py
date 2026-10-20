import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.core.logger import logger

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    # Imagens
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
    # Áudios
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".opus",
    # Vídeos
    ".mp4", ".webm", ".mov",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("")
async def upload_image(file: UploadFile = File(...)):
    """Faz upload de imagem, áudio ou vídeo com validação de extensão e tamanho, salvando localmente em static/uploads."""
    try:
        filename = file.filename or "file.bin"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Extensão de arquivo inválida ({ext}). Formatos suportados: Imagens (PNG, JPG, WEBP, GIF, SVG), Áudio (MP3, WAV, OGG, M4A, AAC) e Vídeo (MP4, WEBM, MOV)."
            )

        unique_filename = f"{uuid.uuid4().hex[:12]}_{filename.replace(' ', '_')}"
        dest_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Grava arquivo no disco
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(dest_path)
        if file_size > MAX_FILE_SIZE:
            os.remove(dest_path)
            raise HTTPException(
                status_code=400,
                detail="O arquivo excede o tamanho máximo permitido de 50MB."
            )

        logger.info(f"Upload de mídia concluído: {unique_filename} ({file_size} bytes)")
        return {
            "url": f"/api/v1/uploads/{unique_filename}",
            "filename": unique_filename,
            "size": file_size
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro inesperado no upload de mídia: {exc}")
        raise HTTPException(status_code=500, detail="Falha ao processar o upload do arquivo.")

@router.get("/{filename}")
async def get_uploaded_image(filename: str):
    """Serve um arquivo (imagem, áudio ou vídeo) enviado pelo upload."""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    
    # Determina content-type
    ext = os.path.splitext(safe_filename)[1].lower()
    media_types = {
        # Imagens
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        # Áudios
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".opus": "audio/opus",
        # Vídeos
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(file_path, media_type=media_type)
