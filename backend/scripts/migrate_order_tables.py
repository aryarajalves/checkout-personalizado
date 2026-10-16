"""
Script de migração para criação das tabelas de Pedidos (orders) e Divisões de Split (order_splits).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração das tabelas de pedidos (orders e order_splits)...")
    with engine.connect() as conn:
        # Tabela orders
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_code VARCHAR NOT NULL UNIQUE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL,
                customer_name VARCHAR NOT NULL,
                customer_email VARCHAR NOT NULL,
                customer_phone VARCHAR NOT NULL,
                customer_cpf VARCHAR NULL,
                amount_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                amount_usd DOUBLE PRECISION NULL,
                payment_method VARCHAR NOT NULL DEFAULT 'pix',
                status VARCHAR NOT NULL DEFAULT 'pending',
                gateway_name VARCHAR NOT NULL DEFAULT 'pagarme',
                external_transaction_id VARCHAR NULL,
                qr_code_base64 TEXT NULL,
                qr_code_text TEXT NULL,
                crypto_wallet_address VARCHAR NULL,
                crypto_network VARCHAR NULL,
                expires_at TIMESTAMP WITH TIME ZONE NULL,
                paid_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Índices em orders
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_order_code ON orders (order_code);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_customer_email ON orders (customer_email);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_external_tx ON orders (external_transaction_id);"))

        # Tabela order_splits
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS order_splits (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES split_recipients(id) ON DELETE RESTRICT,
                recipient_name VARCHAR NOT NULL,
                percentage DOUBLE PRECISION NOT NULL,
                amount_brl DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_splits_order_id ON order_splits (order_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_splits_recipient_id ON order_splits (recipient_id);"))

        conn.commit()
    print("Migração das tabelas orders e order_splits concluída com sucesso!")

if __name__ == "__main__":
    migrate()
