"""
Script de migração para criação da tabela de Ofertas de Produtos (product_offers)
e migração automática das ofertas padrão dos produtos existentes.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração da tabela de ofertas de produtos (product_offers)...")
    with engine.connect() as conn:
        # Tabela product_offers
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS product_offers (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                name VARCHAR NOT NULL,
                slug VARCHAR NOT NULL UNIQUE,
                price_brl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                price_usd DOUBLE PRECISION NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Índices
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_product_offers_slug ON product_offers (slug);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_product_offers_product_id ON product_offers (product_id);
        """))

        # Migrar produtos existentes que ainda não tenham ofertas cadastradas
        conn.execute(text("""
            INSERT INTO product_offers (product_id, name, slug, price_brl, price_usd, is_active, is_default)
            SELECT p.id, 'Oferta Principal', p.slug, p.price_brl, p.price_usd, p.is_active, TRUE
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1 FROM product_offers po WHERE po.product_id = p.id
            );
        """))

        conn.commit()
    print("Migração da tabela product_offers concluída com sucesso!")

if __name__ == "__main__":
    migrate()
