"""
Script de migração: Adiciona a coluna 'name' na tabela 'product_webhooks'.
Permite atribuir um nome/identificador amigável para cada webhook configurado por produto.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando coluna 'name' na tabela 'product_webhooks'...")
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE product_webhooks ADD COLUMN IF NOT EXISTS name VARCHAR(100);"))
            connection.commit()
            print("✅ Migração executada com sucesso! Coluna 'name' adicionada em 'product_webhooks'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
