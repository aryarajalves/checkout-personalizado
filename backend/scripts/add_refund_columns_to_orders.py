"""
Script de migração: Adiciona colunas 'refund_reason' e 'refunded_at' na tabela 'orders'.
Permite rastrear o motivo e a data/hora do estorno de compras.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando colunas de reembolso na tabela 'orders'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(orders);")).fetchall()
                cols = [r[1] for r in result]
                if "refund_reason" not in cols:
                    connection.execute(text("ALTER TABLE orders ADD COLUMN refund_reason VARCHAR(255);"))
                    print("✅ [SQLite] Coluna 'refund_reason' adicionada com sucesso em 'orders'.")
                if "refunded_at" not in cols:
                    connection.execute(text("ALTER TABLE orders ADD COLUMN refunded_at TIMESTAMP;"))
                    print("✅ [SQLite] Coluna 'refunded_at' adicionada com sucesso em 'orders'.")
                connection.commit()
            else:
                connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(255);"))
                connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;"))
                connection.commit()
                print("✅ [PostgreSQL] Colunas 'refund_reason' e 'refunded_at' adicionadas com sucesso em 'orders'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
