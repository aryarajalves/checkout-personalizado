"""
Script de migração: Adiciona colunas de vínculo com catálogo, Downsell e tokenização de cartão 1-clique.
Tabelas afetadas:
- 'product_upsells': upsell_product_id, upsell_offer_id, enable_downsell, downsell_product_id, downsell_offer_id,
                     downsell_title, downsell_subtitle, downsell_description, downsell_price_brl,
                     downsell_image_url, downsell_video_url, downsell_external_url.
- 'orders': parent_order_id, order_type, card_token.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando suporte a catálogo, downsell e tokenização de 1 clique...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            # 1. Tabela product_upsells
            res_up = conn.execute(text("PRAGMA table_info(product_upsells);")).fetchall()
            cols_up = [r[1] for r in res_up]
            
            upsell_columns = [
                ("upsell_product_id", "INTEGER"),
                ("upsell_offer_id", "INTEGER"),
                ("enable_downsell", "BOOLEAN DEFAULT 0"),
                ("downsell_product_id", "INTEGER"),
                ("downsell_offer_id", "INTEGER"),
                ("downsell_title", "VARCHAR(255)"),
                ("downsell_subtitle", "VARCHAR(255)"),
                ("downsell_description", "TEXT"),
                ("downsell_price_brl", "FLOAT DEFAULT 0.0"),
                ("downsell_image_url", "VARCHAR(500)"),
                ("downsell_video_url", "VARCHAR(500)"),
                ("downsell_external_url", "VARCHAR(500)")
            ]
            for col_name, col_type in upsell_columns:
                if col_name not in cols_up:
                    conn.execute(text(f"ALTER TABLE product_upsells ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'product_upsells' (SQLite).")
            
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_upsell_product_id ON product_upsells(upsell_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_upsell_offer_id ON product_upsells(upsell_offer_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_downsell_product_id ON product_upsells(downsell_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_downsell_offer_id ON product_upsells(downsell_offer_id);"))

            # 2. Tabela orders
            res_ord = conn.execute(text("PRAGMA table_info(orders);")).fetchall()
            cols_ord = [r[1] for r in res_ord]

            order_columns = [
                ("parent_order_id", "INTEGER"),
                ("order_type", "VARCHAR(30) DEFAULT 'main'"),
                ("card_token", "VARCHAR(255)")
            ]
            for col_name, col_type in order_columns:
                if col_name not in cols_ord:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'orders' (SQLite).")
            
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);"))

        else:
            # PostgreSQL
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS upsell_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS upsell_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS enable_downsell BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_title VARCHAR(255);"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_subtitle VARCHAR(255);"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_description TEXT;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_price_brl FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_image_url VARCHAR(500);"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_video_url VARCHAR(500);"))
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS downsell_external_url VARCHAR(500);"))

            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_upsell_product_id ON product_upsells(upsell_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_upsell_offer_id ON product_upsells(upsell_offer_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_downsell_product_id ON product_upsells(downsell_product_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_downsell_offer_id ON product_upsells(downsell_offer_id);"))

            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(30) NOT NULL DEFAULT 'main';"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_token VARCHAR(255);"))

            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);"))
            print("Colunas de Upsell, Downsell e Tokenização adicionadas com sucesso (PostgreSQL).")

        conn.commit()
    print("Migração de Upsell, Downsell e Tokenização concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
