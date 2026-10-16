"""
Script de migração para criação das tabelas de Produtos e Regras de Split
(products e product_split_rules).
Executável tanto em PostgreSQL quanto em SQLite.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração das tabelas de produtos e regras de split...")
    with engine.connect() as conn:
        # Tabela products
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                slug VARCHAR NOT NULL UNIQUE,
                description TEXT NULL,
                image_url VARCHAR NULL,
                price_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                price_usd DOUBLE PRECISION NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                payment_methods VARCHAR NOT NULL DEFAULT 'all',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Índice no slug do produto
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_products_slug ON products (slug);
        """))

        # Tabela product_split_rules
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS product_split_rules (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES split_recipients(id) ON DELETE CASCADE,
                percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_product_split_rules_product_id ON product_split_rules (product_id);
        """))

        conn.commit()
    print("Migração de produtos e regras de split concluída com sucesso!")

if __name__ == "__main__":
    migrate()
