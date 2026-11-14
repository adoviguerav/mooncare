"""Builds the SQLite file from the raw datasets. Run once before the demo; it replaces the file."""

import csv
import logging
import re
import sqlite3
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from app.config import (
    LIFESNAPS_DAILY_CSV,
    LIFESNAPS_HOURLY_CSV,
    METABOLIC_PANEL_CSV,
    SCHEMA_PATH,
    get_database_path,
)
from seed_content import INDICATORS, RULES, SOURCES

# Inspiration4, UTC. Draw labels count days from these: L-92 is launch minus 92, R+45 is landing plus 45.
LAUNCH_DATE = date(2021, 9, 16)
LANDING_DATE = date(2021, 9, 18)
SAMPLE_LABEL_PATTERN = re.compile(r"([LR])[+-](\d+)")

GLUCOSE_COLUMN = "glucose_value_milligram_per_deciliter"
MOOD_COLUMNS = {
    "mood_happy": "HAPPY",
    "mood_sad": "SAD",
    "mood_tense": "TENSE/ANXIOUS",
    "mood_alert": "ALERT",
    "mood_rested": "RESTED/RELAXED",
    "mood_neutral": "NEUTRAL",
}

log = logging.getLogger("seed")


@dataclass(frozen=True)
class CrewPairing:
    """One fictional crew member: the Inspiration4 astronaut and LifeSnaps volunteer behind their data."""

    name: str
    inspiration4_code: str
    lifesnaps_id: str
    lifesnaps_offset_days: int = 0


@dataclass(frozen=True)
class Reading:
    indicator_id: str
    taken_at: str
    value: float


CREW = [
    # -77 days puts the volunteer's last mood entry (2022-01-17) on 2021-11-01, the day before the demo date.
    CrewPairing(
        "Crew 1",
        inspiration4_code="C003",
        lifesnaps_id="621e2f9167b776a240011ccb",
        lifesnaps_offset_days=-77,
    ),
]


def get_draw_date(sample_label: str) -> date:
    match = SAMPLE_LABEL_PATTERN.fullmatch(sample_label)
    if match is None:
        raise ValueError(f"Unknown sample label {sample_label!r}")
    reference, days = match.group(1), timedelta(days=int(match.group(2)))
    return LAUNCH_DATE - days if reference == "L" else LANDING_DATE + days


def read_glucose_readings(metabolic_panel_csv: Path, inspiration4_code: str) -> list[Reading]:
    readings = []
    with metabolic_panel_csv.open(newline="", encoding="utf-8-sig") as csv_file:
        for row in csv.DictReader(csv_file):
            crew_code, _, sample_label = row["Sample Name"].split("_")
            if crew_code != inspiration4_code or row[GLUCOSE_COLUMN] == "":
                continue
            taken_at = f"{get_draw_date(sample_label).isoformat()}T00:00"
            readings.append(Reading("glucose", taken_at, float(row[GLUCOSE_COLUMN])))
    return readings


def read_heart_rate_readings(hourly_csv: Path, lifesnaps_id: str, offset_days: int) -> list[Reading]:
    readings = []
    with hourly_csv.open(newline="", encoding="utf-8-sig") as csv_file:
        for row in csv.DictReader(csv_file):
            if row["id"] != lifesnaps_id or row["bpm"] == "":
                continue
            day = datetime.fromisoformat(row["date"]).date() + timedelta(days=offset_days)
            taken_at = f"{day.isoformat()}T{int(float(row['hour'])):02d}:00"
            readings.append(Reading("heart_rate", taken_at, float(row["bpm"])))
    return readings


def read_mood_readings(daily_csv: Path, lifesnaps_id: str, offset_days: int) -> list[Reading]:
    readings = []
    with daily_csv.open(newline="", encoding="utf-8-sig") as csv_file:
        for row in csv.DictReader(csv_file):
            if row["id"] != lifesnaps_id:
                continue
            day = datetime.fromisoformat(row["date"]).date() + timedelta(days=offset_days)
            for indicator_id, column in MOOD_COLUMNS.items():
                if row[column] != "":
                    readings.append(Reading(indicator_id, f"{day.isoformat()}T00:00", float(row[column])))
    return readings


def seed_database(
    database_path: Path,
    crew: list[CrewPairing],
    metabolic_panel_csv: Path,
    hourly_csv: Path,
    daily_csv: Path,
) -> None:
    database_path.unlink(missing_ok=True)
    connection = sqlite3.connect(database_path)
    with connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        connection.executemany(
            "INSERT INTO source (id, name, url, citation) VALUES (:id, :name, :url, :citation)",
            [asdict(source) for source in SOURCES],
        )
        connection.executemany(
            "INSERT INTO indicator (id, name, unit, how_to_measure, why_it_matters, source_id) "
            "VALUES (:id, :name, :unit, :how_to_measure, :why_it_matters, :source_id)",
            [asdict(indicator) for indicator in INDICATORS],
        )
        connection.executemany(
            "INSERT INTO rule (indicator_id, low, high, title, explanation, action, threshold_source) "
            "VALUES (:indicator_id, :low, :high, :title, :explanation, :action, :threshold_source)",
            [asdict(rule) for rule in RULES],
        )
        for pairing in crew:
            crew_member_id = connection.execute(
                "INSERT INTO crew_member (name) VALUES (?)", (pairing.name,)
            ).lastrowid
            readings = (
                read_glucose_readings(metabolic_panel_csv, pairing.inspiration4_code)
                + read_heart_rate_readings(hourly_csv, pairing.lifesnaps_id, pairing.lifesnaps_offset_days)
                + read_mood_readings(daily_csv, pairing.lifesnaps_id, pairing.lifesnaps_offset_days)
            )
            connection.executemany(
                "INSERT INTO reading VALUES (?, ?, ?, ?)",
                [(crew_member_id, reading.indicator_id, reading.taken_at, reading.value) for reading in readings],
            )
            log.info("Seeded %s with %d readings", pairing.name, len(readings))
    connection.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    seed_database(get_database_path(), CREW, METABOLIC_PANEL_CSV, LIFESNAPS_HOURLY_CSV, LIFESNAPS_DAILY_CSV)
    log.info("Database ready at %s", get_database_path())
