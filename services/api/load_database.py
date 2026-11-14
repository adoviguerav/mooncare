"""Creates the tables and loads the seed data into the database chosen by DATABASE_PROVIDER in .env.

    uv run python load_database.py             # creates what is missing; never touches existing data
    uv run python load_database.py --rebuild   # deletes the cfg, dat and his schemas and builds them again

The tables come from database/postgresql/schema and the data from database/postgresql/seeds (written by
seed.py). Everything runs in one transaction: if any statement fails, the database is left as it was.
Works the same against the local PostgreSQL and Supabase, without psql or Docker.
"""

import argparse
import logging
from enum import StrEnum
from pathlib import Path

import psycopg
from sqlalchemy import make_url

from app.config import SCHEMA_DIR, SEEDS_DIR, DatabaseProvider, get_settings
from app.db import get_connect_args, to_psycopg_url

SCHEMAS = ("cfg", "dat", "his")

log = logging.getLogger("load_database")


class DatabaseState(StrEnum):
    EMPTY = "empty"  # none of our schemas exist
    NO_DATA = "no data"  # the tables exist but hold no data
    LOADED = "loaded"  # the tables hold data
    PARTIAL = "partial"  # some schemas exist and some do not: built by hand or by an older version


def connect(provider: DatabaseProvider, database_url: str) -> psycopg.Connection:
    url = to_psycopg_url(database_url)
    conninfo = url.set(drivername="postgresql").render_as_string(hide_password=False)
    # autocommit, so that connection.transaction() opens a real transaction and not a savepoint
    return psycopg.connect(conninfo, autocommit=True, **get_connect_args(provider, url))


def describe_target(provider: DatabaseProvider, database_url: str) -> str:
    """Where we are writing, without the password."""
    url = make_url(database_url)
    return f"{provider} ({url.host}:{url.port or 5432}/{url.database})"


def get_state(connection: psycopg.Connection) -> DatabaseState:
    row = connection.execute(
        "SELECT count(*) FROM information_schema.schemata WHERE schema_name = ANY(%s)", (list(SCHEMAS),)
    ).fetchone()
    existing_schemas = row[0] if row else 0
    if existing_schemas == 0:
        return DatabaseState.EMPTY
    if existing_schemas < len(SCHEMAS):
        return DatabaseState.PARTIAL
    has_data = connection.execute(
        "SELECT EXISTS (SELECT 1 FROM cfg.source) OR EXISTS (SELECT 1 FROM dat.crew_member)"
    ).fetchone()
    return DatabaseState.LOADED if has_data and has_data[0] else DatabaseState.NO_DATA


def run_files(connection: psycopg.Connection, sql_dir: Path) -> None:
    for sql_file in sorted(sql_dir.glob("*.sql")):
        log.info("  %s/%s", sql_dir.name, sql_file.name)
        # Without parameters psycopg sends the file as one script, several statements included
        connection.execute(sql_file.read_text(encoding="utf-8"))  # type: ignore[arg-type]


def drop_schemas(connection: psycopg.Connection) -> None:
    for schema in reversed(SCHEMAS):
        connection.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")  # type: ignore[arg-type]


def load_database(
    connection: psycopg.Connection, rebuild: bool, schema_dir: Path = SCHEMA_DIR, seeds_dir: Path = SEEDS_DIR
) -> DatabaseState:
    """Brings the database to a loaded state. Returns the state it found."""
    state = get_state(connection)
    log.info("Found: %s", state)

    with connection.transaction():
        if rebuild:
            log.info("Deleting the schemas %s", ", ".join(SCHEMAS))
            drop_schemas(connection)
        elif state == DatabaseState.LOADED:
            log.info("Already loaded. Nothing done. Use --rebuild to delete it and load it again.")
            return state
        elif state == DatabaseState.PARTIAL:
            raise SystemExit(
                f"Only some of the schemas {SCHEMAS} exist. Check the database, or use --rebuild to start over."
            )

        if rebuild or state == DatabaseState.EMPTY:
            log.info("Creating the tables")
            run_files(connection, schema_dir)
        log.info("Loading the data")
        run_files(connection, seeds_dir)
    return state


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--rebuild", action="store_true", help="delete the cfg, dat and his schemas, with all their data, and load again"
    )
    arguments = parser.parse_args()

    settings = get_settings()
    assert settings.database_url is not None  # Settings already refuses a missing URL
    log.info("Database: %s", describe_target(settings.database_provider, settings.database_url))
    with connect(settings.database_provider, settings.database_url) as connection:
        load_database(connection, arguments.rebuild)
    log.info("Done")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
