"""
Script de migração para criação da tabela de Cupons de Desconto (coupons)
e adição das colunas de cupom na tabela de pedidos (orders).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração da tabela de cupons (coupons)...")
    is_sqlite = str(engine.url).startswith("sqlite")

    with engine.connect() as conn:
        if is_sqlite:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    discount_percent FLOAT NOT NULL,
                    product_id INTEGER NULL REFERENCES products(id) ON DELETE CASCADE,
                    never_expires BOOLEAN NOT NULL DEFAULT 1,
                    expires_at TIMESTAMP NULL,
                    max_uses INTEGER NULL,
                    current_uses INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_coupons_code ON coupons (code);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_coupons_product_id ON coupons (product_id);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    discount_percent DOUBLE PRECISION NOT NULL,
                    product_id INTEGER NULL REFERENCES products(id) ON DELETE CASCADE,
                    never_expires BOOLEAN NOT NULL DEFAULT TRUE,
                    expires_at TIMESTAMP WITH TIME ZONE NULL,
                    max_uses INTEGER NULL,
                    current_uses INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_coupons_code ON coupons (code);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_coupons_product_id ON coupons (product_id);"))

        print("Tabela coupons criada com sucesso!")

        # Adicionar colunas na tabela orders se ainda não existirem
        order_columns = [
            ("coupon_id", "INTEGER NULL"),
            ("coupon_code", "VARCHAR(50) NULL"),
            ("discount_amount_brl", "DOUBLE PRECISION DEFAULT 0.0" if not is_sqlite else "FLOAT DEFAULT 0.0"),
            ("discount_amount_usd", "DOUBLE PRECISION DEFAULT 0.0" if not is_sqlite else "FLOAT DEFAULT 0.0"),
            ("original_amount_brl", "DOUBLE PRECISION NULL" if not is_sqlite else "FLOAT NULL"),
            ("original_amount_usd", "DOUBLE PRECISION NULL" if not is_sqlite else "FLOAT NULL"),
        ]

        for col_name, col_type in order_columns:
            try:
                if is_sqlite:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type};"))
                else:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Coluna {col_name} adicionada em orders com sucesso.")
            except Exception as e:
                # Coluna já pode existir
                print(f"Aviso coluna {col_name} em orders: {e}")

        conn.commit()
        print("Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
