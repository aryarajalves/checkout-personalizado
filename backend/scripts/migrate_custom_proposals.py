"""
Script de migração para o Gerador de Link de Negociação Personalizada (Propostas High-Ticket).
Cria a tabela custom_proposals e adiciona a coluna proposal_id na tabela orders.
Suporta PostgreSQL e SQLite com idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração de suporte a Propostas de Negociação Personalizada...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco: {dialect}")

        # 1. Criar tabela custom_proposals
        try:
            if dialect == "postgresql":
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS custom_proposals (
                        id SERIAL PRIMARY KEY,
                        proposal_code VARCHAR(50) UNIQUE NOT NULL,
                        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                        offer_id INTEGER NULL REFERENCES product_offers(id) ON DELETE SET NULL,
                        title VARCHAR(150) NOT NULL,
                        description TEXT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_email VARCHAR(150) NOT NULL,
                        customer_phone VARCHAR(50) NOT NULL,
                        customer_cpf VARCHAR(30) NULL,
                        amount_brl DOUBLE PRECISION NOT NULL,
                        payment_method_allowed VARCHAR(50) NOT NULL DEFAULT 'all',
                        custom_pix_amount_brl DOUBLE PRECISION NULL,
                        custom_card_amount_brl DOUBLE PRECISION NULL,
                        max_installments INTEGER NOT NULL DEFAULT 12,
                        closer_name VARCHAR(100) NULL,
                        notes TEXT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'active',
                        order_id INTEGER NULL REFERENCES orders(id) ON DELETE SET NULL,
                        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        paid_at TIMESTAMP WITH TIME ZONE NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_code ON custom_proposals (proposal_code);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_status ON custom_proposals (status);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_product_id ON custom_proposals (product_id);"))
                conn.commit()
                logger.info("Tabela custom_proposals e índices criados/verificados com sucesso no PostgreSQL.")
            else:
                # SQLite
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS custom_proposals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        proposal_code VARCHAR(50) UNIQUE NOT NULL,
                        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                        offer_id INTEGER NULL REFERENCES product_offers(id) ON DELETE SET NULL,
                        title VARCHAR(150) NOT NULL,
                        description TEXT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_email VARCHAR(150) NOT NULL,
                        customer_phone VARCHAR(50) NOT NULL,
                        customer_cpf VARCHAR(30) NULL,
                        amount_brl FLOAT NOT NULL,
                        payment_method_allowed VARCHAR(50) NOT NULL DEFAULT 'all',
                        custom_pix_amount_brl FLOAT NULL,
                        custom_card_amount_brl FLOAT NULL,
                        max_installments INTEGER NOT NULL DEFAULT 12,
                        closer_name VARCHAR(100) NULL,
                        notes TEXT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'active',
                        order_id INTEGER NULL REFERENCES orders(id) ON DELETE SET NULL,
                        expires_at TIMESTAMP NOT NULL,
                        paid_at TIMESTAMP NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_code ON custom_proposals (proposal_code);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_status ON custom_proposals (status);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_custom_proposals_product_id ON custom_proposals (product_id);"))
                conn.commit()
                logger.info("Tabela custom_proposals criada/verificada no SQLite.")
        except Exception as e:
            logger.error(f"Erro ao criar tabela custom_proposals: {e}")
            raise

        # 2. Adicionar coluna proposal_id na tabela orders
        try:
            if dialect == "postgresql":
                check_sql = text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='orders' AND column_name='proposal_id';
                """)
                exists = conn.execute(check_sql).fetchone()
                if not exists:
                    logger.info("Adicionando coluna proposal_id em orders...")
                    conn.execute(text("ALTER TABLE orders ADD COLUMN proposal_id INTEGER NULL REFERENCES custom_proposals(id) ON DELETE SET NULL;"))
                    conn.commit()
            else:
                cols = [row[1] for row in conn.execute(text("PRAGMA table_info(orders);")).fetchall()]
                if "proposal_id" not in cols:
                    logger.info("Adicionando coluna proposal_id em orders (SQLite)...")
                    conn.execute(text("ALTER TABLE orders ADD COLUMN proposal_id INTEGER NULL REFERENCES custom_proposals(id) ON DELETE SET NULL;"))
                    conn.commit()
        except Exception as e:
            logger.warning(f"Aviso ao verificar proposal_id em orders: {e}")

    logger.info("Migração de custom_proposals concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
