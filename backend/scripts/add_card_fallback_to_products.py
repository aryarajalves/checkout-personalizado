"""
Script de migração: Adiciona as colunas 'enable_card_fallback' e 'card_fallback_discount_percent' na tabela 'products'.
Permite ativar/desativar o fallback inteligente de cartão recusado e configurar desconto extra para conversão imediata no Pix (#5).
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas de fallback de cartão em 'products'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "enable_card_fallback" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN enable_card_fallback BOOLEAN DEFAULT 1;"))
                print("Coluna 'enable_card_fallback' adicionada em 'products' (SQLite).")
            if "card_fallback_discount_percent" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN card_fallback_discount_percent FLOAT DEFAULT 0.0;"))
                print("Coluna 'card_fallback_discount_percent' adicionada em 'products' (SQLite).")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS enable_card_fallback BOOLEAN DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS card_fallback_discount_percent FLOAT DEFAULT 0.0;"))
            print("Colunas 'enable_card_fallback' e 'card_fallback_discount_percent' adicionadas em 'products' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
