from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.db import get_session
from app.main import app
from seed import DAILY_COLUMNS, CrewPairing
from seed_content import INDICATORS

LoadSeeds = Callable[..., None]

VOLUNTEER = "621e2f9167b776a240011ccb"

METABOLIC_PANEL = (
    "Sample Name,glucose_value_milligram_per_deciliter,"
    "glucose_range_min_milligram_per_deciliter,glucose_range_max_milligram_per_deciliter\n"
    "C003_serum_L-3,75,65,99\n"
    "C003_serum_L-44,62,65,99\n"
    "C003_serum_L-92,77,65,99\n"
    "C003_serum_R+1,103,65,99\n"
    "C003_serum_R+194,73,65,99\n"
    "C003_serum_R+45,36,65,99\n"
    "C003_serum_R+82,80,65,99\n"
)
HOURLY = (
    "id,date,hour,bpm\n"
    f"{VOLUNTEER},2021-11-01,22.0,60.5\n"
    f"{VOLUNTEER},2021-11-02,9.0,71.0\n"
    f"{VOLUNTEER},2021-11-02,23.0,64.25\n"
    f"{VOLUNTEER},2021-11-03,0.0,58.0\n"
)
# Columns in the order of DAILY_COLUMNS: resting_hr, very_active_minutes, steps, minutesAsleep,
# sleep_efficiency, nightly_temperature, then the six moods: HAPPY, SAD, TENSE/ANXIOUS, ALERT,
# RESTED/RELAXED, NEUTRAL. The file starts with an unnamed index column.
DAILY = (
    "," + ",".join(["id", "date", *DAILY_COLUMNS.values()]) + "\n"
    f"0,{VOLUNTEER},2021-11-01,68.9,0,7751.0,463.0,99.0,33.58,0.0,1.0,0.0,0.0,0.0,0.0\n"
    f"1,{VOLUNTEER},2021-11-02,68.0,0,8122.0,355.0,98.0,,,,,,,\n"
)
MOOD_IDS = ["mood_happy", "mood_sad", "mood_tense", "mood_alert", "mood_rested", "mood_neutral"]

LoadClient = Callable[[str], TestClient]


@pytest.fixture
def build_client(tmp_path: Path, load_seeds: LoadSeeds, engine: Engine) -> Iterator[LoadClient]:
    """Seeds the test database from the given metabolic panel rows and returns a client of the API on it."""

    def get_test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    def build(metabolic_panel_rows: str) -> TestClient:
        metabolic_panel = tmp_path / "panel.csv"
        metabolic_panel.write_text(metabolic_panel_rows, encoding="utf-8")
        hourly = tmp_path / "hourly.csv"
        hourly.write_text(HOURLY, encoding="utf-8")
        daily = tmp_path / "daily.csv"
        daily.write_text(DAILY, encoding="utf-8")
        load_seeds([CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly, daily)
        return TestClient(app)

    app.dependency_overrides[get_session] = get_test_session
    yield build
    app.dependency_overrides.clear()


@pytest.fixture
def client(build_client: LoadClient) -> TestClient:
    return build_client(METABOLIC_PANEL)


def test_lists_the_crew(client: TestClient) -> None:
    response = client.get("/api/crew")

    assert response.status_code == 200
    assert response.json() == {"crew": [{"id": 1, "name": "Crew 1"}]}


def test_panel_shows_the_latest_reading_of_each_indicator_with_the_rule_it_breaks(
    client: TestClient,
) -> None:
    response = client.get("/api/crew/1/panel", params={"date": "2021-11-02"})

    assert response.status_code == 200
    panel = response.json()
    assert panel["date"] == "2021-11-02"
    assert [indicator["id"] for indicator in panel["indicators"]] == [indicator.id for indicator in INDICATORS]
    glucose, heart_rate = panel["indicators"][:2]
    assert glucose == {
        "id": "glucose",
        "name": "Blood glucose",
        "unit": "mg/dL",
        "reading": {"taken_at": "2021-11-02T00:00", "value": 36.0},
        "broken_rule": {
            "id": 1,
            "title": glucose["broken_rule"]["title"],
            "explanation": glucose["broken_rule"]["explanation"],
            "action": glucose["broken_rule"]["action"],
        },
    }
    assert glucose["broken_rule"]["title"] != ""
    assert heart_rate == {
        "id": "heart_rate",
        "name": "Heart rate",
        "unit": "bpm",
        "reading": {"taken_at": "2021-11-02T23:00", "value": 64.25},
        "broken_rule": None,
    }


def test_panel_keeps_null_keys_when_there_is_no_reading_yet(client: TestClient) -> None:
    response = client.get("/api/crew/1/panel", params={"date": "2021-01-01"})

    assert [(i["id"], i["reading"], i["broken_rule"]) for i in response.json()["indicators"]] == [
        (indicator.id, None, None) for indicator in INDICATORS
    ]


def test_panel_shows_the_daily_indicators_of_that_day(client: TestClient) -> None:
    response = client.get("/api/crew/1/panel", params={"date": "2021-11-02"})

    readings = {i["id"]: i["reading"] for i in response.json()["indicators"]}
    assert readings["resting_heart_rate"] == {"taken_at": "2021-11-02T00:00", "value": 68.0}
    assert readings["sleep_duration"] == {"taken_at": "2021-11-02T00:00", "value": 355.0}
    assert readings["steps"] == {"taken_at": "2021-11-02T00:00", "value": 8122.0}
    # An empty cell on 2021-11-02 leaves the reading of the day before
    assert readings["skin_temperature"] == {"taken_at": "2021-11-01T00:00", "value": 33.58}


def test_panel_carries_the_last_reading_forward_to_later_days(client: TestClient) -> None:
    response = client.get("/api/crew/1/panel", params={"date": "2021-11-20"})

    glucose = response.json()["indicators"][0]
    assert glucose["reading"] == {"taken_at": "2021-11-02T00:00", "value": 36.0}
    assert glucose["broken_rule"]["id"] == 1


def test_panel_has_no_broken_rule_for_a_reading_inside_the_limits(client: TestClient) -> None:
    response = client.get("/api/crew/1/panel", params={"date": "2021-09-13"})

    glucose = response.json()["indicators"][0]
    assert glucose["reading"] == {"taken_at": "2021-09-13T00:00", "value": 75.0}
    assert glucose["broken_rule"] is None


def test_panel_requires_a_date(client: TestClient) -> None:
    response = client.get("/api/crew/1/panel")

    assert response.status_code == 422


def test_indicator_returns_text_source_rules_and_history_with_the_rule_each_reading_breaks(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/crew/1/indicators/glucose", params={"from": "2021-08-03", "to": "2021-11-02"}
    )

    assert response.status_code == 200
    detail = response.json()
    assert set(detail) == {"indicator", "rules", "readings"}
    assert set(detail["indicator"]) == {"id", "name", "unit", "how_to_measure", "why_it_matters", "source"}
    assert detail["indicator"]["id"] == "glucose"
    assert detail["indicator"]["unit"] == "mg/dL"
    assert detail["indicator"]["source"]["id"] == "inspiration4_metabolic_panel"
    assert detail["indicator"]["source"]["url"] == "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
    assert set(detail["indicator"]["source"]) == {"id", "name", "url", "citation"}
    assert [(rule["id"], rule["low"], rule["high"]) for rule in detail["rules"]] == [(1, 65.0, 99.0)]
    assert set(detail["rules"][0]) == {
        "id", "low", "high", "title", "explanation", "action", "threshold_source",
    }
    assert detail["readings"] == [
        {"taken_at": "2021-08-03T00:00", "value": 62.0, "broken_rule_id": 1},
        {"taken_at": "2021-09-13T00:00", "value": 75.0, "broken_rule_id": None},
        {"taken_at": "2021-09-19T00:00", "value": 103.0, "broken_rule_id": 1},
        {"taken_at": "2021-11-02T00:00", "value": 36.0, "broken_rule_id": 1},
    ]


def test_indicator_history_includes_the_whole_last_day(client: TestClient) -> None:
    response = client.get(
        "/api/crew/1/indicators/heart_rate", params={"from": "2021-11-02", "to": "2021-11-02"}
    )

    detail = response.json()
    assert detail["rules"] == []
    assert detail["readings"] == [
        {"taken_at": "2021-11-02T09:00", "value": 71.0, "broken_rule_id": None},
        {"taken_at": "2021-11-02T23:00", "value": 64.25, "broken_rule_id": None},
    ]


@pytest.mark.parametrize(
    ("path", "params", "detail"),
    [
        ("/api/crew/9/panel", {"date": "2021-11-02"}, "Crew member 9 not found"),
        (
            "/api/crew/9/indicators/glucose",
            {"from": "2021-06-01", "to": "2021-12-31"},
            "Crew member 9 not found",
        ),
        (
            "/api/crew/1/indicators/blood_pressure",
            {"from": "2021-06-01", "to": "2021-12-31"},
            "Indicator 'blood_pressure' not found",
        ),
    ],
)
def test_unknown_crew_member_or_indicator_returns_404(
    client: TestClient, path: str, params: dict[str, str], detail: str
) -> None:
    response = client.get(path, params=params)

    assert response.status_code == 404
    assert response.json() == {"detail": detail}


def test_a_reading_exactly_on_a_limit_does_not_break_the_rule(build_client: LoadClient) -> None:
    header = METABOLIC_PANEL.splitlines()[0] + "\n"
    client = build_client(header + "C003_serum_L-3,65,65,99\n" + "C003_serum_R+1,99,65,99\n")

    response = client.get(
        "/api/crew/1/indicators/glucose", params={"from": "2021-09-01", "to": "2021-09-30"}
    )

    assert response.json()["readings"] == [
        {"taken_at": "2021-09-13T00:00", "value": 65.0, "broken_rule_id": None},
        {"taken_at": "2021-09-19T00:00", "value": 99.0, "broken_rule_id": None},
    ]


def get_panel_moods(client: TestClient, date: str) -> dict[str, dict | None]:
    panel = client.get("/api/crew/1/panel", params={"date": date}).json()
    return {i["id"]: i["reading"] for i in panel["indicators"] if i["id"].startswith("mood_")}


def test_saving_a_checkin_returns_what_was_saved_and_the_panel_of_that_day_shows_it(
    client: TestClient,
) -> None:
    response = client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_rested", "mood_happy"]})

    assert response.status_code == 200
    assert response.json() == {"date": "2021-11-02", "moods": ["mood_happy", "mood_rested"]}
    assert get_panel_moods(client, "2021-11-02") == {
        "mood_happy": {"taken_at": "2021-11-02T00:00", "value": 1.0},
        "mood_sad": {"taken_at": "2021-11-02T00:00", "value": 0.0},
        "mood_tense": {"taken_at": "2021-11-02T00:00", "value": 0.0},
        "mood_alert": {"taken_at": "2021-11-02T00:00", "value": 0.0},
        "mood_rested": {"taken_at": "2021-11-02T00:00", "value": 1.0},
        "mood_neutral": {"taken_at": "2021-11-02T00:00", "value": 0.0},
    }


def test_saving_a_checkin_again_replaces_the_moods_of_that_day(client: TestClient) -> None:
    client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_happy"]})

    response = client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_tense"]})

    assert response.json() == {"date": "2021-11-02", "moods": ["mood_tense"]}
    moods = get_panel_moods(client, "2021-11-02")
    assert moods["mood_happy"] == {"taken_at": "2021-11-02T00:00", "value": 0.0}
    assert moods["mood_tense"] == {"taken_at": "2021-11-02T00:00", "value": 1.0}


def test_a_checkin_leaves_the_moods_of_other_days_as_they_were(client: TestClient) -> None:
    client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_happy"]})

    moods = get_panel_moods(client, "2021-11-01")
    assert moods["mood_sad"] == {"taken_at": "2021-11-01T00:00", "value": 1.0}
    assert moods["mood_happy"] == {"taken_at": "2021-11-01T00:00", "value": 0.0}


def test_a_checkin_with_an_unknown_mood_is_rejected_and_saves_nothing(client: TestClient) -> None:
    response = client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_happy", "glucose"]})

    assert response.status_code == 422
    assert get_panel_moods(client, "2021-11-02")["mood_happy"] == {
        "taken_at": "2021-11-01T00:00",
        "value": 0.0,
    }


def test_a_checkin_for_an_unknown_crew_member_returns_404(client: TestClient) -> None:
    response = client.put("/api/crew/99/checkins/2021-11-02", json={"moods": ["mood_happy"]})

    assert response.status_code == 404
    assert response.json() == {"detail": "Crew member 99 not found"}


def test_a_checkin_with_no_moods_saves_the_six_as_zero(client: TestClient) -> None:
    response = client.put("/api/crew/1/checkins/2021-11-02", json={"moods": []})

    assert response.status_code == 200
    assert response.json() == {"date": "2021-11-02", "moods": []}
    assert get_panel_moods(client, "2021-11-02") == {
        mood_id: {"taken_at": "2021-11-02T00:00", "value": 0.0} for mood_id in MOOD_IDS
    }
