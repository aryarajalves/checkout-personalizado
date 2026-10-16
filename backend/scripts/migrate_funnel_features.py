"""
Script de migração: Cria tabelas e colunas para Funil de Vendas:
- Configurações granulares de Pixel em 'products' (pixel_purchase_active, pixel_initiate_active, pixel_pageview_active)
- Tabela 'product_order_bumps' (Order Bumps para o checkout)
- Tabela 'product_upsells' (Ofertas de UpSell pós-compra)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração de Funil: Pixel, Order Bumps e UpSell...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        # 1. Colunas de ativação do Pixel em products
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "pixel_purchase_active" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN pixel_purchase_active BOOLEAN NOT NULL DEFAULT 1;"))
            if "pixel_initiate_active" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN pixel_initiate_active BOOLEAN NOT NULL DEFAULT 1;"))
            if "pixel_pageview_active" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN pixel_pageview_active BOOLEAN NOT NULL DEFAULT 1;"))
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_purchase_active BOOLEAN NOT NULL DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_initiate_active BOOLEAN NOT NULL DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS pixel_pageview_active BOOLEAN NOT NULL DEFAULT TRUE;"))
            
        # 2. Tabela product_order_bumps
        if dialect == "sqlite":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS product_order_bumps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    price_brl FLOAT NOT NULL DEFAULT 0.0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_product_id ON product_order_bumps(product_id);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS product_order_bumps (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    price_brl FLOAT NOT NULL DEFAULT 0.0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_order_bumps_product_id ON product_order_bumps(product_id);"))

        # 3. Tabela product_upsells
        if dialect == "sqlite":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS product_upsells (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    subtitle VARCHAR(255),
                    description TEXT,
                    price_brl FLOAT NOT NULL DEFAULT 0.0,
                    image_url VARCHAR(500),
                    video_url VARCHAR(500),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_product_id ON product_upsells(product_id);"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS product_upsells (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    subtitle VARCHAR(255),
                    description TEXT,
                    price_brl FLOAT NOT NULL DEFAULT 0.0,
                    image_url VARCHAR(500),
                    video_url VARCHAR(500),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_upsells_product_id ON product_upsells(product_id);"))

        conn.commit()
        print("✅ Migração de Funil executada com sucesso!")

if __name__ == "__main__":
    run_migration()
