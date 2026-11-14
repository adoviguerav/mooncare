from collections.abc import Callable
from datetime import datetime
from pathlib import Path

import pytest

from seed import CrewPairing, Reading, read_glucose_readings, read_heart_rate_readings, to_sql_literal
from seed_content import RULES

METABOLIC_PANEL_HEADER = (
    "Sample Name,glucose_value_milligram_per_deciliter,"
    "glucose_range_min_milligram_per_deciliter,glucose_range_max_milligram_per_deciliter\n"
)
HOURLY_HEADER = "id,date,hour,bpm\n"
VOLUNTEER = "621e2f9167b776a240011ccb"
OTHER_VOLUNTEER = "621e2fce67b776a240279baa"
CREW = [CrewPairing("Crew 1", "C003", VOLUNTEER)]

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

    load_seeds(CREW, metabolic_panel, hourly)

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

    load_seeds(CREW, metabolic_panel, hourly)

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule") == [(1, "glucose", 65.0, 99.0)]


def test_a_new_row_gets_the_next_id_after_the_seeded_ones(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    load_seeds(CREW, metabolic_panel, hourly)

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


@pytest.mark.parametrize(
    ("value", "literal"),
    [(None, "NULL"), (36.0, "36.0"), (3, "3"), ("it's", "'it''s'")],
)
def test_writes_values_as_sql_literals(value: str | int | float | None, literal: str) -> None:
    assert to_sql_literal(value) == literal
