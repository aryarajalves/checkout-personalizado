"""
Script de migração: Adiciona a coluna 'thank_you_url' na tabela 'products'.
Permite cadastrar o link da página de obrigado personalizada (externa ou redirecionamento).
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando coluna 'thank_you_url' em 'products'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "thank_you_url" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN thank_you_url VARCHAR(500);"))
                print("Coluna 'thank_you_url' adicionada em 'products' (SQLite).")
            else:
                print("Coluna 'thank_you_url' já existe em 'products'.")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS thank_you_url VARCHAR(500);"))
            print("Coluna 'thank_you_url' adicionada em 'products' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
