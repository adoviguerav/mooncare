"""Hydration and breathing: the daily tools of the crew app."""

from collections.abc import Callable, Iterator
from datetime import UTC, date, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.db import get_session
from app.main import app
from app.sync import EARTH_TABLES, MOON_TABLES, collect_changes
from seed import CrewPairing

LoadSeeds = Callable[..., None]
DAY = "2021-11-02"
WOMAN_GOAL_ML = 1500  # 2.0 L of total water, 75% of it from drinks
MAN_GOAL_ML = 1900  # 2.5 L, 75% of it, rounded to 100 ml


def as_user(role: str, crew_member_id: int) -> models.AppUser:
    return models.AppUser(
        id=crew_member_id, display_name="Test", role=role, crew_member_id=crew_member_id, pin_hash="", is_active=True
    )


@pytest.fixture
def signed_in(tmp_path: Path, load_seeds: LoadSeeds, engine: Engine) -> Iterator[Callable[[str, int], TestClient]]:
    """Crew 1 (a woman, commander), Crew 2 (a man) and Crew 3 (no sex recorded). Returns a client for a user."""
    panel = tmp_path / "panel.csv"
    panel.write_text("Sample Name,glucose_value_milligram_per_deciliter\n")
    hourly = tmp_path / "hourly.csv"
    hourly.write_text("id,date,hour,bpm\n")
    load_seeds(
        [
            CrewPairing("Crew 1", "C003", "a", role="commander", sex="female"),
            CrewPairing("Crew 2", "C001", "b", sex="male"),
            CrewPairing("Crew 3", None, "c"),
        ],
        panel,
        hourly,
    )

    def get_test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    def client_for(role: str, crew_member_id: int) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: as_user(role, crew_member_id)
        return TestClient(app)

    yield client_for
    app.dependency_overrides.clear()


def add_drink(engine: Engine, crew_member_id: int, day: str, ml: int, hour: int) -> None:
    with Session(engine) as session:
        drunk_at = datetime.fromisoformat(f"{day}T{hour:02d}:00").replace(tzinfo=UTC)
        session.add(models.HydrationDrink(crew_member_id=crew_member_id, drunk_at=drunk_at, day=date.fromisoformat(day), ml=ml, undone=False))
        session.commit()


def test_the_goal_comes_from_the_reference_of_each_sex_with_its_source(signed_in) -> None:
    woman = signed_in("commander", 1).get(f"/api/crew/1/hydration/{DAY}").json()
    man = signed_in("crew_member", 2).get(f"/api/crew/2/hydration/{DAY}").json()

    assert woman["goal"]["ml"] == WOMAN_GOAL_ML
    assert man["goal"]["ml"] == MAN_GOAL_ML
    assert "EFSA" in woman["goal"]["source"]
    assert woman["total_ml"] == 0 and woman["drinks"] == []


def test_a_crew_member_with_no_sex_recorded_has_no_goal(signed_in) -> None:
    body = signed_in("crew_member", 3).get(f"/api/crew/3/hydration/{DAY}").json()

    assert body["goal"] is None
    assert body["full_days_in_a_row"] == 0


def test_logging_drinks_adds_them_up_and_undo_takes_off_the_last_one(signed_in, engine: Engine) -> None:
    client = signed_in("commander", 1)

    client.post(f"/api/crew/1/hydration/{DAY}", json={"ml": 300})
    after_two = client.post(f"/api/crew/1/hydration/{DAY}", json={"ml": 500}).json()
    after_undo = client.post(f"/api/crew/1/hydration/{DAY}/undo").json()

    assert after_two["total_ml"] == 800
    assert [drink["ml"] for drink in after_two["drinks"]] == [300, 500]
    assert after_undo["total_ml"] == 300
    # The undone drink stays in the table, marked, so the sync carries the change to earth
    with Session(engine) as session:
        assert session.scalars(select(models.HydrationDrink.undone).order_by(models.HydrationDrink.drunk_at)).all() == [False, True]


def test_undo_with_no_drink_left_is_a_conflict(signed_in) -> None:
    response = signed_in("commander", 1).post(f"/api/crew/1/hydration/{DAY}/undo")

    assert response.status_code == 409


def test_a_drink_must_be_between_1_ml_and_1_litre(signed_in) -> None:
    client = signed_in("commander", 1)

    assert client.post(f"/api/crew/1/hydration/{DAY}", json={"ml": 0}).status_code == 422
    assert client.post(f"/api/crew/1/hydration/{DAY}", json={"ml": 1500}).status_code == 422


def test_the_streak_counts_the_days_before_that_reached_the_goal(signed_in, engine: Engine) -> None:
    add_drink(engine, 1, "2021-10-30", 1000, 9)
    add_drink(engine, 1, "2021-10-30", WOMAN_GOAL_ML - 1000, 15)  # full, but 31 Oct breaks the run
    add_drink(engine, 1, "2021-10-31", 500, 9)
    add_drink(engine, 1, "2021-11-01", 1000, 9)
    add_drink(engine, 1, "2021-11-01", 500, 15)  # 1 Nov adds up to the goal

    body = signed_in("commander", 1).get(f"/api/crew/1/hydration/{DAY}").json()

    assert body["full_days_in_a_row"] == 1


def test_only_the_crew_member_can_log_their_own_drinks(signed_in) -> None:
    commander = signed_in("commander", 1)

    response = commander.post(f"/api/crew/2/hydration/{DAY}", json={"ml": 200})

    assert response.status_code == 403
    # Reading is like the panel: the commander sees the whole crew
    assert commander.get(f"/api/crew/2/hydration/{DAY}").status_code == 200


def test_a_crew_member_cannot_see_another_crew_members_water(signed_in) -> None:
    response = signed_in("crew_member", 2).get(f"/api/crew/1/hydration/{DAY}")

    assert response.status_code == 403


def test_breathing_sessions_are_counted_per_day(signed_in) -> None:
    client = signed_in("crew_member", 2)

    client.post(f"/api/crew/2/breathing/{DAY}", json={"breaths": 5})
    body = client.post(f"/api/crew/2/breathing/{DAY}", json={"breaths": 3}).json()

    assert body == {"date": DAY, "sessions": 2}
    assert client.get("/api/crew/2/breathing/2021-11-03").json()["sessions"] == 0


def test_breathing_has_a_sensible_number_of_breaths_and_is_own_only(signed_in) -> None:
    client = signed_in("crew_member", 2)

    assert client.post(f"/api/crew/2/breathing/{DAY}", json={"breaths": 0}).status_code == 422
    assert client.post(f"/api/crew/1/breathing/{DAY}", json={"breaths": 5}).status_code == 403


def test_the_new_tables_travel_with_the_sync(signed_in, engine: Engine) -> None:
    client = signed_in("crew_member", 2)
    client.post(f"/api/crew/2/hydration/{DAY}", json={"ml": 200})
    client.post(f"/api/crew/2/breathing/{DAY}", json={"breaths": 5})

    with Session(engine) as session:
        moon_changes, _ = collect_changes(session, MOON_TABLES, 0)
        earth_changes, _ = collect_changes(session, EARTH_TABLES, 0)

    assert len(moon_changes["dat.hydration_drink"]) == 1
    assert len(moon_changes["dat.breathing_session"]) == 1
    assert {row["sex"] for row in earth_changes["cfg.hydration_goal"]} == {"female", "male"}
    assert "0.75" in {row["drinks_share"] for row in earth_changes["cfg.hydration_goal"]}
