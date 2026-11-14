import sqlite3
from pathlib import Path

import pytest

from seed import CrewPairing, seed_database

METABOLIC_PANEL_HEADER = (
    "Sample Name,glucose_value_milligram_per_deciliter,"
    "glucose_range_min_milligram_per_deciliter,glucose_range_max_milligram_per_deciliter\n"
)
HOURLY_HEADER = "id,date,hour,bpm\n"
DAILY_HEADER = "id,date,ALERT,HAPPY,NEUTRAL,RESTED/RELAXED,SAD,TENSE/ANXIOUS\n"
VOLUNTEER = "621e2f9167b776a240011ccb"
OTHER_VOLUNTEER = "621e2fce67b776a240279baa"


@pytest.fixture
def database_path(tmp_path: Path) -> Path:
    return tmp_path / "test.db"


@pytest.fixture
def empty_daily(tmp_path: Path) -> Path:
    return write_csv(tmp_path / "daily.csv", DAILY_HEADER)


def write_csv(path: Path, content: str) -> Path:
    path.write_text(content, encoding="utf-8")
    return path


def fetch_readings(database_path: Path, indicator_id: str) -> list[tuple[str, float]]:
    with sqlite3.connect(database_path) as connection:
        return connection.execute(
            "SELECT taken_at, value FROM reading WHERE indicator_id = ? ORDER BY taken_at",
            (indicator_id,),
        ).fetchall()


def test_stores_each_glucose_draw_on_its_calendar_date(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(
        tmp_path / "panel.csv",
        METABOLIC_PANEL_HEADER
        + "C003_serum_L-3,75,65,99\n"
        + "C003_serum_L-44,62,65,99\n"
        + "C003_serum_L-92,77,65,99\n"
        + "C003_serum_R+1,103,65,99\n"
        + "C003_serum_R+194,73,65,99\n"
        + "C003_serum_R+45,36,65,99\n"
        + "C003_serum_R+82,80,65,99\n"
        + "C002_serum_R+45,44,65,99\n",
    )
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, empty_daily)

    assert fetch_readings(database_path, "glucose") == [
        ("2021-06-16T00:00", 77.0),
        ("2021-08-03T00:00", 62.0),
        ("2021-09-13T00:00", 75.0),
        ("2021-09-19T00:00", 103.0),
        ("2021-11-02T00:00", 36.0),
        ("2021-12-09T00:00", 80.0),
        ("2022-03-31T00:00", 73.0),
    ]


def test_an_empty_glucose_cell_produces_no_reading(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(
        tmp_path / "panel.csv",
        METABOLIC_PANEL_HEADER + "C003_serum_L-3,,65,99\n" + "C003_serum_R+45,36,65,99\n",
    )
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, empty_daily)

    assert fetch_readings(database_path, "glucose") == [("2021-11-02T00:00", 36.0)]


def test_rejects_a_sample_label_it_cannot_date(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(
        tmp_path / "panel.csv", METABOLIC_PANEL_HEADER + "C003_serum_FD2,80,65,99\n"
    )
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    with pytest.raises(ValueError, match="Unknown sample label 'FD2'"):
        seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, empty_daily)


def test_loads_the_glucose_rule_with_the_limits_of_the_nasa_file(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, empty_daily)

    with sqlite3.connect(database_path) as connection:
        rules = connection.execute("SELECT indicator_id, low, high FROM rule").fetchall()
    assert rules == [("glucose", 65.0, 99.0)]


def test_stores_one_heart_rate_reading_per_hour_of_the_paired_volunteer(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(
        tmp_path / "hourly.csv",
        HOURLY_HEADER
        + f"{VOLUNTEER},2021-11-02,0.0,61.5\n"
        + f"{VOLUNTEER},2021-11-02,13.0,92.25\n"
        + f"{VOLUNTEER},2021-11-02,14.0,\n"
        + f"{OTHER_VOLUNTEER},2021-11-02,15.0,70.0\n",
    )

    seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, empty_daily)

    assert fetch_readings(database_path, "heart_rate") == [
        ("2021-11-02T00:00", 61.5),
        ("2021-11-02T13:00", 92.25),
    ]


def test_shifts_the_volunteer_days_by_the_crew_offset(
    tmp_path: Path, database_path: Path, empty_daily: Path
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER + f"{VOLUNTEER},2021-10-31,23.0,64.0\n")

    seed_database(
        database_path,
        [CrewPairing("Crew 1", "C003", VOLUNTEER, lifesnaps_offset_days=2)],
        metabolic_panel,
        hourly,
        empty_daily,
    )

    assert fetch_readings(database_path, "heart_rate") == [("2021-11-02T23:00", 64.0)]


def test_stores_the_six_moods_of_each_day_the_volunteer_logged_one(
    tmp_path: Path, database_path: Path
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    daily = write_csv(
        tmp_path / "daily.csv",
        DAILY_HEADER
        + f"{VOLUNTEER},2021-10-30,0.0,1.0,0.0,1.0,0.0,0.0\n"
        + f"{VOLUNTEER},2021-10-31,,,,,,\n"
        + f"{OTHER_VOLUNTEER},2021-10-30,0.0,0.0,0.0,0.0,1.0,0.0\n",
    )

    seed_database(
        database_path,
        [CrewPairing("Crew 1", "C003", VOLUNTEER, lifesnaps_offset_days=2)],
        metabolic_panel,
        hourly,
        daily,
    )

    with sqlite3.connect(database_path) as connection:
        moods = connection.execute(
            "SELECT indicator_id, taken_at, value FROM reading "
            "WHERE indicator_id LIKE 'mood_%' ORDER BY indicator_id"
        ).fetchall()
    assert moods == [
        ("mood_alert", "2021-11-01T00:00", 0.0),
        ("mood_happy", "2021-11-01T00:00", 1.0),
        ("mood_neutral", "2021-11-01T00:00", 0.0),
        ("mood_rested", "2021-11-01T00:00", 1.0),
        ("mood_sad", "2021-11-01T00:00", 0.0),
        ("mood_tense", "2021-11-01T00:00", 0.0),
    ]
