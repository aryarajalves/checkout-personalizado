"""
Script de migração: Adiciona colunas de Exit-Intent e Prova Social na tabela 'products'.
Campos adicionados:
- enable_exit_intent (BOOLEAN DEFAULT FALSE)
- exit_intent_coupon_id (INTEGER NULL REFERENCES coupons(id))
- exit_intent_title (VARCHAR(200))
- exit_intent_subtitle (VARCHAR(255))
- enable_social_proof (BOOLEAN DEFAULT FALSE)
- social_proof_mode (VARCHAR(30) DEFAULT 'hybrid')
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Iniciando migração: Adicionando colunas de Exit-Intent e Prova Social na tabela 'products'...")
    with engine.connect() as connection:
        try:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(products);")).fetchall()
                cols = [r[1] for r in result]
                if "enable_exit_intent" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN enable_exit_intent BOOLEAN NOT NULL DEFAULT 0;"))
                if "exit_intent_coupon_id" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN exit_intent_coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;"))
                if "exit_intent_title" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN exit_intent_title VARCHAR(200) DEFAULT 'Espere! Não perca esta oportunidade exclusiva';"))
                if "exit_intent_subtitle" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN exit_intent_subtitle VARCHAR(255) DEFAULT 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!';"))
                if "enable_social_proof" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN enable_social_proof BOOLEAN NOT NULL DEFAULT 0;"))
                if "social_proof_mode" not in cols:
                    connection.execute(text("ALTER TABLE products ADD COLUMN social_proof_mode VARCHAR(30) NOT NULL DEFAULT 'hybrid';"))
                connection.commit()
                print("✅ [SQLite] Colunas de Exit-Intent e Prova Social adicionadas com sucesso em 'products'.")
            else:
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS enable_exit_intent BOOLEAN NOT NULL DEFAULT FALSE;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS exit_intent_coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS exit_intent_title VARCHAR(200) DEFAULT 'Espere! Não perca esta oportunidade exclusiva';"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS exit_intent_subtitle VARCHAR(255) DEFAULT 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!';"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS enable_social_proof BOOLEAN NOT NULL DEFAULT FALSE;"))
                connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS social_proof_mode VARCHAR(30) NOT NULL DEFAULT 'hybrid';"))
                connection.commit()
                print("✅ [PostgreSQL] Colunas de Exit-Intent e Prova Social adicionadas com sucesso em 'products'.")
        except Exception as e:
            print(f"❌ Erro durante a migração: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
