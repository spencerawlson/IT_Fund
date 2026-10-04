"""Alembic environment for the IT_Fund backend.

The database URL comes from the same DATABASE_URL env var the app uses (db.py), so
`alembic upgrade head` always targets the real database. Models are registered by
importing db_models; compare_type is on so column type drift is caught.
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db  # noqa: E402
import db_models  # noqa: E402  (registers all mappers)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point Alembic at the app's database: env var wins, same default as db.py.
config.set_main_option("sqlalchemy.url", os.environ.get("DATABASE_URL") or db.DEFAULT_URL)

target_metadata = db.Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
