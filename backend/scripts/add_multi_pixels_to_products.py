"""
Script de migração: Adiciona as colunas 'google_ads_id', 'google_ads_conversion_label' e 'tiktok_pixel_id' na tabela 'products'.
Permite rastreamento multi-pixel unificado para Google Ads e TikTok Ads.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando colunas de Multi-Pixel (Google Ads e TikTok Ads) na tabela 'products'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(products);")).fetchall()
                cols = [r[1] for r in result]
                
                if "google_ads_id" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN google_ads_id VARCHAR(50);"))
                    print("✅ [SQLite] Coluna 'google_ads_id' adicionada com sucesso em 'products'.")
                else:
                    print("ℹ️ [SQLite] Coluna 'google_ads_id' já existe em 'products'.")

                if "google_ads_conversion_label" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN google_ads_conversion_label VARCHAR(100);"))
                    print("✅ [SQLite] Coluna 'google_ads_conversion_label' adicionada com sucesso em 'products'.")
                else:
                    print("ℹ️ [SQLite] Coluna 'google_ads_conversion_label' já existe em 'products'.")

                if "tiktok_pixel_id" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN tiktok_pixel_id VARCHAR(50);"))
                    print("✅ [SQLite] Coluna 'tiktok_pixel_id' adicionada com sucesso em 'products'.")
                else:
                    print("ℹ️ [SQLite] Coluna 'tiktok_pixel_id' já existe em 'products'.")

                connection.commit()
            else:
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS google_ads_id VARCHAR(50);"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS google_ads_conversion_label VARCHAR(100);"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS tiktok_pixel_id VARCHAR(50);"))
                connection.commit()
                print("✅ [PostgreSQL] Colunas 'google_ads_id', 'google_ads_conversion_label' e 'tiktok_pixel_id' adicionadas com sucesso em 'products'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
