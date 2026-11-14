from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[1]
DATABASE_DIR = API_DIR.parents[1] / "database"
POSTGRESQL_DIR = DATABASE_DIR / "postgresql"
SCHEMA_DIR = POSTGRESQL_DIR / "schema"
SEEDS_DIR = POSTGRESQL_DIR / "seeds"

NASA_DIR = DATABASE_DIR / "datasets" / "nasa"
LIFESNAPS_DIR = DATABASE_DIR / "datasets" / "lifesnaps"

METABOLIC_PANEL_CSV = NASA_DIR / "metabolic_panel.csv"
LIFESNAPS_DAILY_CSV = LIFESNAPS_DIR / "daily_fitbit_sema_df_unprocessed.csv"
LIFESNAPS_HOURLY_CSV = LIFESNAPS_DIR / "hourly_fitbit_sema_df_unprocessed.csv"

DatabaseProvider = Literal["postgresql", "supabase"]


class Settings(BaseSettings):
    """Read from the environment, or from services/api/.env. See .env.example."""

    model_config = SettingsConfigDict(env_file=API_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    # Which database the API uses. Both have the same structure, built from database/postgresql.
    database_provider: DatabaseProvider = "postgresql"
    postgresql_url: str | None = None
    supabase_database_url: str | None = None

    @model_validator(mode="after")
    def require_the_url_of_the_chosen_provider(self) -> "Settings":
        if self.database_url is None:
            raise ValueError(
                f"DATABASE_PROVIDER is {self.database_provider!r} but its URL is not set. "
                "Copy services/api/.env.example to services/api/.env and fill it in."
            )
        return self

    @property
    def database_url(self) -> str | None:
        return self.postgresql_url if self.database_provider == "postgresql" else self.supabase_database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
