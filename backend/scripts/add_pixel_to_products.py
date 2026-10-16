"""
Script de migração: Adiciona a coluna 'meta_pixel_id' na tabela 'products'.
Permite vincular o identificador do Pixel do Meta/Facebook para rastreamento de PageView, InitiateCheckout e Purchase.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando coluna 'meta_pixel_id' na tabela 'products'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(products);")).fetchall()
                cols = [r[1] for r in result]
                if "meta_pixel_id" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN meta_pixel_id VARCHAR(50);"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'meta_pixel_id' adicionada com sucesso em 'products'.")
                else:
                    print("ℹ️ [SQLite] Coluna 'meta_pixel_id' já existe em 'products'.")
            else:
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_pixel_id VARCHAR(50);"))
                connection.commit()
                print("✅ [PostgreSQL] Coluna 'meta_pixel_id' adicionada com sucesso em 'products'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
