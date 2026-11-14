from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from seed import CrewPairing, seed_database

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


def build_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, metabolic_panel_rows: str) -> TestClient:
    metabolic_panel = tmp_path / "panel.csv"
    metabolic_panel.write_text(metabolic_panel_rows, encoding="utf-8")
    hourly = tmp_path / "hourly.csv"
    hourly.write_text(HOURLY, encoding="utf-8")
    database_path = tmp_path / "test.db"
    seed_database(database_path, [CrewPairing("Crew 1", "C003", VOLUNTEER)], metabolic_panel, hourly)
    monkeypatch.setenv("REAL_TELEMETRY_DB", str(database_path))
    return TestClient(app)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    return build_client(tmp_path, monkeypatch, METABOLIC_PANEL)


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
    glucose, heart_rate = panel["indicators"]
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
        ("glucose", None, None),
        ("heart_rate", None, None),
    ]


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


def test_a_reading_exactly_on_a_limit_does_not_break_the_rule(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    header = METABOLIC_PANEL.splitlines()[0] + "\n"
    client = build_client(
        tmp_path, monkeypatch, header + "C003_serum_L-3,65,65,99\n" + "C003_serum_R+1,99,65,99\n"
    )

    response = client.get(
        "/api/crew/1/indicators/glucose", params={"from": "2021-09-01", "to": "2021-09-30"}
    )

    assert response.json()["readings"] == [
        {"taken_at": "2021-09-13T00:00", "value": 65.0, "broken_rule_id": None},
        {"taken_at": "2021-09-19T00:00", "value": 99.0, "broken_rule_id": None},
    ]
