"""
Script de migração: Adiciona colunas de Endereço de Cobrança (ViaCEP / Antifraude) em 'products', 'orders' e 'abandoned_checkouts' (#21).
Permite configurar 'require_billing_address' por produto e armazenar CEP, logradouro, número, complemento, bairro, cidade e estado.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando colunas de endereço de cobrança...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            # products
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "require_billing_address" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN require_billing_address BOOLEAN DEFAULT 0;"))
                print("Coluna 'require_billing_address' adicionada em 'products' (SQLite).")
            
            # orders
            result = conn.execute(text("PRAGMA table_info(orders);")).fetchall()
            order_cols = [r[1] for r in result]
            order_fields = [
                ("billing_zip_code", "VARCHAR(20)"),
                ("billing_street", "VARCHAR(255)"),
                ("billing_number", "VARCHAR(50)"),
                ("billing_complement", "VARCHAR(100)"),
                ("billing_neighborhood", "VARCHAR(100)"),
                ("billing_city", "VARCHAR(100)"),
                ("billing_state", "VARCHAR(10)"),
            ]
            for col_name, col_type in order_fields:
                if col_name not in order_cols:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'orders' (SQLite).")

            # abandoned_checkouts
            result = conn.execute(text("PRAGMA table_info(abandoned_checkouts);")).fetchall()
            cart_cols = [r[1] for r in result]
            for col_name, col_type in order_fields:
                if col_name not in cart_cols:
                    conn.execute(text(f"ALTER TABLE abandoned_checkouts ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'abandoned_checkouts' (SQLite).")

        else:
            # PostgreSQL
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS require_billing_address BOOLEAN DEFAULT FALSE;"))
            print("Coluna 'require_billing_address' verificada/adicionada em 'products' (PostgreSQL).")

            order_fields = [
                ("billing_zip_code", "VARCHAR(20)"),
                ("billing_street", "VARCHAR(255)"),
                ("billing_number", "VARCHAR(50)"),
                ("billing_complement", "VARCHAR(100)"),
                ("billing_neighborhood", "VARCHAR(100)"),
                ("billing_city", "VARCHAR(100)"),
                ("billing_state", "VARCHAR(10)"),
            ]
            for col_name, col_type in order_fields:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.execute(text(f"ALTER TABLE abandoned_checkouts ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Coluna '{col_name}' verificada/adicionada em 'orders' e 'abandoned_checkouts' (PostgreSQL).")
            
        conn.commit()
    print("Migração de endereço de cobrança concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
