"""A throwaway PostgreSQL database for the tests, built from the same .sql files as the real one.

It is created on the server of TEST_DATABASE_URL or, if that is not set, of POSTGRESQL_URL in .env
(the local Docker database), and dropped at the end. The real database is never touched.
"""

import os
import uuid
from collections.abc import Callable, Iterator
from pathlib import Path

import psycopg
import pytest
from psycopg import sql
from pydantic import ValidationError
from sqlalchemy import Engine, make_url

from app.config import SCHEMA_DIR, Settings
from app.db import build_engine
from seed import CrewPairing, build_seed_files

SEEDED_TABLES = "dat.reading, dat.crew_member, cfg.rule, cfg.indicator, cfg.source"

LoadSeeds = Callable[[list[CrewPairing], Path, Path, Path], None]


def get_server_url() -> str:
    server_url = os.environ.get("TEST_DATABASE_URL")
    if not server_url:
        try:
            server_url = Settings(database_provider="postgresql").postgresql_url
        except ValidationError:
            server_url = None
    if not server_url:
        pytest.fail("Set POSTGRESQL_URL in services/api/.env, or TEST_DATABASE_URL, to run the tests.")
    return make_url(server_url).set(drivername="postgresql").render_as_string(hide_password=False)


def with_database(server_url: str, database_name: str) -> str:
    return make_url(server_url).set(database=database_name).render_as_string(hide_password=False)


def run_sql(database_url: str, script: str) -> None:
    """Runs a whole .sql file. Without parameters psycopg sends it as one script, several statements included."""
    with psycopg.connect(database_url, autocommit=True) as connection:
        connection.execute(script)  # type: ignore[arg-type]


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    server_url = get_server_url()
    database_name = f"real_telemetry_test_{uuid.uuid4().hex[:8]}"
    try:
        with psycopg.connect(server_url, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
    except psycopg.OperationalError as error:
        pytest.fail(
            "Cannot reach the test PostgreSQL server. Start it with "
            f"`cd database/postgresql && docker compose up -d`.\n{error}"
        )

    url = with_database(server_url, database_name)
    for schema_file in sorted(SCHEMA_DIR.glob("*.sql")):
        run_sql(url, schema_file.read_text(encoding="utf-8"))
    yield url

    with psycopg.connect(server_url, autocommit=True) as connection:
        connection.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database_name)))


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    engine = build_engine("postgresql", database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def load_seeds(database_url: str) -> LoadSeeds:
    """Empties the tables and loads the seed files built from the given crew and CSV files."""

    def load(crew: list[CrewPairing], metabolic_panel_csv: Path, hourly_csv: Path, daily_csv: Path) -> None:
        run_sql(database_url, f"TRUNCATE {SEEDED_TABLES} RESTART IDENTITY")
        for script in build_seed_files(crew, metabolic_panel_csv, hourly_csv, daily_csv).values():
            run_sql(database_url, script)

    return load


@pytest.fixture
def fetch_all(database_url: str) -> Callable[[str], list[tuple]]:
    def fetch(query: str) -> list[tuple]:
        with psycopg.connect(database_url) as connection:
            return connection.execute(query).fetchall()  # type: ignore[arg-type]

    return fetch
