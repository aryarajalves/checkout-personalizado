"""
Script de migração para criação das tabelas de Webhooks de Saída (product_webhooks e webhook_dispatch_logs).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração das tabelas de webhooks (product_webhooks e webhook_dispatch_logs)...")
    with engine.connect() as conn:
        # Tabela product_webhooks
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS product_webhooks (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                url VARCHAR(500) NOT NULL,
                events TEXT NOT NULL DEFAULT '[]',
                secret_key VARCHAR(100) NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_product_webhooks_id ON product_webhooks (id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_product_webhooks_product_id ON product_webhooks (product_id);"))

        # Tabela webhook_dispatch_logs
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS webhook_dispatch_logs (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                webhook_id INTEGER REFERENCES product_webhooks(id) ON DELETE SET NULL,
                order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
                event VARCHAR(50) NOT NULL,
                url VARCHAR(500) NOT NULL,
                payload TEXT NOT NULL,
                response_status_code INTEGER NULL,
                response_body TEXT NULL,
                success BOOLEAN NOT NULL DEFAULT FALSE,
                error_message TEXT NULL,
                dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_webhook_dispatch_logs_id ON webhook_dispatch_logs (id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_webhook_dispatch_logs_product_id ON webhook_dispatch_logs (product_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_webhook_dispatch_logs_webhook_id ON webhook_dispatch_logs (webhook_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_webhook_dispatch_logs_order_id ON webhook_dispatch_logs (order_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_webhook_dispatch_logs_event ON webhook_dispatch_logs (event);"))

        conn.commit()
    print("Migração das tabelas de webhooks concluída com sucesso!")

if __name__ == "__main__":
    migrate()
