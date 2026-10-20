"""
Script de migração: Adiciona suporte à Central Rápida do Comprador e Área de Membros.
Alterações:
- Tabela 'products': adiciona coluna 'member_area_url' (VARCHAR 500)
- Criação da tabela 'buyer_access_codes' para autenticação segura OTP via E-mail
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando Central do Comprador e 'member_area_url'...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(products);")).fetchall()
            cols = [r[1] for r in result]
            if "member_area_url" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN member_area_url VARCHAR(500);"))
                print("Coluna 'member_area_url' adicionada em 'products' (SQLite).")
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS buyer_access_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email VARCHAR(150) NOT NULL,
                    cpf VARCHAR(30),
                    code VARCHAR(10) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    is_used BOOLEAN DEFAULT 0 NOT NULL,
                    created_at DATETIME NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_buyer_access_codes_email ON buyer_access_codes(email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_buyer_access_codes_cpf ON buyer_access_codes(cpf);"))
            print("Tabela 'buyer_access_codes' verificada/criada (SQLite).")
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_url VARCHAR(500);"))
            print("Coluna 'member_area_url' adicionada em 'products' (PostgreSQL).")
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS buyer_access_codes (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(150) NOT NULL,
                    cpf VARCHAR(30),
                    code VARCHAR(10) NOT NULL,
                    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    is_used BOOLEAN DEFAULT FALSE NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_buyer_access_codes_email ON buyer_access_codes(email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_buyer_access_codes_cpf ON buyer_access_codes(cpf);"))
            print("Tabela 'buyer_access_codes' verificada/criada (PostgreSQL).")
            
        conn.commit()
    print("Migração da Central do Comprador concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
