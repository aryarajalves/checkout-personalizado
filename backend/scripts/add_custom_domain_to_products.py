"""
Script de migração: Adiciona a coluna 'custom_domain' na tabela 'products'.
Permite vincular um domínio ou subdomínio personalizado (CNAME Whitelabel) ao produto/checkout.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando coluna 'custom_domain' em 'products'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "custom_domain" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN custom_domain VARCHAR(255);"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_products_custom_domain ON products (custom_domain);"))
                print("Coluna 'custom_domain' adicionada em 'products' (SQLite).")
            else:
                print("Coluna 'custom_domain' já existe em 'products'.")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_products_custom_domain ON products (custom_domain);"))
            print("Coluna 'custom_domain' adicionada em 'products' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
