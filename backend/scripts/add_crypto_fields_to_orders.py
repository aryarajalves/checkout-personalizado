"""
Script de migração para adicionar colunas crypto_currency e crypto_amount na tabela orders.
Executa tanto em PostgreSQL quanto em SQLite de forma idempotente.
"""
import sys
import os

# Adiciona o caminho raiz do backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração: adicionando crypto_currency e crypto_amount à tabela orders...")
    with engine.connect() as conn:
        with conn.begin():
            # Verifica colunas existentes
            if engine.dialect.name == "postgresql":
                conn.execute(text("""
                    ALTER TABLE orders 
                    ADD COLUMN IF NOT EXISTS crypto_currency VARCHAR NULL,
                    ADD COLUMN IF NOT EXISTS crypto_amount FLOAT NULL;
                """))
                print("Colunas adicionadas com sucesso no PostgreSQL.")
            else:
                # SQLite
                try:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN crypto_currency TEXT NULL;"))
                except Exception as e:
                    print(f"Nota (crypto_currency já pode existir): {e}")
                try:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN crypto_amount REAL NULL;"))
                except Exception as e:
                    print(f"Nota (crypto_amount já pode existir): {e}")
                print("Migração concluída no SQLite.")

if __name__ == "__main__":
    migrate()
