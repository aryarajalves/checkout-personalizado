"""
Script de migração para Pagamento Híbrido ('Pix + Cartão' e '2 Cartões de Crédito').
Cria a tabela order_payments e adiciona a coluna hybrid_type na tabela orders.
Suporta PostgreSQL e SQLite com idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração de suporte a Pagamento Híbrido...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco: {dialect}")

        # 1. Adicionar coluna hybrid_type na tabela orders
        try:
            if dialect == "postgresql":
                check_sql = text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='orders' AND column_name='hybrid_type';
                """)
                exists = conn.execute(check_sql).fetchone()
                if not exists:
                    logger.info("Adicionando coluna hybrid_type em orders...")
                    conn.execute(text("ALTER TABLE orders ADD COLUMN hybrid_type VARCHAR(30) NULL;"))
                    conn.commit()
            else:
                # SQLite
                cols = [row[1] for row in conn.execute(text("PRAGMA table_info(orders);")).fetchall()]
                if "hybrid_type" not in cols:
                    logger.info("Adicionando coluna hybrid_type em orders (SQLite)...")
                    conn.execute(text("ALTER TABLE orders ADD COLUMN hybrid_type VARCHAR(30) NULL;"))
                    conn.commit()
        except Exception as e:
            logger.warning(f"Aviso ao verificar hybrid_type em orders: {e}")

        # 2. Criar tabela order_payments
        try:
            if dialect == "postgresql":
                create_table_sql = text("""
                    CREATE TABLE IF NOT EXISTS order_payments (
                        id SERIAL PRIMARY KEY,
                        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                        part_number INTEGER NOT NULL DEFAULT 1,
                        payment_method VARCHAR(50) NOT NULL,
                        amount_brl DOUBLE PRECISION NOT NULL,
                        installments INTEGER NOT NULL DEFAULT 1,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending',
                        external_transaction_id VARCHAR(150) NULL,
                        qr_code_base64 TEXT NULL,
                        qr_code_text TEXT NULL,
                        card_last_four VARCHAR(10) NULL,
                        card_brand VARCHAR(30) NULL,
                        paid_at TIMESTAMP WITH TIME ZONE NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
                    CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
                    CREATE INDEX IF NOT EXISTS idx_order_payments_ext_id ON order_payments(external_transaction_id);
                """)
                conn.execute(create_table_sql)
                conn.commit()
                logger.info("Tabela order_payments e índices criados no PostgreSQL.")
            else:
                # SQLite
                create_table_sql = text("""
                    CREATE TABLE IF NOT EXISTS order_payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                        part_number INTEGER NOT NULL DEFAULT 1,
                        payment_method VARCHAR(50) NOT NULL,
                        amount_brl REAL NOT NULL,
                        installments INTEGER NOT NULL DEFAULT 1,
                        status VARCHAR(30) NOT NULL DEFAULT 'pending',
                        external_transaction_id VARCHAR(150) NULL,
                        qr_code_base64 TEXT NULL,
                        qr_code_text TEXT NULL,
                        card_last_four VARCHAR(10) NULL,
                        card_brand VARCHAR(30) NULL,
                        paid_at DATETIME NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
                    CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
                """)
                conn.execute(create_table_sql)
                conn.commit()
                logger.info("Tabela order_payments e índices criados no SQLite.")
        except Exception as e:
            logger.error(f"Erro ao criar tabela order_payments: {e}")
            raise e

    logger.info("Migração de Pagamento Híbrido concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
