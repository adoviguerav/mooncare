"""The database connection. The one place where the local PostgreSQL and the PostgreSQL of Render differ.

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

# Render's external URL (from outside Render) ends in this host name and only takes encrypted connections. Its
# internal URL (from a service in the same region) is a short host name and needs no encryption.
RENDER_EXTERNAL_HOST = ".render.com"


def to_psycopg_url(database_url: str) -> URL:
    """Accepts a connection string as Render or psql give it (postgresql://...) and makes SQLAlchemy use psycopg 3."""
    url = make_url(database_url)
    if url.drivername in ("postgres", "postgresql"):
        url = url.set(drivername="postgresql+psycopg")
    return url


def get_connect_args(provider: DatabaseProvider, url: URL) -> dict[str, Any]:
    if provider == "postgresql":
        return {}
    if (url.host or "").endswith(RENDER_EXTERNAL_HOST):
        return {"sslmode": "require"}
    return {}


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
