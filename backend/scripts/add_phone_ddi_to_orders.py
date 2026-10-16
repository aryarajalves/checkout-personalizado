"""
Script de migração: Adiciona coluna 'customer_phone_ddi' na tabela 'orders'.
Permite registrar o código DDI do país de forma isolada para enriquecer os webhooks e integrações.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando coluna 'customer_phone_ddi' na tabela 'orders'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(orders);")).fetchall()
                cols = [r[1] for r in result]
                if "customer_phone_ddi" not in cols:
                    connection.execute(text("ALTER TABLE orders ADD COLUMN customer_phone_ddi VARCHAR(10) DEFAULT '55';"))
                    connection.commit()
                    print("✅ [SQLite] Coluna 'customer_phone_ddi' adicionada com sucesso em 'orders'.")
            else:
                connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone_ddi VARCHAR(10) DEFAULT '55';"))
                connection.commit()
                print("✅ [PostgreSQL] Coluna 'customer_phone_ddi' adicionada com sucesso em 'orders'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
