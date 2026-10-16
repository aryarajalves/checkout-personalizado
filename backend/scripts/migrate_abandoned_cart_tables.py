"""
Script de migração para criação da tabela de Carrinhos Abandonados (abandoned_checkouts).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração da tabela de carrinhos abandonados (abandoned_checkouts)...")
    is_sqlite = str(engine.url).startswith("sqlite")

    with engine.connect() as conn:
        if is_sqlite:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS abandoned_checkouts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    offer_id INTEGER NULL REFERENCES product_offers(id) ON DELETE SET NULL,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    customer_phone_ddi VARCHAR(10) DEFAULT '55',
                    customer_cpf VARCHAR(20) NULL,
                    estimated_amount_brl FLOAT NOT NULL DEFAULT 0.0,
                    coupon_code VARCHAR(50) NULL,
                    recovery_token VARCHAR(64) NOT NULL UNIQUE,
                    status VARCHAR(30) NOT NULL DEFAULT 'abandoned',
                    contacted BOOLEAN NOT NULL DEFAULT 0,
                    notes TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_product_id ON abandoned_checkouts (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_offer_id ON abandoned_checkouts (offer_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_customer_email ON abandoned_checkouts (customer_email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_recovery_token ON abandoned_checkouts (recovery_token);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_status ON abandoned_checkouts (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_created_at ON abandoned_checkouts (created_at);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS abandoned_checkouts (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    offer_id INTEGER NULL REFERENCES product_offers(id) ON DELETE SET NULL,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    customer_phone_ddi VARCHAR(10) DEFAULT '55',
                    customer_cpf VARCHAR(20) NULL,
                    estimated_amount_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    coupon_code VARCHAR(50) NULL,
                    recovery_token VARCHAR(64) NOT NULL UNIQUE,
                    status VARCHAR(30) NOT NULL DEFAULT 'abandoned',
                    contacted BOOLEAN NOT NULL DEFAULT FALSE,
                    notes TEXT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_product_id ON abandoned_checkouts (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_offer_id ON abandoned_checkouts (offer_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_customer_email ON abandoned_checkouts (customer_email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_recovery_token ON abandoned_checkouts (recovery_token);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_status ON abandoned_checkouts (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_abandoned_checkouts_created_at ON abandoned_checkouts (created_at);"))

        conn.commit()
        print("Tabela abandoned_checkouts criada com sucesso!")

if __name__ == "__main__":
    migrate()
