"""Throwaway PostgreSQL databases for the tests, built from the same .sql files as the real one.

They are created on the server of TEST_DATABASE_URL or, if that is not set, of POSTGRESQL_URL in .env
(the local PostgreSQL), and dropped at the end. The real database is never touched.
"""

import os
import uuid
from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from pathlib import Path

import psycopg
import pytest
from psycopg import sql
from pydantic import ValidationError
from sqlalchemy import Engine, make_url

from app.config import API_DIR, SCHEMA_DIR, Settings
from app.db import build_engine
from seed import DAILY_COLUMNS, CrewPairing, DatasetFiles, build_seed_files

SEEDED_TABLES = (
    "his.auth_event, dat.session, dat.app_user, dat.reading, dat.crew_member, cfg.rule, cfg.indicator, cfg.source"
)
# The LifeSnaps daily file starts with an unnamed index column
DAILY_HEADER = "," + ",".join(["id", "date", *DAILY_COLUMNS.values()]) + "\n"

LoadSeeds = Callable[..., None]


def get_server_url() -> str:
    server_url = os.environ.get("TEST_DATABASE_URL")
    if not server_url:
        try:
            env_file = API_DIR / os.environ.get("ENV_FILE", ".env")
            server_url = Settings(_env_file=env_file, database_provider="postgresql").postgresql_url  # type: ignore[call-arg]
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


@contextmanager
def throwaway_database() -> Iterator[str]:
    """A new, empty database with a random name. Dropped when the block ends."""
    server_url = get_server_url()
    database_name = f"real_telemetry_test_{uuid.uuid4().hex[:8]}"
    try:
        with psycopg.connect(server_url, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
    except psycopg.OperationalError as error:
        pytest.fail(f"Cannot reach the test PostgreSQL server. Start it, or set TEST_DATABASE_URL.\n{error}")
    try:
        yield with_database(server_url, database_name)
    finally:
        with psycopg.connect(server_url, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database_name)))


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    """A database with the tables of database/postgresql/schema, shared by the tests that load seeds."""
    with throwaway_database() as url:
        for schema_file in sorted(SCHEMA_DIR.glob("*.sql")):
            run_sql(url, schema_file.read_text(encoding="utf-8"))
        yield url


@pytest.fixture
def new_database() -> Iterator[Callable[[], str]]:
    """Creates databases with the tables of database/postgresql/schema, as many as a test needs."""
    with ExitStack() as databases:

        def create() -> str:
            url = databases.enter_context(throwaway_database())
            for schema_file in sorted(SCHEMA_DIR.glob("*.sql")):
                run_sql(url, schema_file.read_text(encoding="utf-8"))
            return url

        yield create


@pytest.fixture
def empty_database_url() -> Iterator[str]:
    """A database with no tables at all, like a new Supabase project or a new local database."""
    with throwaway_database() as url:
        yield url


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    engine = build_engine("postgresql", database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def load_seeds(database_url: str, tmp_path: Path) -> LoadSeeds:
    """Empties the tables and loads the seed files built from the given crew and CSV files.

    The daily file is optional: without it the crew has no daily readings.
    """

    def load(
        crew: list[CrewPairing], metabolic_panel_csv: Path, hourly_csv: Path, daily_csv: Path | None = None
    ) -> None:
        if daily_csv is None:
            daily_csv = tmp_path / "empty_daily.csv"
            daily_csv.write_text(DAILY_HEADER, encoding="utf-8")
        run_sql(database_url, f"TRUNCATE {SEEDED_TABLES} RESTART IDENTITY")
        for script in build_seed_files(crew, DatasetFiles(metabolic_panel_csv, hourly_csv, daily_csv)).values():
            run_sql(database_url, script)

    return load


@pytest.fixture
def fetch_all(database_url: str) -> Callable[[str], list[tuple]]:
    def fetch(query: str) -> list[tuple]:
        with psycopg.connect(database_url) as connection:
            return connection.execute(query).fetchall()  # type: ignore[arg-type]

    return fetch
