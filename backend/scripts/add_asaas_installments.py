"""
Script de migração: Adiciona suporte ao gateway Asaas, Carnê Digital e Boleto/Pix Parcelado (#6).
- Adiciona colunas em 'products': 'enable_asaas_installments', 'asaas_max_installments', 'asaas_interest_percent', 'asaas_require_entry_pix'
- Adiciona coluna em 'split_recipients': 'asaas_wallet_id'
- Adiciona colunas em 'orders': 'asaas_customer_id', 'asaas_installment_id'
- Cria a tabela 'order_installments' para controle das parcelas do carnê
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Asaas Boleto Parcelado e Carnê Digital...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            # products
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "enable_asaas_installments" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN enable_asaas_installments BOOLEAN DEFAULT 0;"))
                print("Coluna 'enable_asaas_installments' adicionada em 'products'.")
            if "asaas_max_installments" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN asaas_max_installments INTEGER DEFAULT 12;"))
                print("Coluna 'asaas_max_installments' adicionada em 'products'.")
            if "asaas_interest_percent" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN asaas_interest_percent FLOAT DEFAULT 0.0;"))
                print("Coluna 'asaas_interest_percent' adicionada em 'products'.")
            if "asaas_require_entry_pix" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN asaas_require_entry_pix BOOLEAN DEFAULT 1;"))
                print("Coluna 'asaas_require_entry_pix' adicionada em 'products'.")

            # split_recipients
            result = conn.execute(text("PRAGMA table_info(split_recipients);")).fetchall()
            sr_cols = [r[1] for r in result]
            if "asaas_wallet_id" not in sr_cols:
                conn.execute(text("ALTER TABLE split_recipients ADD COLUMN asaas_wallet_id VARCHAR(100);"))
                print("Coluna 'asaas_wallet_id' adicionada em 'split_recipients'.")

            # orders
            result = conn.execute(text("PRAGMA table_info(orders);")).fetchall()
            ord_cols = [r[1] for r in result]
            if "asaas_customer_id" not in ord_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN asaas_customer_id VARCHAR(100);"))
                print("Coluna 'asaas_customer_id' adicionada em 'orders'.")
            if "asaas_installment_id" not in ord_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN asaas_installment_id VARCHAR(100);"))
                print("Coluna 'asaas_installment_id' adicionada em 'orders'.")

            # order_installments
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS order_installments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    installment_number INTEGER NOT NULL,
                    total_installments INTEGER NOT NULL,
                    amount_brl FLOAT NOT NULL,
                    due_date TIMESTAMP NOT NULL,
                    status VARCHAR(30) DEFAULT 'pending',
                    payment_method VARCHAR(30) DEFAULT 'boleto',
                    asaas_payment_id VARCHAR(100),
                    bank_slip_url VARCHAR(500),
                    bank_slip_bar_code VARCHAR(150),
                    qr_code_base64 TEXT,
                    qr_code_text TEXT,
                    paid_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_order_id ON order_installments(order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_asaas_payment_id ON order_installments(asaas_payment_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_status ON order_installments(status);"))
            print("Tabela 'order_installments' criada/verificada (SQLite).")

        else:
            # PostgreSQL
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS enable_asaas_installments BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS asaas_max_installments INTEGER DEFAULT 12;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS asaas_interest_percent FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS asaas_require_entry_pix BOOLEAN DEFAULT TRUE;"))
            print("Colunas de carnê Asaas verificadas/adicionadas em 'products' (PostgreSQL).")

            conn.execute(text("ALTER TABLE split_recipients ADD COLUMN IF NOT EXISTS asaas_wallet_id VARCHAR(100);"))
            print("Coluna 'asaas_wallet_id' verificada/adicionada em 'split_recipients' (PostgreSQL).")

            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS asaas_installment_id VARCHAR(100);"))
            print("Colunas 'asaas_customer_id' e 'asaas_installment_id' verificadas/adicionadas em 'orders' (PostgreSQL).")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS order_installments (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    installment_number INTEGER NOT NULL,
                    total_installments INTEGER NOT NULL,
                    amount_brl FLOAT NOT NULL,
                    due_date TIMESTAMP NOT NULL,
                    status VARCHAR(30) DEFAULT 'pending',
                    payment_method VARCHAR(30) DEFAULT 'boleto',
                    asaas_payment_id VARCHAR(100),
                    bank_slip_url VARCHAR(500),
                    bank_slip_bar_code VARCHAR(150),
                    qr_code_base64 TEXT,
                    qr_code_text TEXT,
                    paid_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_order_id ON order_installments(order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_asaas_payment_id ON order_installments(asaas_payment_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_installments_status ON order_installments(status);"))
            print("Tabela 'order_installments' criada/verificada (PostgreSQL).")

        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
