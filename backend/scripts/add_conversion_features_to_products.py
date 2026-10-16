"""
Script de migração: Adiciona colunas de conversão (timer_enabled, timer_minutes, timer_text, testimonials) na tabela 'products'.
Permite configurar cronômetro de escassez e depoimentos / prova social no checkout.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando colunas de conversão (timer e depoimentos) na tabela 'products'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(products);")).fetchall()
                cols = [r[1] for r in result]
                if "timer_enabled" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN timer_enabled BOOLEAN DEFAULT 0 NOT NULL;"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'timer_enabled' adicionada com sucesso em 'products'.")
                if "timer_minutes" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN timer_minutes INTEGER DEFAULT 15 NOT NULL;"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'timer_minutes' adicionada com sucesso em 'products'.")
                if "timer_text" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN timer_text VARCHAR(255) DEFAULT 'Esta oferta especial expira em:' NOT NULL;"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'timer_text' adicionada com sucesso em 'products'.")
                if "testimonials" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN testimonials TEXT;"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'testimonials' adicionada com sucesso em 'products'.")
            else:
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN DEFAULT FALSE NOT NULL;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS timer_minutes INTEGER DEFAULT 15 NOT NULL;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS timer_text VARCHAR(255) DEFAULT 'Esta oferta especial expira em:' NOT NULL;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS testimonials TEXT;"))
                connection.commit()
                print("✅ [PostgreSQL] Colunas 'timer_enabled', 'timer_minutes', 'timer_text' e 'testimonials' adicionadas com sucesso em 'products'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
