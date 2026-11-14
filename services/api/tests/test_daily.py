"""The daily checklist with its XP, level and streak, and the station's radiation."""

from collections.abc import Callable, Iterator
from datetime import date, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.db import get_session
from app.main import app
from seed import CrewPairing
from seed_content import DAILY_TASKS

LoadSeeds = Callable[..., None]
XP = {task.id: task.xp for task in DAILY_TASKS}


def as_user(role: str, crew_member_id: int) -> models.AppUser:
    return models.AppUser(id=crew_member_id, display_name="Test", role=role, crew_member_id=crew_member_id, pin_hash="", is_active=True)


@pytest.fixture
def client(tmp_path: Path, load_seeds: LoadSeeds, engine: Engine) -> Iterator[TestClient]:
    """Crew 1 and Crew 2, signed in as Crew 1. Check-ins on 31 Oct, 1 and 2 Nov; sleep recorded on 2 Nov."""
    panel = tmp_path / "panel.csv"
    panel.write_text("Sample Name,glucose_value_milligram_per_deciliter\n")
    hourly = tmp_path / "hourly.csv"
    hourly.write_text("id,date,hour,bpm\n")
    load_seeds([CrewPairing("Crew 1", "C003", "a", role="commander"), CrewPairing("Crew 2", "C001", "b")], panel, hourly)
    with Session(engine) as session:
        for day in ("2021-10-31", "2021-11-01", "2021-11-02"):
            session.add(models.Reading(crew_member_id=1, indicator_id="mood_happy", taken_at=datetime.fromisoformat(f"{day}T00:00"), value=1.0))
        session.add(models.Reading(crew_member_id=1, indicator_id="mood_sad", taken_at=datetime.fromisoformat("2021-10-29T00:00"), value=0.0))
        session.add(models.Reading(crew_member_id=1, indicator_id="sleep_duration", taken_at=datetime.fromisoformat("2021-11-02T00:00"), value=400.0))
        session.add_all(
            [
                models.StationDose(day=date(2021, 11, 1), instrument="Lidal", module="Columbus", mean_rate_ugy_h=6.0, absorbed_dose_ugy=144.0, hours_measured=24),
                models.StationDose(day=date(2021, 11, 2), instrument="Lidal", module="Columbus", mean_rate_ugy_h=6.01, absorbed_dose_ugy=144.24, hours_measured=24),
                models.StationDose(day=date(2021, 11, 2), instrument="REM-Lid", module="Columbus", mean_rate_ugy_h=13.5, absorbed_dose_ugy=324.0, hours_measured=24),
            ]
        )
        session.commit()

    def get_test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    app.dependency_overrides[get_current_user] = lambda: as_user("commander", 1)
    yield TestClient(app)
    app.dependency_overrides.clear()


def tasks_by_id(body: dict) -> dict[str, bool]:
    return {task["id"]: task["done"] for task in body["tasks"]}


def test_the_data_completes_the_automatic_tasks(client: TestClient) -> None:
    body = client.get("/api/crew/1/tasks/2021-11-02").json()

    assert tasks_by_id(body) == {"checkin": True, "tracker_overnight": True, "exercise": False, "meals": False, "read_alerts": False}
    assert body["progress"]["streak"] == 3
    assert body["progress"]["xp"] == 3 * XP["checkin"] + XP["tracker_overnight"]


def test_a_day_without_a_checkin_yet_keeps_the_streak_of_the_day_before(client: TestClient) -> None:
    body = client.get("/api/crew/1/tasks/2021-11-03").json()

    assert tasks_by_id(body)["checkin"] is False
    assert body["progress"]["streak"] == 3


def test_ticking_a_manual_task_adds_its_xp_and_unticking_removes_it(client: TestClient) -> None:
    before = client.get("/api/crew/1/tasks/2021-11-02").json()["progress"]["xp"]

    ticked = client.put("/api/crew/1/tasks/2021-11-02/exercise", json={"done": True}).json()
    unticked = client.put("/api/crew/1/tasks/2021-11-02/exercise", json={"done": False}).json()

    assert tasks_by_id(ticked)["exercise"] is True
    assert ticked["progress"]["xp"] == before + XP["exercise"]
    assert tasks_by_id(unticked)["exercise"] is False
    assert unticked["progress"]["xp"] == before


def test_xp_makes_levels(client: TestClient) -> None:
    progress = client.get("/api/crew/1/tasks/2021-11-02").json()["progress"]

    assert progress["level"] == progress["xp"] // 1000 + 1
    assert progress["level_xp"] == progress["xp"] % 1000


def test_automatic_tasks_cannot_be_ticked(client: TestClient) -> None:
    response = client.put("/api/crew/1/tasks/2021-11-02/checkin", json={"done": True})

    assert response.status_code == 409


def test_a_crew_member_ticks_only_their_own_tasks(client: TestClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: as_user("crew_member", 2)

    assert client.get("/api/crew/1/tasks/2021-11-02").status_code == 403
    assert client.put("/api/crew/1/tasks/2021-11-02/exercise", json={"done": True}).status_code == 403
    assert client.put("/api/crew/2/tasks/2021-11-02/exercise", json={"done": True}).status_code == 200


def test_unknown_crew_member_or_task_returns_404(client: TestClient) -> None:
    assert client.get("/api/crew/9/tasks/2021-11-02").status_code == 404
    assert client.put("/api/crew/1/tasks/2021-11-02/juggling", json={"done": True}).status_code == 404


def test_station_radiation_gives_each_instrument_of_the_day_and_its_history(client: TestClient) -> None:
    body = client.get("/api/station/radiation", params={"date": "2021-11-02", "days": 7}).json()

    assert [(dose["instrument"], dose["absorbed_dose_ugy"]) for dose in body["today"]] == [("Lidal", 144.24), ("REM-Lid", 324.0)]
    assert [(dose["day"], dose["instrument"]) for dose in body["history"]] == [
        ("2021-11-01", "Lidal"),
        ("2021-11-02", "Lidal"),
        ("2021-11-02", "REM-Lid"),
    ]
    assert body["source"]["id"] == "radlab"


def test_a_day_without_measurements_has_no_dose(client: TestClient) -> None:
    body = client.get("/api/station/radiation", params={"date": "2021-12-25"}).json()

    assert body["today"] == []
