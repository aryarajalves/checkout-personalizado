"""
Script de migração: Adiciona perfil financeiro em 'users' e vincula 'user_id' em 'split_recipients' e 'affiliates'.
Permite que os próprios usuários (sócios/admins e afiliados) preencham seus dados de repasse (Pix, Documento, Cripto).
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: adicionando perfil financeiro de usuários e chaves de vínculo...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        
        if dialect == "sqlite":
            # 1. users
            user_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users);")).fetchall()]
            new_user_cols = [
                ("document", "VARCHAR(30)"),
                ("document_type", "VARCHAR(10) DEFAULT 'cpf'"),
                ("phone", "VARCHAR(50)"),
                ("pix_key", "VARCHAR(100)"),
                ("pix_key_type", "VARCHAR(20) DEFAULT 'cpf'"),
                ("crypto_wallet", "VARCHAR(100)"),
                ("crypto_network", "VARCHAR(50) DEFAULT 'polygon'"),
                ("external_recipient_id", "VARCHAR(100)"),
                ("updated_at", "DATETIME"),
            ]
            for col_name, col_type in new_user_cols:
                if col_name not in user_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                    print(f"Coluna '{col_name}' adicionada em 'users' (SQLite).")
            
            # 2. split_recipients
            sr_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(split_recipients);")).fetchall()]
            if "user_id" not in sr_cols:
                conn.execute(text("ALTER TABLE split_recipients ADD COLUMN user_id INTEGER;"))
                print("Coluna 'user_id' adicionada em 'split_recipients' (SQLite).")

            # 3. affiliates
            aff_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(affiliates);")).fetchall()]
            if "user_id" not in aff_cols:
                conn.execute(text("ALTER TABLE affiliates ADD COLUMN user_id INTEGER;"))
                print("Coluna 'user_id' adicionada em 'affiliates' (SQLite).")

        else:
            # PostgreSQL
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS document VARCHAR(30);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(10) DEFAULT 'cpf';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key VARCHAR(100);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20) DEFAULT 'cpf';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS crypto_wallet VARCHAR(100);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS crypto_network VARCHAR(50) DEFAULT 'polygon';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS external_recipient_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;"))
            print("Colunas de perfil financeiro adicionadas em 'users' (PostgreSQL).")

            conn.execute(text("ALTER TABLE split_recipients ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_split_recipients_user_id ON split_recipients(user_id);"))
            print("Coluna 'user_id' vinculada em 'split_recipients' (PostgreSQL).")

            conn.execute(text("ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_affiliates_user_id ON affiliates(user_id);"))
            print("Coluna 'user_id' vinculada em 'affiliates' (PostgreSQL).")
            
        conn.commit()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    run_migration()
