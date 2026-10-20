"""
Script de migração: Adiciona as colunas 'bump_product_id' e 'bump_offer_id' na tabela 'product_order_bumps'.
Permite vincular um order bump a um produto real do catálogo e a uma oferta de preço específica.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas 'bump_product_id' e 'bump_offer_id' em 'product_order_bumps'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(product_order_bumps);")).fetchall()
            cols = [r[1] for r in result]
            if "bump_product_id" not in cols:
                conn.execute(text("ALTER TABLE product_order_bumps ADD COLUMN bump_product_id INTEGER;"))
                print("Coluna 'bump_product_id' adicionada em 'product_order_bumps' (SQLite).")
            if "bump_offer_id" not in cols:
                conn.execute(text("ALTER TABLE product_order_bumps ADD COLUMN bump_offer_id INTEGER;"))
                print("Coluna 'bump_offer_id' adicionada em 'product_order_bumps' (SQLite).")
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_product_id ON product_order_bumps(bump_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_offer_id ON product_order_bumps(bump_offer_id);"))
        else:
            conn.execute(text("ALTER TABLE product_order_bumps ADD COLUMN IF NOT EXISTS bump_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE product_order_bumps ADD COLUMN IF NOT EXISTS bump_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_product_id ON product_order_bumps(bump_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_offer_id ON product_order_bumps(bump_offer_id);"))
            print("Colunas 'bump_product_id' e 'bump_offer_id' adicionadas em 'product_order_bumps' (PostgreSQL).")
            
        conn.commit()
    print("Migração de order bumps concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
