"""
Script de migração: Adiciona a coluna 'external_url' na tabela 'product_upsells'.
Permite cadastrar o link da página de vendas externa do UpSell.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando coluna 'external_url' em 'product_upsells'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(product_upsells);")).fetchall()
            cols = [r[1] for r in result]
            if "external_url" not in cols:
                conn.execute(text("ALTER TABLE product_upsells ADD COLUMN external_url VARCHAR(500);"))
                print("Coluna 'external_url' adicionada em 'product_upsells' (SQLite).")
            else:
                print("Coluna 'external_url' já existe em 'product_upsells'.")
        else:
            conn.execute(text("ALTER TABLE product_upsells ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);"))
            print("Coluna 'external_url' adicionada em 'product_upsells' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
