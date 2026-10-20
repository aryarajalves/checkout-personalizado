"""
Script de migração: Adiciona colunas de Vídeo de Vendas (Mini-VSL) e Player de Áudio WhatsApp no Topo do Checkout (#13).
Tabela afetada: 'products'
Colunas adicionadas:
- header_media_type (VARCHAR(30) DEFAULT 'none')
- header_video_url (VARCHAR(500))
- header_audio_url (VARCHAR(500))
- header_audio_author_name (VARCHAR(100) DEFAULT 'Mensagem do Especialista')
- header_audio_author_avatar (VARCHAR(500))
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas de vídeo e áudio WhatsApp no topo do checkout...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        media_columns = [
            ("header_media_type", "VARCHAR(30) DEFAULT 'none'"),
            ("header_video_url", "VARCHAR(500)"),
            ("header_audio_url", "VARCHAR(500)"),
            ("header_audio_author_name", "VARCHAR(100) DEFAULT 'Mensagem do Especialista'"),
            ("header_audio_author_avatar", "VARCHAR(500)")
        ]

        if dialect == "sqlite":
            res = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            existing_cols = [r[1] for r in res]
            
            for col_name, col_type in media_columns:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'products' (SQLite).")
                else:
                    print(f"Coluna '{col_name}' já existe em 'products'.")
            conn.commit()

        elif dialect == "postgresql":
            for col_name, col_type in media_columns:
                conn.execute(text(f"""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name='products' AND column_name='{col_name}'
                        ) THEN 
                            ALTER TABLE products ADD COLUMN {col_name} {col_type}; 
                        END IF; 
                    END $$;
                """))
                print(f"Coluna '{col_name}' verificada/adicionada em 'products' (PostgreSQL).")
            conn.commit()

        else:
            print(f"Dialeto {dialect} não suportado diretamente pelo script.")
            return

    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
