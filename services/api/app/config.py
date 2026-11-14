import os
from pathlib import Path

DATABASE_DIR = Path(__file__).resolve().parents[3] / "database"
SCHEMA_PATH = DATABASE_DIR / "sqlite" / "schema.sql"

METABOLIC_PANEL_CSV = DATABASE_DIR / "datasets" / "nasa" / "metabolic_panel.csv"
LIFESNAPS_DAILY_CSV = DATABASE_DIR / "datasets" / "lifesnaps" / "daily_fitbit_sema_df_unprocessed.csv"
LIFESNAPS_HOURLY_CSV = DATABASE_DIR / "datasets" / "lifesnaps" / "hourly_fitbit_sema_df_unprocessed.csv"


def get_database_path() -> Path:
    return Path(os.environ.get("REAL_TELEMETRY_DB", DATABASE_DIR / "sqlite" / "real_telemetry.db"))
