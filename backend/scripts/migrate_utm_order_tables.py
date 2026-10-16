"""
Script de migração para colunas de UTM e Rastreamento de Tráfego nas tabelas orders e abandoned_checkouts.
Suporta SQLite e PostgreSQL com verificação de idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração de colunas UTM nas tabelas orders e abandoned_checkouts...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco detectado: {dialect}")

        # 1. Colunas UTM para tabela orders
        order_cols = [
            ("utm_source", "VARCHAR(100)"),
            ("utm_medium", "VARCHAR(100)"),
            ("utm_campaign", "VARCHAR(150)"),
            ("utm_content", "VARCHAR(150)"),
            ("utm_term", "VARCHAR(100)"),
            ("src", "VARCHAR(100)"),
            ("sck", "VARCHAR(100)"),
        ]

        for col, col_type in order_cols:
            try:
                if dialect == "postgresql":
                    check_sql = text(f"""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name='orders' AND column_name='{col}';
                    """)
                    exists = conn.execute(check_sql).fetchone()
                    if not exists:
                        logger.info(f"Adicionando coluna {col} em orders...")
                        conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col} {col_type};"))
                        conn.commit()
                else:
                    # SQLite
                    columns = [row[1] for row in conn.execute(text("PRAGMA table_info(orders);")).fetchall()]
                    if col not in columns:
                        logger.info(f"Adicionando coluna {col} em orders (SQLite)...")
                        conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col} {col_type};"))
                        conn.commit()
            except Exception as e:
                logger.warning(f"Aviso ao verificar coluna {col} em orders: {e}")

        # 2. Colunas UTM para tabela abandoned_checkouts
        abandoned_cols = [
            ("utm_source", "VARCHAR(100)"),
            ("utm_medium", "VARCHAR(100)"),
            ("utm_campaign", "VARCHAR(150)"),
            ("utm_content", "VARCHAR(150)"),
            ("utm_term", "VARCHAR(100)"),
            ("src", "VARCHAR(100)"),
        ]

        for col, col_type in abandoned_cols:
            try:
                if dialect == "postgresql":
                    check_sql = text(f"""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name='abandoned_checkouts' AND column_name='{col}';
                    """)
                    exists = conn.execute(check_sql).fetchone()
                    if not exists:
                        logger.info(f"Adicionando coluna {col} em abandoned_checkouts...")
                        conn.execute(text(f"ALTER TABLE abandoned_checkouts ADD COLUMN {col} {col_type};"))
                        conn.commit()
                else:
                    # SQLite
                    columns = [row[1] for row in conn.execute(text("PRAGMA table_info(abandoned_checkouts);")).fetchall()]
                    if col not in columns:
                        logger.info(f"Adicionando coluna {col} em abandoned_checkouts (SQLite)...")
                        conn.execute(text(f"ALTER TABLE abandoned_checkouts ADD COLUMN {col} {col_type};"))
                        conn.commit()
            except Exception as e:
                logger.warning(f"Aviso ao verificar coluna {col} em abandoned_checkouts: {e}")

        # 3. Índices para performance nas consultas de BI de tráfego
        if dialect == "postgresql":
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON orders (utm_source);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON orders (utm_campaign);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_src ON orders (src);"))
            conn.commit()
            logger.info("Índices de performance de UTM criados com sucesso.")

    logger.info("Migração de colunas UTM finalizada com sucesso!")


if __name__ == "__main__":
    run_migration()
