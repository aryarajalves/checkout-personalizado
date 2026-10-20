"""
Script de migração: Adiciona as colunas de regras de parcelamento na tabela 'products'.
Colunas adicionadas:
- max_installments: INTEGER DEFAULT 12 (Limite de parcelas de 1x a 12x)
- free_installments_count: INTEGER DEFAULT 1 (Quantidade de parcelas sem juros para o comprador)
- interest_rate_percent: FLOAT DEFAULT 2.99 (Taxa de juros ao mês para parcelamento)
- interest_payer: VARCHAR(20) DEFAULT 'buyer' ('buyer' ou 'producer')
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas de regras de parcelamento em 'products'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "max_installments" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN max_installments INTEGER DEFAULT 12;"))
                print("Coluna 'max_installments' adicionada em 'products' (SQLite).")
            if "free_installments_count" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN free_installments_count INTEGER DEFAULT 1;"))
                print("Coluna 'free_installments_count' adicionada em 'products' (SQLite).")
            if "interest_rate_percent" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN interest_rate_percent FLOAT DEFAULT 2.99;"))
                print("Coluna 'interest_rate_percent' adicionada em 'products' (SQLite).")
            if "interest_payer" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN interest_payer VARCHAR(20) DEFAULT 'buyer';"))
                print("Coluna 'interest_payer' adicionada em 'products' (SQLite).")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS max_installments INTEGER DEFAULT 12;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS free_installments_count INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS interest_rate_percent FLOAT DEFAULT 2.99;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS interest_payer VARCHAR(20) DEFAULT 'buyer';"))
            print("Colunas de parcelamento adicionadas em 'products' (PostgreSQL).")
            
        conn.commit()
    print("Migração de regras de parcelamento concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
