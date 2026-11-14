"""load_database.py against a database with no tables, like a new Supabase project. Uses the real seed files."""

from pathlib import Path

import psycopg
import pytest

from load_database import DatabaseState, get_state, load_database

COUNTS = "SELECT (SELECT count(*) FROM dat.crew_member), (SELECT count(*) FROM dat.reading)"


@pytest.fixture
def connection(empty_database_url: str) -> psycopg.Connection:
    with psycopg.connect(empty_database_url, autocommit=True) as connection:
        yield connection


def test_creates_the_tables_and_loads_the_data_into_an_empty_database(connection: psycopg.Connection) -> None:
    found = load_database(connection, rebuild=False)

    assert found == DatabaseState.EMPTY
    assert get_state(connection) == DatabaseState.LOADED
    crew_members, readings = connection.execute(COUNTS).fetchone()
    assert crew_members >= 1
    assert readings > 0


def test_running_it_again_leaves_the_data_as_it_is(connection: psycopg.Connection) -> None:
    load_database(connection, rebuild=False)
    connection.execute("DELETE FROM dat.reading WHERE indicator_id = 'steps'")
    before = connection.execute(COUNTS).fetchone()

    found = load_database(connection, rebuild=False)

    assert found == DatabaseState.LOADED
    assert connection.execute(COUNTS).fetchone() == before


def test_rebuild_deletes_everything_and_loads_it_again(connection: psycopg.Connection) -> None:
    load_database(connection, rebuild=False)
    expected = connection.execute(COUNTS).fetchone()
    connection.execute("DELETE FROM dat.reading")

    load_database(connection, rebuild=True)

    assert connection.execute(COUNTS).fetchone() == expected


def test_loads_the_data_when_the_tables_exist_but_are_empty(connection: psycopg.Connection) -> None:
    load_database(connection, rebuild=False)
    connection.execute(
        "TRUNCATE his.auth_event, dat.session, dat.app_user, dat.reading, dat.crew_member, cfg.rule, cfg.indicator, cfg.source"
    )

    found = load_database(connection, rebuild=False)

    assert found == DatabaseState.NO_DATA
    assert get_state(connection) == DatabaseState.LOADED


def test_a_failed_load_leaves_the_database_as_it_was(connection: psycopg.Connection, tmp_path: Path) -> None:
    seeds_dir = tmp_path / "seeds"
    seeds_dir.mkdir()
    (seeds_dir / "10_ok.sql").write_text("INSERT INTO cfg.source VALUES ('a', 'a', 'a', 'a');")
    (seeds_dir / "20_broken.sql").write_text("INSERT INTO cfg.indicator (id) VALUES ('no other columns');")

    with pytest.raises(psycopg.errors.NotNullViolation):
        load_database(connection, rebuild=False, seeds_dir=seeds_dir)

    assert get_state(connection) == DatabaseState.EMPTY


def test_refuses_a_database_with_only_some_of_the_schemas(connection: psycopg.Connection) -> None:
    connection.execute("CREATE SCHEMA cfg")

    with pytest.raises(SystemExit, match="Only some of the schemas"):
        load_database(connection, rebuild=False)
