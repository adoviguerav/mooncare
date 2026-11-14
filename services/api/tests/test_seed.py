from collections.abc import Callable
from datetime import datetime
from pathlib import Path

import psycopg
import pytest

from seed import (
    CREW,
    DAILY_COLUMNS,
    DATASET_FILES,
    CrewPairing,
    Reading,
    build_mood_day_counts,
    read_crew_readings,
    read_daily_readings,
    read_glucose_readings,
    read_heart_rate_readings,
    to_sql_literal,
)
from seed_content import INDICATORS, RULES

METABOLIC_PANEL_HEADER = (
    "Sample Name,glucose_value_milligram_per_deciliter,"
    "glucose_range_min_milligram_per_deciliter,glucose_range_max_milligram_per_deciliter\n"
)
HOURLY_HEADER = "id,date,hour,bpm\n"
VOLUNTEER = "621e2f9167b776a240011ccb"
OTHER_VOLUNTEER = "621e2fce67b776a240279baa"
DEMO_DATE = "2021-11-02"
ONE_CREW_MEMBER = [CrewPairing("Crew 1", "C003", VOLUNTEER)]

LoadSeeds = Callable[[list[CrewPairing], Path, Path], None]
FetchAll = Callable[[str], list[tuple]]


def write_csv(path: Path, content: str) -> Path:
    path.write_text(content, encoding="utf-8")
    return path


def test_stores_each_glucose_draw_on_its_calendar_date(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
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

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all(
        "SELECT taken_at, value FROM dat.reading WHERE indicator_id = 'glucose' ORDER BY taken_at"
    ) == [
        (datetime(2021, 6, 16), 77.0),
        (datetime(2021, 8, 3), 62.0),
        (datetime(2021, 9, 13), 75.0),
        (datetime(2021, 9, 19), 103.0),
        (datetime(2021, 11, 2), 36.0),
        (datetime(2021, 12, 9), 80.0),
        (datetime(2022, 3, 31), 73.0),
    ]


def test_an_empty_glucose_cell_produces_no_reading(tmp_path: Path) -> None:
    metabolic_panel = write_csv(
        tmp_path / "panel.csv",
        METABOLIC_PANEL_HEADER + "C003_serum_L-3,,65,99\n" + "C003_serum_R+45,36,65,99\n",
    )

    assert read_glucose_readings(metabolic_panel, "C003") == [Reading("glucose", "2021-11-02T00:00", 36.0)]


def test_rejects_a_sample_label_it_cannot_date(tmp_path: Path) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER + "C003_serum_FD2,80,65,99\n")

    with pytest.raises(ValueError, match="Unknown sample label 'FD2'"):
        read_glucose_readings(metabolic_panel, "C003")


def test_loads_the_glucose_rule_with_the_limits_of_the_nasa_file(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule WHERE indicator_id = 'glucose'") == [
        (1, "glucose", 65.0, 99.0)
    ]


def test_loads_the_resting_heart_rate_sleep_and_mood_rules_with_their_sourced_limits(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule WHERE id > 1 ORDER BY id") == [
        (2, "resting_heart_rate", None, 100.0),
        (3, "sleep_duration", 420.0, None),
        (4, "mood_sad_days_14", None, 7.0),
        (5, "mood_tense_days_14", None, 7.0),
    ]


def test_stores_the_role_of_each_crew_member_and_crew_member_is_the_default(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    crew = [
        CrewPairing("Crew 1", "C003", VOLUNTEER, role="commander"),
        CrewPairing("Crew 2", "C001", OTHER_VOLUNTEER),
    ]

    load_seeds(crew, metabolic_panel, hourly)

    assert fetch_all("SELECT name, role FROM dat.crew_member ORDER BY id") == [
        ("Crew 1", "commander"),
        ("Crew 2", "crew_member"),
    ]


def test_the_database_rejects_a_role_that_is_not_commander_or_crew_member(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    with pytest.raises(psycopg.errors.CheckViolation):
        fetch_all("INSERT INTO dat.crew_member (name, role) VALUES ('Crew 9', 'pilot') RETURNING id")


def get_latest_values(readings: list[Reading], up_to_day: str) -> dict[str, float]:
    """The latest value of each indicator up to the end of a day, as the panel shows it."""
    in_time = sorted((r for r in readings if r.taken_at[:10] <= up_to_day), key=lambda r: r.taken_at)
    return {reading.indicator_id: reading.value for reading in in_time}


def test_the_real_datasets_give_six_crew_members_a_full_panel_on_the_demo_date() -> None:
    panels = [get_latest_values(read_crew_readings(pairing, DATASET_FILES), DEMO_DATE) for pairing in CREW]

    assert [(pairing.name, pairing.role) for pairing in CREW] == [
        ("Adolfo", "commander"),
        ("Ivan", "crew_member"),
        ("Becky", "crew_member"),
        ("Alex", "crew_member"),
        ("Valentina", "crew_member"),
        ("Àngels", "crew_member"),
    ]
    every_indicator = {indicator.id for indicator in INDICATORS}
    for panel in panels[:4]:
        assert set(panel) == every_indicator
    # Inspiration4 had four astronauts: the last two crew members have every indicator but the blood panel
    for panel in panels[4:]:
        assert set(panel) == every_indicator - {"glucose"}
    assert [panel["glucose"] for panel in panels[:4]] == [36.0, 84.0, 44.0, 43.0]
    # Ivan and Àngels are over the limit of the mood rule, 7 days
    assert [panel["mood_tense_days_14"] for panel in panels] == [7.0, 13.0, 3.0, 1.0, 2.0, 9.0]


def test_counts_for_each_mood_entry_the_days_with_that_mood_in_the_14_days_ending_on_it() -> None:
    tense_days = ["2021-10-01", "2021-10-02", "2021-10-14", "2021-10-15"]
    readings = [Reading("mood_tense", f"{day}T00:00", 1.0) for day in tense_days] + [
        Reading("mood_tense", "2021-10-16T00:00", 0.0),
        Reading("mood_sad", "2021-10-16T00:00", 1.0),
    ]

    assert build_mood_day_counts(readings) == [
        Reading("mood_sad_days_14", "2021-10-16T00:00", 1.0),
        Reading("mood_tense_days_14", "2021-10-01T00:00", 1.0),
        Reading("mood_tense_days_14", "2021-10-02T00:00", 2.0),
        Reading("mood_tense_days_14", "2021-10-14T00:00", 3.0),
        # 2021-10-01 is 15 days back, so it no longer counts
        Reading("mood_tense_days_14", "2021-10-15T00:00", 3.0),
        Reading("mood_tense_days_14", "2021-10-16T00:00", 2.0),
    ]


def test_a_new_row_gets_the_next_id_after_the_seeded_ones(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    new_ids = fetch_all(
        "INSERT INTO cfg.rule (indicator_id, high, title, explanation, action, threshold_source) "
        "VALUES ('heart_rate', 100, 't', 'e', 'a', 's') RETURNING id"
    )

    assert new_ids == [(len(RULES) + 1,)]


def test_stores_one_heart_rate_reading_per_hour_of_the_paired_volunteer(tmp_path: Path) -> None:
    hourly = write_csv(
        tmp_path / "hourly.csv",
        HOURLY_HEADER
        + f"{VOLUNTEER},2021-11-02,0.0,61.5\n"
        + f"{VOLUNTEER},2021-11-02,13.0,92.25\n"
        + f"{VOLUNTEER},2021-11-02,14.0,\n"
        + f"{OTHER_VOLUNTEER},2021-11-02,15.0,70.0\n",
    )

    assert read_heart_rate_readings(hourly, VOLUNTEER, offset_days=0) == [
        Reading("heart_rate", "2021-11-02T00:00", 61.5),
        Reading("heart_rate", "2021-11-02T13:00", 92.25),
    ]


def test_shifts_the_volunteer_days_by_the_crew_offset(tmp_path: Path) -> None:
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER + f"{VOLUNTEER},2021-10-31,23.0,64.0\n")

    assert read_heart_rate_readings(hourly, VOLUNTEER, offset_days=2) == [
        Reading("heart_rate", "2021-11-02T23:00", 64.0)
    ]


def test_stores_one_reading_per_day_and_daily_column_of_the_paired_volunteer(tmp_path: Path) -> None:
    daily = write_csv(
        tmp_path / "daily.csv",
        "," + ",".join(["id", "date", *DAILY_COLUMNS.values()]) + "\n"
        f"0,{VOLUNTEER},2021-11-02,68.0,0,8122.0,355.0,98.0,,,,,,,\n"
        f"1,{OTHER_VOLUNTEER},2021-11-02,55.0,30,9000.0,480.0,95.0,33.0,,,,,,\n",
    )

    assert read_daily_readings(daily, VOLUNTEER, offset_days=1) == [
        Reading("resting_heart_rate", "2021-11-03T00:00", 68.0),
        Reading("very_active_minutes", "2021-11-03T00:00", 0.0),
        Reading("steps", "2021-11-03T00:00", 8122.0),
        Reading("sleep_duration", "2021-11-03T00:00", 355.0),
        Reading("sleep_efficiency", "2021-11-03T00:00", 98.0),
    ]


def test_stores_the_six_moods_of_each_day_the_volunteer_logged_one(tmp_path: Path) -> None:
    daily = write_csv(
        tmp_path / "daily.csv",
        ",id,date,resting_hr,very_active_minutes,steps,minutesAsleep,sleep_efficiency,nightly_temperature,"
        "HAPPY,SAD,TENSE/ANXIOUS,ALERT,RESTED/RELAXED,NEUTRAL\n"
        f"0,{VOLUNTEER},2021-10-30,,,,,,,1.0,0.0,0.0,0.0,1.0,0.0\n"
        f"1,{VOLUNTEER},2021-10-31,,,,,,,,,,,,\n"
        f"2,{OTHER_VOLUNTEER},2021-10-30,,,,,,,0.0,1.0,0.0,0.0,0.0,0.0\n",
    )

    assert read_daily_readings(daily, VOLUNTEER, offset_days=2) == [
        Reading("mood_happy", "2021-11-01T00:00", 1.0),
        Reading("mood_sad", "2021-11-01T00:00", 0.0),
        Reading("mood_tense", "2021-11-01T00:00", 0.0),
        Reading("mood_alert", "2021-11-01T00:00", 0.0),
        Reading("mood_rested", "2021-11-01T00:00", 1.0),
        Reading("mood_neutral", "2021-11-01T00:00", 0.0),
    ]


def test_every_daily_indicator_has_its_text_and_source() -> None:
    assert set(DAILY_COLUMNS) <= {indicator.id for indicator in INDICATORS}


@pytest.mark.parametrize(
    ("value", "literal"),
    [(None, "NULL"), (36.0, "36.0"), (3, "3"), ("it's", "'it''s'")],
)
def test_writes_values_as_sql_literals(value: str | int | float | None, literal: str) -> None:
    assert to_sql_literal(value) == literal
