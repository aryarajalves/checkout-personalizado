"""
Script de migração para criação das tabelas do Sistema de Afiliados:
- affiliates
- affiliate_product_links
- affiliate_commissions
- Adiciona colunas de afiliado na tabela orders
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração das tabelas do Sistema de Afiliados...")
    is_sqlite = str(engine.url).startswith("sqlite")

    with engine.connect() as conn:
        # 1. Tabela affiliates
        if is_sqlite:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(150) NOT NULL,
                    email VARCHAR(150) NOT NULL UNIQUE,
                    phone VARCHAR(50) NOT NULL,
                    document VARCHAR(30) NULL,
                    affiliate_code VARCHAR(50) NOT NULL UNIQUE,
                    pix_key VARCHAR(100) NULL,
                    pix_key_type VARCHAR(20) DEFAULT 'cpf',
                    crypto_wallet VARCHAR(100) NULL,
                    default_commission_percent FLOAT NOT NULL DEFAULT 20.0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    notes TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_affiliates_email ON affiliates (email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_affiliates_code ON affiliates (affiliate_code);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliates (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    email VARCHAR(150) NOT NULL UNIQUE,
                    phone VARCHAR(50) NOT NULL,
                    document VARCHAR(30) NULL,
                    affiliate_code VARCHAR(50) NOT NULL UNIQUE,
                    pix_key VARCHAR(100) NULL,
                    pix_key_type VARCHAR(20) DEFAULT 'cpf',
                    crypto_wallet VARCHAR(100) NULL,
                    default_commission_percent DOUBLE PRECISION NOT NULL DEFAULT 20.0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    notes TEXT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_affiliates_email ON affiliates (email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_affiliates_code ON affiliates (affiliate_code);"))

        print("Tabela affiliates criada com sucesso!")

        # 2. Tabela affiliate_product_links
        if is_sqlite:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliate_product_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    commission_percent FLOAT NULL,
                    custom_ref_code VARCHAR(50) NULL,
                    clicks_count INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_affiliate_id ON affiliate_product_links (affiliate_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_product_id ON affiliate_product_links (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_custom_ref ON affiliate_product_links (custom_ref_code);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliate_product_links (
                    id SERIAL PRIMARY KEY,
                    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    commission_percent DOUBLE PRECISION NULL,
                    custom_ref_code VARCHAR(50) NULL,
                    clicks_count INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_affiliate_id ON affiliate_product_links (affiliate_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_product_id ON affiliate_product_links (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_links_custom_ref ON affiliate_product_links (custom_ref_code);"))

        print("Tabela affiliate_product_links criada com sucesso!")

        # 3. Tabela affiliate_commissions
        if is_sqlite:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliate_commissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                    amount_brl FLOAT NOT NULL DEFAULT 0.0,
                    amount_usd FLOAT NULL,
                    sale_amount_brl FLOAT NOT NULL DEFAULT 0.0,
                    commission_percent FLOAT NOT NULL DEFAULT 0.0,
                    status VARCHAR(30) NOT NULL DEFAULT 'pending',
                    paid_at TIMESTAMP NULL,
                    notes TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_affiliate_id ON affiliate_commissions (affiliate_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_order_id ON affiliate_commissions (order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_product_id ON affiliate_commissions (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_status ON affiliate_commissions (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_created_at ON affiliate_commissions (created_at);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS affiliate_commissions (
                    id SERIAL PRIMARY KEY,
                    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                    amount_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    amount_usd DOUBLE PRECISION NULL,
                    sale_amount_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    commission_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    status VARCHAR(30) NOT NULL DEFAULT 'pending',
                    paid_at TIMESTAMP WITH TIME ZONE NULL,
                    notes TEXT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_affiliate_id ON affiliate_commissions (affiliate_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_order_id ON affiliate_commissions (order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_product_id ON affiliate_commissions (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_status ON affiliate_commissions (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_aff_comm_created_at ON affiliate_commissions (created_at);"))

        print("Tabela affiliate_commissions criada com sucesso!")

        # 4. Adicionar colunas na tabela orders
        order_columns = [
            ("affiliate_id", "INTEGER NULL REFERENCES affiliates(id) ON DELETE SET NULL"),
            ("affiliate_code", "VARCHAR(50) NULL"),
            ("affiliate_commission_brl", "DOUBLE PRECISION DEFAULT 0.0" if not is_sqlite else "FLOAT DEFAULT 0.0"),
            ("affiliate_commission_usd", "DOUBLE PRECISION DEFAULT 0.0" if not is_sqlite else "FLOAT DEFAULT 0.0"),
        ]

        for col_name, col_type in order_columns:
            try:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type};"))
                print(f"Coluna {col_name} adicionada à tabela orders.")
            except Exception as e:
                # Coluna já existe
                print(f"Coluna {col_name} já presente ou erro: {e}")

        conn.commit()
        print("Migração do Sistema de Afiliados concluída com sucesso!")

if __name__ == "__main__":
    migrate()
