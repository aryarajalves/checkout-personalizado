"""
Script de migração para tabelas de Assinaturas e Cobrança Recorrente (Subscriptions).
Suporta SQLite e PostgreSQL com verificação de idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração das tabelas de Assinaturas e Cobrança Recorrente...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco detectado: {dialect}")

        # 1. Adicionar colunas em product_offers
        for col, col_type, default_val in [
            ("pricing_type", "VARCHAR(20)", "'one_time'"),
            ("billing_cycle", "VARCHAR(20)", "'monthly'"),
        ]:
            try:
                if dialect == "postgresql":
                    check_sql = text(f"""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name='product_offers' AND column_name='{col}';
                    """)
                    exists = conn.execute(check_sql).fetchone()
                    if not exists:
                        logger.info(f"Adicionando coluna {col} em product_offers...")
                        conn.execute(text(f"ALTER TABLE product_offers ADD COLUMN {col} {col_type} DEFAULT {default_val} NOT NULL;"))
                        conn.commit()
                else:
                    # SQLite
                    columns = [row[1] for row in conn.execute(text("PRAGMA table_info(product_offers);")).fetchall()]
                    if col not in columns:
                        logger.info(f"Adicionando coluna {col} em product_offers (SQLite)...")
                        conn.execute(text(f"ALTER TABLE product_offers ADD COLUMN {col} {col_type} DEFAULT {default_val};"))
                        conn.commit()
            except Exception as e:
                logger.warning(f"Aviso ao verificar coluna {col}: {e}")

        # 2. Criar tabela subscriptions
        if dialect == "postgresql":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id SERIAL PRIMARY KEY,
                    subscription_code VARCHAR(50) UNIQUE NOT NULL,
                    customer_name VARCHAR(150) NOT NULL,
                    customer_email VARCHAR(150) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    customer_phone_ddi VARCHAR(10) DEFAULT '55',
                    customer_document VARCHAR(30),
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    offer_id INTEGER REFERENCES product_offers(id),
                    billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL,
                    amount_brl DOUBLE PRECISION NOT NULL,
                    status VARCHAR(30) DEFAULT 'active' NOT NULL,
                    gateway VARCHAR(30) DEFAULT 'pagarme' NOT NULL,
                    gateway_subscription_id VARCHAR(100),
                    gateway_plan_id VARCHAR(100),
                    card_last_four VARCHAR(10),
                    card_brand VARCHAR(30),
                    current_cycle INTEGER DEFAULT 1 NOT NULL,
                    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                    next_billing_at TIMESTAMP WITH TIME ZONE,
                    canceled_at TIMESTAMP WITH TIME ZONE,
                    cancel_reason TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_subscriptions_code ON subscriptions(subscription_code);
                CREATE INDEX IF NOT EXISTS ix_subscriptions_email ON subscriptions(customer_email);
                CREATE INDEX IF NOT EXISTS ix_subscriptions_status ON subscriptions(status);
            """))

            # 3. Criar tabela subscription_invoices
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscription_invoices (
                    id SERIAL PRIMARY KEY,
                    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
                    order_id INTEGER REFERENCES orders(id),
                    invoice_code VARCHAR(50) UNIQUE NOT NULL,
                    cycle_number INTEGER DEFAULT 1 NOT NULL,
                    amount_brl DOUBLE PRECISION NOT NULL,
                    status VARCHAR(30) DEFAULT 'paid' NOT NULL,
                    due_date TIMESTAMP WITH TIME ZONE,
                    paid_at TIMESTAMP WITH TIME ZONE,
                    gateway_charge_id VARCHAR(100),
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_subscription_invoices_code ON subscription_invoices(invoice_code);
                CREATE INDEX IF NOT EXISTS ix_subscription_invoices_status ON subscription_invoices(status);
            """))
            conn.commit()
            logger.info("Tabelas subscriptions e subscription_invoices criadas/validadas no PostgreSQL.")
        else:
            # SQLite
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subscription_code VARCHAR(50) UNIQUE NOT NULL,
                    customer_name VARCHAR(150) NOT NULL,
                    customer_email VARCHAR(150) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    customer_phone_ddi VARCHAR(10) DEFAULT '55',
                    customer_document VARCHAR(30),
                    product_id INTEGER NOT NULL,
                    offer_id INTEGER,
                    billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL,
                    amount_brl FLOAT NOT NULL,
                    status VARCHAR(30) DEFAULT 'active' NOT NULL,
                    gateway VARCHAR(30) DEFAULT 'pagarme' NOT NULL,
                    gateway_subscription_id VARCHAR(100),
                    gateway_plan_id VARCHAR(100),
                    card_last_four VARCHAR(10),
                    card_brand VARCHAR(30),
                    current_cycle INTEGER DEFAULT 1 NOT NULL,
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    next_billing_at TIMESTAMP,
                    canceled_at TIMESTAMP,
                    cancel_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(product_id) REFERENCES products(id),
                    FOREIGN KEY(offer_id) REFERENCES product_offers(id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscription_invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subscription_id INTEGER NOT NULL,
                    order_id INTEGER,
                    invoice_code VARCHAR(50) UNIQUE NOT NULL,
                    cycle_number INTEGER DEFAULT 1 NOT NULL,
                    amount_brl FLOAT NOT NULL,
                    status VARCHAR(30) DEFAULT 'paid' NOT NULL,
                    due_date TIMESTAMP,
                    paid_at TIMESTAMP,
                    gateway_charge_id VARCHAR(100),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id),
                    FOREIGN KEY(order_id) REFERENCES orders(id)
                );
            """))
            conn.commit()
            logger.info("Tabelas subscriptions e subscription_invoices criadas/validadas no SQLite.")

    logger.info("Migração de Assinaturas e Cobrança Recorrente finalizada com sucesso!")


if __name__ == "__main__":
    run_migration()
