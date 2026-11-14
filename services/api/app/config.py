import os
from pathlib import Path

DATABASE_DIR = Path(__file__).resolve().parents[3] / "database"
SCHEMA_PATH = DATABASE_DIR / "sqlite" / "schema.sql"

NASA_DIR = DATABASE_DIR / "datasets" / "nasa"
LIFESNAPS_DIR = DATABASE_DIR / "datasets" / "lifesnaps"

METABOLIC_PANEL_CSV = NASA_DIR / "metabolic_panel.csv"
LIFESNAPS_DAILY_CSV = LIFESNAPS_DIR / "daily_fitbit_sema_df_unprocessed.csv"
LIFESNAPS_HOURLY_CSV = LIFESNAPS_DIR / "hourly_fitbit_sema_df_unprocessed.csv"


def get_database_path() -> Path:
    return Path(os.environ.get("REAL_TELEMETRY_DB", DATABASE_DIR / "sqlite" / "real_telemetry.db"))
