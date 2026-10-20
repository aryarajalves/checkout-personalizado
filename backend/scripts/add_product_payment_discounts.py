"""
Script de migração: Adiciona as colunas 'pix_discount_percent' e 'crypto_discount_percent' na tabela 'products'.
Permite configurar descontos automáticos por método de pagamento para incentivar Pix e Cripto no checkout.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas 'pix_discount_percent' e 'crypto_discount_percent' em 'products'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "pix_discount_percent" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN pix_discount_percent FLOAT DEFAULT 0.0;"))
                print("Coluna 'pix_discount_percent' adicionada em 'products' (SQLite).")
            if "crypto_discount_percent" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN crypto_discount_percent FLOAT DEFAULT 0.0;"))
                print("Coluna 'crypto_discount_percent' adicionada em 'products' (SQLite).")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS pix_discount_percent FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS crypto_discount_percent FLOAT DEFAULT 0.0;"))
            print("Colunas 'pix_discount_percent' e 'crypto_discount_percent' adicionadas em 'products' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
