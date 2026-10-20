"""
Script de migração para o Escudo Anti-Carding, Velocity Check e Blacklist Própria (#10).
Cria as tabelas:
1. blacklist_entries (bloqueio por CPF, e-mail, telefone e IP)
2. card_attempt_logs (registro de tentativas para cálculo de frequência/velocity)
3. security_settings (configurações com threshold de 5 tentativas em 10 minutos)
Suporta PostgreSQL e SQLite com idempotência.
"""
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine
from app.core.logger import logger


def run_migration():
    logger.info("Iniciando migração do Escudo Anti-Carding, Velocity Check e Blacklist...")
    with engine.connect() as conn:
        dialect = engine.dialect.name
        logger.info(f"Dialeto do banco: {dialect}")

        if dialect == "postgresql":
            # 1. blacklist_entries
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS blacklist_entries (
                    id SERIAL PRIMARY KEY,
                    entry_type VARCHAR(20) NOT NULL,
                    value VARCHAR(255) NOT NULL,
                    reason VARCHAR(500) NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_type ON blacklist_entries (entry_type);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_value ON blacklist_entries (value);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_active ON blacklist_entries (is_active);"))

            # 2. card_attempt_logs
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS card_attempt_logs (
                    id SERIAL PRIMARY KEY,
                    ip_address VARCHAR(50) NULL,
                    cpf VARCHAR(20) NULL,
                    email VARCHAR(255) NULL,
                    device_fingerprint VARCHAR(255) NULL,
                    order_code VARCHAR(50) NULL,
                    status VARCHAR(20) NOT NULL,
                    reason VARCHAR(255) NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_ip ON card_attempt_logs (ip_address);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_cpf ON card_attempt_logs (cpf);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_email ON card_attempt_logs (email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_status ON card_attempt_logs (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_created_at ON card_attempt_logs (created_at);"))

            # 3. security_settings
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS security_settings (
                    id SERIAL PRIMARY KEY,
                    velocity_threshold INTEGER NOT NULL DEFAULT 5,
                    velocity_window_minutes INTEGER NOT NULL DEFAULT 10,
                    auto_blacklist_on_chargeback BOOLEAN NOT NULL DEFAULT TRUE,
                    is_velocity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    is_blacklist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            # Inserir registro padrão se não existir
            exists = conn.execute(text("SELECT id FROM security_settings WHERE id = 1;")).fetchone()
            if not exists:
                conn.execute(text("""
                    INSERT INTO security_settings (id, velocity_threshold, velocity_window_minutes, auto_blacklist_on_chargeback, is_velocity_enabled, is_blacklist_enabled)
                    VALUES (1, 5, 10, TRUE, TRUE, TRUE);
                """))
            conn.commit()
            logger.info("Tabelas de segurança criadas/verificadas com sucesso no PostgreSQL.")

        else:
            # SQLite
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS blacklist_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entry_type VARCHAR(20) NOT NULL,
                    value VARCHAR(255) NOT NULL,
                    reason VARCHAR(500) NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_type ON blacklist_entries (entry_type);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_value ON blacklist_entries (value);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blacklist_entries_active ON blacklist_entries (is_active);"))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS card_attempt_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip_address VARCHAR(50) NULL,
                    cpf VARCHAR(20) NULL,
                    email VARCHAR(255) NULL,
                    device_fingerprint VARCHAR(255) NULL,
                    order_code VARCHAR(50) NULL,
                    status VARCHAR(20) NOT NULL,
                    reason VARCHAR(255) NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_ip ON card_attempt_logs (ip_address);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_cpf ON card_attempt_logs (cpf);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_email ON card_attempt_logs (email);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_status ON card_attempt_logs (status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_card_attempt_logs_created_at ON card_attempt_logs (created_at);"))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS security_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    velocity_threshold INTEGER NOT NULL DEFAULT 5,
                    velocity_window_minutes INTEGER NOT NULL DEFAULT 10,
                    auto_blacklist_on_chargeback BOOLEAN NOT NULL DEFAULT 1,
                    is_velocity_enabled BOOLEAN NOT NULL DEFAULT 1,
                    is_blacklist_enabled BOOLEAN NOT NULL DEFAULT 1,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            exists = conn.execute(text("SELECT id FROM security_settings WHERE id = 1;")).fetchone()
            if not exists:
                conn.execute(text("""
                    INSERT INTO security_settings (id, velocity_threshold, velocity_window_minutes, auto_blacklist_on_chargeback, is_velocity_enabled, is_blacklist_enabled)
                    VALUES (1, 5, 10, 1, 1, 1);
                """))
            conn.commit()
            logger.info("Tabelas de segurança criadas/verificadas com sucesso no SQLite.")

    logger.info("Migração do Escudo Anti-Carding concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
