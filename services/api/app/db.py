"""The database connection. The one place where PostgreSQL and Supabase differ.

Both are PostgreSQL with the same structure, so the models and the queries are shared. Only the
connection settings change with DATABASE_PROVIDER.
"""

from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import URL, Engine, create_engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import DatabaseProvider, get_settings

SUPABASE_TRANSACTION_POOLER_PORT = 6543


def to_psycopg_url(database_url: str) -> URL:
    """Accepts a connection string as Supabase or psql give it (postgresql://...) and makes SQLAlchemy use psycopg 3."""
    url = make_url(database_url)
    if url.drivername in ("postgres", "postgresql"):
        url = url.set(drivername="postgresql+psycopg")
    return url


def get_connect_args(provider: DatabaseProvider, url: URL) -> dict[str, Any]:
    if provider == "postgresql":
        return {}
    connect_args: dict[str, Any] = {"sslmode": "require"}  # Supabase only accepts encrypted connections
    if url.port == SUPABASE_TRANSACTION_POOLER_PORT:
        # The transaction pooler can hand each transaction to a different server connection,
        # so a statement prepared on one connection may not exist on the next.
        connect_args["prepare_threshold"] = None
    return connect_args


def build_engine(provider: DatabaseProvider, database_url: str) -> Engine:
    url = to_psycopg_url(database_url)
    return create_engine(
        url,
        connect_args=get_connect_args(provider, url),
        pool_pre_ping=True,  # a connection dropped by the server or the pooler is replaced, not reused
        pool_size=5,
        max_overflow=5,
    )


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    assert settings.database_url is not None  # Settings already refuses a missing URL
    return build_engine(settings.database_provider, settings.database_url)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with get_session_factory()() as session:
        yield session


DbSession = Annotated[Session, Depends(get_session)]
