"""
Script de migração para adicionar a coluna require_cpf na tabela products.
Permite ativar/desativar a obrigatoriedade de CPF no checkout por produto.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Iniciando migração: adicionando require_cpf à tabela products...")
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE products ADD COLUMN IF NOT EXISTS require_cpf BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        conn.commit()
    print("Migração concluída com sucesso: coluna require_cpf adicionada à tabela products!")

if __name__ == "__main__":
    migrate()
