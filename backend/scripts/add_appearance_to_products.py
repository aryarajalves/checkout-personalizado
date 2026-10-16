"""
Script de migração: Adiciona colunas 'primary_color' e 'logo_url' na tabela 'products'.
Permite personalizar a identidade visual do checkout (cor da marca do expert e logotipo no cabeçalho).
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando colunas de aparência na tabela 'products'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(products);")).fetchall()
                cols = [r[1] for r in result]
                if "primary_color" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN primary_color VARCHAR(30) DEFAULT '#0284c7';"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'primary_color' adicionada com sucesso em 'products'.")
                if "logo_url" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN logo_url VARCHAR(500);"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'logo_url' adicionada com sucesso em 'products'.")
            else:
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS primary_color VARCHAR(30) DEFAULT '#0284c7';"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);"))
                connection.commit()
                print("✅ [PostgreSQL] Colunas 'primary_color' e 'logo_url' adicionadas com sucesso em 'products'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
