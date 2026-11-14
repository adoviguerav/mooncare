"""DATABASE_PROVIDER picks the database. These tests need no database."""

import pytest
from pydantic import ValidationError
from sqlalchemy import make_url

from app.config import Settings
from app.db import get_connect_args, to_psycopg_url

LOCAL_URL = "postgresql://postgres:secret@localhost:5432/real_telemetry"
SUPABASE_SESSION_URL = "postgresql://postgres.abc:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
SUPABASE_TRANSACTION_URL = "postgresql://postgres.abc:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"


def build_settings(**values: str) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def test_uses_the_local_url_when_the_provider_is_postgresql() -> None:
    settings = build_settings(
        database_provider="postgresql", postgresql_url=LOCAL_URL, supabase_database_url=SUPABASE_SESSION_URL
    )

    assert settings.database_url == LOCAL_URL


def test_uses_the_supabase_url_when_the_provider_is_supabase() -> None:
    settings = build_settings(
        database_provider="supabase", postgresql_url=LOCAL_URL, supabase_database_url=SUPABASE_SESSION_URL
    )

    assert settings.database_url == SUPABASE_SESSION_URL


def test_refuses_a_provider_without_its_url() -> None:
    with pytest.raises(ValidationError, match="DATABASE_PROVIDER is 'supabase' but its URL is not set"):
        build_settings(database_provider="supabase", postgresql_url=LOCAL_URL)


def test_refuses_an_unknown_provider() -> None:
    with pytest.raises(ValidationError):
        build_settings(database_provider="mysql", postgresql_url=LOCAL_URL)


def test_turns_a_pasted_connection_string_into_a_psycopg_one() -> None:
    assert to_psycopg_url(SUPABASE_SESSION_URL).drivername == "postgresql+psycopg"


def test_local_postgresql_needs_no_extra_connection_settings() -> None:
    assert get_connect_args("postgresql", make_url(LOCAL_URL)) == {}


def test_supabase_requires_ssl() -> None:
    assert get_connect_args("supabase", make_url(SUPABASE_SESSION_URL)) == {"sslmode": "require"}


def test_supabase_transaction_pooler_turns_off_prepared_statements() -> None:
    assert get_connect_args("supabase", make_url(SUPABASE_TRANSACTION_URL)) == {
        "sslmode": "require",
        "prepare_threshold": None,
    }
