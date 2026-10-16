"""
Script de migração para adicionar a coluna valid_until na tabela product_split_rules.
Suporta SQLite e PostgreSQL com verificação de idempotência.
Permite definir prazo de contrato para co-produtores com expiração automática.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração de valid_until na tabela product_split_rules...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco detectado: {dialect}")

        col = "valid_until"
        col_type = "TIMESTAMP WITH TIME ZONE" if dialect == "postgresql" else "DATETIME"

        try:
            if dialect == "postgresql":
                check_sql = text(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='product_split_rules' AND column_name='{col}';
                """)
                exists = conn.execute(check_sql).fetchone()
                if not exists:
                    logger.info(f"Adicionando coluna {col} em product_split_rules...")
                    conn.execute(text(f"ALTER TABLE product_split_rules ADD COLUMN {col} {col_type};"))
                    conn.commit()
                    logger.info(f"Coluna {col} adicionada com sucesso no PostgreSQL.")
                else:
                    logger.info(f"Coluna {col} já existe na tabela product_split_rules.")
            else:
                # SQLite
                columns = [row[1] for row in conn.execute(text("PRAGMA table_info(product_split_rules);")).fetchall()]
                if col not in columns:
                    logger.info(f"Adicionando coluna {col} em product_split_rules (SQLite)...")
                    conn.execute(text(f"ALTER TABLE product_split_rules ADD COLUMN {col} {col_type};"))
                    conn.commit()
                    logger.info(f"Coluna {col} adicionada com sucesso no SQLite.")
                else:
                    logger.info(f"Coluna {col} já existe na tabela product_split_rules.")
        except Exception as e:
            logger.error(f"Erro ao adicionar coluna {col} em product_split_rules: {e}")
            raise e

    logger.info("Migração de valid_until concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
