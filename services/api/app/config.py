import os
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
RADLAB_DIR = NASA_DIR / "radlab"
BLOOD_COUNT_CSV = NASA_DIR / "blood_count.csv"
CARDIOVASCULAR_PANEL_CSV = NASA_DIR / "cardiovascular_panel.csv"
IMMUNE_PANEL_EVE_CSV = NASA_DIR / "immune_panel_eve.csv"
IMMUNE_PANEL_ALAMAR_CSV = NASA_DIR / "immune_panel_alamar.csv"
LIFESNAPS_DAILY_CSV = LIFESNAPS_DIR / "daily_fitbit_sema_df_unprocessed.csv"
LIFESNAPS_HOURLY_CSV = LIFESNAPS_DIR / "hourly_fitbit_sema_df_unprocessed.csv"
LIFESNAPS_STAI_CSV = LIFESNAPS_DIR / "stai.csv"
LIFESNAPS_PANAS_CSV = LIFESNAPS_DIR / "panas.csv"

DatabaseProvider = Literal["postgresql", "supabase"]
NodeRole = Literal["moon", "earth"]


class Settings(BaseSettings):
    """Read from the environment, or from the .env file in services/api. See .env.example."""

    model_config = SettingsConfigDict(env_file_encoding="utf-8", extra="ignore")

    # Which database the API uses. Both have the same structure, built from database/postgresql.
    database_provider: DatabaseProvider = "postgresql"
    postgresql_url: str | None = None
    supabase_database_url: str | None = None

    # Which server this is. The same code runs on both; the moon works on its own and syncs with earth
    # when asked to.
    node_role: NodeRole = "moon"
    earth_url: str | None = None  # moon only: the base URL of the earth server, e.g. https://earth.example.com
    sync_token: str | None = None  # shared secret between the two servers. Without it, syncing is off

    # The session cookie is sent over HTTPS only. False for http://localhost, true when deployed
    cookie_secure: bool = False
    # False opens every endpoint to a caller with no session: the web app of the demo has no sign-in screen.
    # Signing in still works. True makes every endpoint ask for a signed-in user
    auth_required: bool = False

    # The voice agent of the emergency guide. Without both, the guide uses its recorded audio.
    elevenlabs_api_key: str | None = None
    elevenlabs_agent_id: str | None = None

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
    # ENV_FILE picks another file in services/api, e.g. ENV_FILE=.env.earth to run the earth server locally
    return Settings(_env_file=API_DIR / os.environ.get("ENV_FILE", ".env"))  # type: ignore[call-arg]
