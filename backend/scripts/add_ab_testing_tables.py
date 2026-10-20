"""
Script de migração para o Teste A/B Nativo de Checkout e Ofertas (Split 50/50) (#18).
Cria a tabela ab_tests e adiciona os campos ab_test_id e ab_test_variant nas tabelas
orders e abandoned_checkouts.
Suporta PostgreSQL e SQLite com idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração do Teste A/B Nativo de Checkout e Ofertas...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco: {dialect}")

        if dialect == "postgresql":
            # 1. Tabela ab_tests
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ab_tests (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    name VARCHAR(150) NOT NULL,
                    variant_a_offer_id INTEGER NOT NULL REFERENCES product_offers(id) ON DELETE CASCADE,
                    variant_b_offer_id INTEGER NOT NULL REFERENCES product_offers(id) ON DELETE CASCADE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    split_ratio INTEGER NOT NULL DEFAULT 50,
                    visits_a INTEGER NOT NULL DEFAULT 0,
                    visits_b INTEGER NOT NULL DEFAULT 0,
                    initiates_a INTEGER NOT NULL DEFAULT 0,
                    initiates_b INTEGER NOT NULL DEFAULT 0,
                    conversions_a INTEGER NOT NULL DEFAULT 0,
                    conversions_b INTEGER NOT NULL DEFAULT 0,
                    revenue_brl_a DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    revenue_brl_b DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ab_tests_product_id ON ab_tests (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ab_tests_is_active ON ab_tests (is_active);"))

            # 2. Adicionar colunas em orders
            conn.execute(text("""
                ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS ab_test_id INTEGER REFERENCES ab_tests(id) ON DELETE SET NULL;
            """))
            conn.execute(text("""
                ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS ab_test_variant VARCHAR(10) NULL;
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_ab_test_id ON orders (ab_test_id);"))

            # 3. Adicionar colunas em abandoned_checkouts
            conn.execute(text("""
                ALTER TABLE abandoned_checkouts
                ADD COLUMN IF NOT EXISTS ab_test_id INTEGER NULL;
            """))
            conn.execute(text("""
                ALTER TABLE abandoned_checkouts
                ADD COLUMN IF NOT EXISTS ab_test_variant VARCHAR(10) NULL;
            """))

            conn.commit()
            logger.info("Migração de tabelas e colunas de Teste A/B concluída com sucesso no PostgreSQL.")

        else:
            # SQLite
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ab_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    name VARCHAR(150) NOT NULL,
                    variant_a_offer_id INTEGER NOT NULL REFERENCES product_offers(id) ON DELETE CASCADE,
                    variant_b_offer_id INTEGER NOT NULL REFERENCES product_offers(id) ON DELETE CASCADE,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    split_ratio INTEGER NOT NULL DEFAULT 50,
                    visits_a INTEGER NOT NULL DEFAULT 0,
                    visits_b INTEGER NOT NULL DEFAULT 0,
                    initiates_a INTEGER NOT NULL DEFAULT 0,
                    initiates_b INTEGER NOT NULL DEFAULT 0,
                    conversions_a INTEGER NOT NULL DEFAULT 0,
                    conversions_b INTEGER NOT NULL DEFAULT 0,
                    revenue_brl_a REAL NOT NULL DEFAULT 0.0,
                    revenue_brl_b REAL NOT NULL DEFAULT 0.0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ab_tests_product_id ON ab_tests (product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ab_tests_is_active ON ab_tests (is_active);"))

            # orders
            order_cols = [c[1] for c in conn.execute(text("PRAGMA table_info(orders);")).fetchall()]
            if "ab_test_id" not in order_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN ab_test_id INTEGER;"))
            if "ab_test_variant" not in order_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN ab_test_variant VARCHAR(10);"))

            # abandoned_checkouts
            ab_cols = [c[1] for c in conn.execute(text("PRAGMA table_info(abandoned_checkouts);")).fetchall()]
            if "ab_test_id" not in ab_cols:
                conn.execute(text("ALTER TABLE abandoned_checkouts ADD COLUMN ab_test_id INTEGER;"))
            if "ab_test_variant" not in ab_cols:
                conn.execute(text("ALTER TABLE abandoned_checkouts ADD COLUMN ab_test_variant VARCHAR(10);"))

            conn.commit()
            logger.info("Migração de tabelas e colunas de Teste A/B concluída com sucesso no SQLite.")

    logger.info("Migração do Teste A/B concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
