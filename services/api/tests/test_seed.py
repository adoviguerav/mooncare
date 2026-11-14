from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import get_args

import psycopg
import pytest

from seed import (
    CREW,
    DAILY_COLUMNS,
    DATASET_FILES,
    CrewPairing,
    Reading,
    build_mood_day_counts,
    build_seed_files,
    read_crew_readings,
    read_daily_readings,
    METABOLIC_PANEL_COLUMNS,
    BLOOD_COUNT_COLUMNS,
    CARDIOVASCULAR_PANEL_COLUMNS,
    read_blood_readings,
    read_heart_rate_readings,
    read_questionnaire_readings,
    read_radiation_readings,
    STAI_COLUMNS,
    to_sql_literal,
)
from app.config import SEEDS_DIR
from app.schemas import MoodId
from seed_content import INDICATORS, MOOD_NAMES, RULES

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

    assert read_blood_readings(metabolic_panel, METABOLIC_PANEL_COLUMNS, "C003") == [Reading("glucose", "2021-11-02T00:00", 36.0)]


def test_stores_every_analyte_of_a_metabolic_panel_draw(tmp_path: Path) -> None:
    metabolic_panel = write_csv(
        tmp_path / "panel.csv",
        "Sample Name,"
        "glucose_value_milligram_per_deciliter,"
        "sodium_value_millimol_per_liter,"
        "potassium_value_millimol_per_liter,"
        "chloride_value_millimol_per_liter,"
        "creatinine_value_milligram_per_deciliter,"
        "urea_nitrogen_bun_value_milligram_per_deciliter,"
        "egfr_african_american_value_milliliter_per_minute_per_1.73_meter_squared,"
        "egfr_non_african_american_value_milliliter_per_minute_per_1.73_meter_squared,"
        "albumin_value_gram_per_deciliter,"
        "calcium_value_milligram_per_deciliter\n"
        "C003_serum_R+1,103,137,3,103,0.89,21,102,88,4.2,9.4\n",
    )

    assert read_blood_readings(metabolic_panel, METABOLIC_PANEL_COLUMNS, "C003") == [
        Reading("glucose", "2021-09-19T00:00", 103.0),
        Reading("sodium", "2021-09-19T00:00", 137.0),
        Reading("potassium", "2021-09-19T00:00", 3.0),
        Reading("chloride", "2021-09-19T00:00", 103.0),
        Reading("creatinine", "2021-09-19T00:00", 0.89),
        Reading("urea_nitrogen", "2021-09-19T00:00", 21.0),
        Reading("egfr", "2021-09-19T00:00", 88.0),
        Reading("albumin", "2021-09-19T00:00", 4.2),
        Reading("calcium", "2021-09-19T00:00", 9.4),
    ]


def test_reads_a_blood_count_draw_whose_sample_name_has_a_suffix(tmp_path: Path) -> None:
    blood_count = write_csv(
        tmp_path / "blood_count.csv",
        "Sample Name,white_blood_cell_count_value_thousand_per_microliter,"
        "absolute_lymphocytes_value_cells_per_microliter,hemoglobin_value_percent\n"
        "C003_whole-blood_R+1_cbc,6.1,2667,14.7\n"
        "C002_whole-blood_R+1_cbc,5,1800,11.5\n",
    )

    assert read_blood_readings(blood_count, BLOOD_COUNT_COLUMNS, "C003") == [
        Reading("white_blood_cells", "2021-09-19T00:00", 6.1),
        Reading("lymphocytes", "2021-09-19T00:00", 2667.0),
        Reading("hemoglobin", "2021-09-19T00:00", 14.7),
    ]


def test_stores_crp_in_milligrams_per_litre(tmp_path: Path) -> None:
    cardiovascular_panel = write_csv(
        tmp_path / "cardiovascular.csv",
        "Sample Name,crp_concentration_picogram_per_milliliter,fibrinogen_concentration_nanogram_per_milliliter\n"
        "C003_serum_R+1,5131700,2780.38\n",
    )

    assert read_blood_readings(cardiovascular_panel, CARDIOVASCULAR_PANEL_COLUMNS, "C003") == [
        Reading("crp", "2021-09-19T00:00", 5.1317),
        Reading("fibrinogen", "2021-09-19T00:00", 2780.38),
    ]


def test_rejects_a_sample_label_it_cannot_date(tmp_path: Path) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER + "C003_serum_FD2,80,65,99\n")

    with pytest.raises(ValueError, match="Unknown sample label 'FD2'"):
        read_blood_readings(metabolic_panel, METABOLIC_PANEL_COLUMNS, "C003")


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

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule WHERE id BETWEEN 2 AND 5 ORDER BY id") == [
        (2, "resting_heart_rate", None, 100.0),
        (3, "sleep_duration", 420.0, None),
        (4, "mood_sad_days_14", None, 7.0),
        (5, "mood_tense_days_14", None, 7.0),
    ]


def test_loads_the_blood_rules_with_the_ranges_of_the_nasa_file(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule WHERE id BETWEEN 6 AND 16 ORDER BY id") == [
        (6, "sodium", 135.0, 146.0),
        (7, "potassium", 3.5, 5.3),
        (8, "chloride", 98.0, 110.0),
        (9, "urea_nitrogen", 7.0, 25.0),
        (10, "egfr", 60.0, None),
        (11, "albumin", 3.6, 5.1),
        # The file gives these two a different range by astronaut and draw: the rule takes the widest
        (12, "creatinine", 0.5, 1.35),
        (13, "calcium", 8.6, 10.4),
        (14, "white_blood_cells", 3.8, 10.8),
        (15, "lymphocytes", 850.0, 3900.0),
        (16, "hemoglobin", 11.7, 17.1),
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


def test_the_real_datasets_give_four_crew_members_a_full_panel_on_the_demo_date() -> None:
    panels = [get_latest_values(read_crew_readings(pairing, DATASET_FILES), DEMO_DATE) for pairing in CREW]

    assert [(pairing.name, pairing.role) for pairing in CREW] == [
        ("Eva Lindqvist", "commander"),
        ("Mateo Vargas", "crew_member"),
        ("Amara Okafor", "crew_member"),
        ("Liam Novak", "crew_member"),
    ]
    for panel in panels:
        assert set(panel) == {indicator.id for indicator in INDICATORS}
    assert [panel["glucose"] for panel in panels] == [36.0, 84.0, 44.0, 43.0]
    # Only Crew 2 is over the limit of the mood rule, 7 days
    assert [panel["mood_tense_days_14"] for panel in panels] == [7.0, 13.0, 3.0, 1.0]


def test_the_real_metabolic_panel_gives_crew_1_low_potassium_the_day_after_landing() -> None:
    panel = get_latest_values(read_crew_readings(CREW[0], DATASET_FILES), "2021-09-19")

    assert panel["potassium"] == 3.0
    assert panel["sodium"] == 137.0
    assert panel["egfr"] == 88.0


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


def test_stores_the_moods_of_each_day_the_volunteer_logged_one(tmp_path: Path) -> None:
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


def test_reads_the_questionnaire_scores_of_the_paired_volunteer_shifted_by_the_crew_offset(tmp_path: Path) -> None:
    stai = write_csv(
        tmp_path / "stai.csv",
        ",user_id,type,submitdate,stai_stress,stai_stress_category\n"
        f"0,{VOLUNTEER},stai,2021-12-26,54.0,Above average\n"
        f"1,{OTHER_VOLUNTEER},stai,2021-12-26,40.0,Below average\n",
    )

    assert read_questionnaire_readings(stai, STAI_COLUMNS, VOLUNTEER, -77) == [
        Reading("anxiety_score", "2021-10-10T00:00", 54.0)
    ]


def test_a_breathing_rate_of_zero_produces_no_reading(tmp_path: Path) -> None:
    daily = write_csv(
        tmp_path / "daily.csv",
        "id,date,full_sleep_breathing_rate\n" + f"{VOLUNTEER},2021-11-01,0.0\n" + f"{VOLUNTEER},2021-11-02,14.2\n",
    )

    assert read_daily_readings(daily, VOLUNTEER, 0) == [Reading("breathing_rate", "2021-11-02T00:00", 14.2)]


def test_a_stress_score_of_zero_produces_no_reading(tmp_path: Path) -> None:
    daily = write_csv(
        tmp_path / "daily.csv",
        "id,date," + ",".join(DAILY_COLUMNS.values()) + "\n"
        + f"{VOLUNTEER},2021-11-01," + ",".join("0.0" if column == "stress_score" else "" for column in DAILY_COLUMNS.values()) + "\n"
        + f"{VOLUNTEER},2021-11-02," + ",".join("70.0" if column == "stress_score" else "" for column in DAILY_COLUMNS.values()) + "\n",
    )

    assert read_daily_readings(daily, VOLUNTEER, 0) == [Reading("stress_score", "2021-11-02T00:00", 70.0)]


def test_loads_the_vo2_max_rule_with_the_nasa_limit(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all("SELECT id, indicator_id, low, high FROM cfg.rule WHERE indicator_id = 'vo2_max'") == [
        (17, "vo2_max", 32.9, None)
    ]


def test_stores_the_mean_dose_rate_of_the_lidal_detector_for_each_day(tmp_path: Path) -> None:
    header = "timestamp\tinstrument_id\tabsorbed_dose_rate\tdose_equivalent_rate\tinstrument\tmodule\tspacecraft\n"
    write_csv(
        tmp_path / "iss_2021-11.tsv",
        header
        + '"2021-11-01T00:00:00"\t"Lidal"\t10.0\t\t"Lidal"\t"Columbus"\t"ISS"\n'
        + '"2021-11-01T00:05:00"\t"Lidal"\t20.0\t\t"Lidal"\t"Columbus"\t"ISS"\n'
        + '"2021-11-01T00:10:00"\t"Lidal"\t\t\t"Lidal"\t"Columbus"\t"ISS"\n'
        # Another detector, which samples faster when the dose is high: left out
        + '"2021-11-01T00:00:20"\t"DosTel2"\t700.0\t\t"DosTel2"\t"Columbus"\t"ISS"\n'
        + '"2021-11-02T00:00:00"\t"Lidal"\t7.5\t\t"Lidal"\t"Columbus"\t"ISS"\n',
    )

    assert read_radiation_readings(tmp_path) == (
        Reading("radiation_dose_rate", "2021-11-01T00:00", 15.0),
        Reading("radiation_dose_rate", "2021-11-02T00:00", 7.5),
    )


def test_the_real_radiation_data_gives_every_crew_member_the_same_dose_rate_of_the_ship() -> None:
    panels = [get_latest_values(read_crew_readings(pairing, DATASET_FILES), DEMO_DATE) for pairing in CREW]

    assert [panel["radiation_dose_rate"] for panel in panels] == [6.01, 6.01, 6.01, 6.01]


def test_the_committed_seed_files_are_what_the_seed_script_writes_today() -> None:
    for file_name, content in build_seed_files(CREW, DATASET_FILES).items():
        assert (SEEDS_DIR / file_name).read_text(encoding="utf-8") == content, f"Run seed.py: {file_name} is stale"


def test_the_checkin_moods_are_the_mood_columns_of_the_daily_file_and_have_a_name() -> None:
    mood_columns = {indicator_id for indicator_id in DAILY_COLUMNS if indicator_id.startswith("mood_")}

    assert set(get_args(MoodId)) == mood_columns == set(MOOD_NAMES)


def test_every_daily_indicator_has_its_text_and_source() -> None:
    assert set(DAILY_COLUMNS) <= {indicator.id for indicator in INDICATORS}


@pytest.mark.parametrize(
    ("value", "literal"),
    [(None, "NULL"), (36.0, "36.0"), (3, "3"), ("it's", "'it''s'")],
)
def test_writes_values_as_sql_literals(value: str | int | float | None, literal: str) -> None:
    assert to_sql_literal(value) == literal


def test_loads_the_personal_baseline_rules_with_their_direction_and_no_fixed_limit(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)

    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    assert fetch_all(
        "SELECT id, indicator_id, low, high, baseline_direction, baseline_deviations"
        " FROM cfg.rule WHERE baseline_direction IS NOT NULL ORDER BY id"
    ) == [
        (18, "resting_heart_rate", None, None, "above", 3.0),
        (19, "skin_temperature", None, None, "above", 3.0),
        (20, "heart_rate_variability", None, None, "below", 3.0),
        (21, "spo2", None, None, "below", 3.0),
        (22, "stress_score", None, None, "below", 3.0),
    ]


def test_the_database_rejects_a_rule_with_both_a_fixed_limit_and_a_baseline(
    tmp_path: Path, load_seeds: LoadSeeds, fetch_all: FetchAll
) -> None:
    metabolic_panel = write_csv(tmp_path / "panel.csv", METABOLIC_PANEL_HEADER)
    hourly = write_csv(tmp_path / "hourly.csv", HOURLY_HEADER)
    load_seeds(ONE_CREW_MEMBER, metabolic_panel, hourly)

    with pytest.raises(psycopg.errors.CheckViolation):
        fetch_all(
            "INSERT INTO cfg.rule (indicator_id, high, baseline_direction, baseline_deviations,"
            " title, explanation, action, threshold_source)"
            " VALUES ('glucose', 99, 'above', 3, 't', 'e', 'a', 's') RETURNING id"
        )
