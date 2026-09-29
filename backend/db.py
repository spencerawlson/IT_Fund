"""Database engine and session factory.

Postgres in production (self-hosted on the VM), via DATABASE_URL. Local dev and tests default to
SQLite so nothing external is required. Models live in db_models.py; call init_db() once at startup
to create tables (idempotent). A future Alembic migration set replaces create_all before the first
real deployment carries data.
"""
from __future__ import annotations

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


DEFAULT_URL = "sqlite+pysqlite:///./labs_dev.db"

engine = None
SessionLocal = None


def configure(url: str | None = None) -> None:
    """(Re)create the engine and session factory. Tests call this with an in-memory URL."""
    global engine, SessionLocal
    url = url or os.environ.get("DATABASE_URL") or DEFAULT_URL
    if url.startswith("sqlite") and ":memory:" in url:
        # One shared connection so every session sees the same in-memory database (tests).
        engine = create_engine(url, future=True, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    elif url.startswith("sqlite"):
        engine = create_engine(url, future=True, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(url, future=True, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


def init_db() -> None:
    import db_models  # noqa: F401  (register mappers before create_all)

    Base.metadata.create_all(engine)


def ping() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


configure()
