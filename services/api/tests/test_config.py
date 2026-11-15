"""DATABASE_PROVIDER picks the database. These tests need no database."""

import pytest
from pydantic import ValidationError
from sqlalchemy import make_url

from app.config import Settings
from app.db import get_connect_args, to_psycopg_url

LOCAL_URL = "postgresql://postgres:secret@localhost:5432/real_telemetry"
RENDER_INTERNAL_URL = "postgresql://mooncare:secret@dpg-abc123-a/mooncare"
RENDER_EXTERNAL_URL = "postgresql://mooncare:secret@dpg-abc123-a.frankfurt-postgres.render.com/mooncare"


def build_settings(**values: str) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def test_uses_the_local_url_when_the_provider_is_postgresql() -> None:
    settings = build_settings(database_provider="postgresql", postgresql_url=LOCAL_URL, render_database_url=RENDER_INTERNAL_URL)

    assert settings.database_url == LOCAL_URL


def test_uses_the_render_url_when_the_provider_is_render() -> None:
    settings = build_settings(database_provider="render", postgresql_url=LOCAL_URL, render_database_url=RENDER_INTERNAL_URL)

    assert settings.database_url == RENDER_INTERNAL_URL


def test_refuses_a_provider_without_its_url() -> None:
    with pytest.raises(ValidationError, match="DATABASE_PROVIDER is 'render' but its URL is not set"):
        build_settings(database_provider="render", postgresql_url=LOCAL_URL)


def test_refuses_an_unknown_provider() -> None:
    with pytest.raises(ValidationError):
        build_settings(database_provider="mysql", postgresql_url=LOCAL_URL)


def test_turns_a_pasted_connection_string_into_a_psycopg_one() -> None:
    assert to_psycopg_url(RENDER_EXTERNAL_URL).drivername == "postgresql+psycopg"


def test_local_postgresql_needs_no_extra_connection_settings() -> None:
    assert get_connect_args("postgresql", make_url(LOCAL_URL)) == {}


def test_render_internal_url_needs_no_encryption() -> None:
    assert get_connect_args("render", make_url(RENDER_INTERNAL_URL)) == {}


def test_render_external_url_requires_ssl() -> None:
    assert get_connect_args("render", make_url(RENDER_EXTERNAL_URL)) == {"sslmode": "require"}
