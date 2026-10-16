"""
Script de migração para criação das tabelas de Gateways e Split de Pagamento
(gateway_settings e split_recipients).
Executável tanto em PostgreSQL quanto em SQLite.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração das tabelas de gateway e split...")
    with engine.connect() as conn:
        # Tabela gateway_settings
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS gateway_settings (
                id SERIAL PRIMARY KEY,
                gateway_name VARCHAR NOT NULL UNIQUE,
                is_active BOOLEAN NOT NULL DEFAULT FALSE,
                environment VARCHAR NOT NULL DEFAULT 'sandbox',
                api_key VARCHAR NULL,
                public_key VARCHAR NULL,
                webhook_secret VARCHAR NULL,
                merchant_id VARCHAR NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Tabela split_recipients
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS split_recipients (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                email VARCHAR NULL,
                document VARCHAR NULL,
                pix_key VARCHAR NULL,
                pix_key_type VARCHAR NULL,
                crypto_wallet VARCHAR NULL,
                crypto_network VARCHAR NULL DEFAULT 'polygon',
                external_recipient_id VARCHAR NULL,
                default_percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.commit()
    print("Migração de gateways e split concluída com sucesso!")

if __name__ == "__main__":
    migrate()
