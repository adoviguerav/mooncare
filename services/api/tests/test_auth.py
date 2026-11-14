"""Sign-in, sessions and who may see what, with the real login against a test database."""

from collections.abc import Callable, Iterator
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, update
from sqlalchemy.orm import Session

from app import models
from app.auth import SESSION_COOKIE, hash_pin, now
from app.config import Settings, get_settings
from app.db import get_session
from app.main import app
from seed import CrewPairing

COMMANDER_PIN = "111111"
CREW_PIN = "222222"
ADMIN_PIN = "33333333"
LoadSeeds = Callable[..., None]
Client = Callable[[str], TestClient]


def settings_for(role: str) -> Settings:
    return Settings(_env_file=None, database_provider="postgresql", postgresql_url="unused", node_role=role)  # type: ignore[call-arg]


@pytest.fixture
def users(tmp_path: Path, load_seeds: LoadSeeds, engine: Engine) -> dict[str, int]:
    """Crew 1 (commander), Crew 2 (crew member) and an earth administrator."""
    panel = tmp_path / "panel.csv"
    panel.write_text("Sample Name,glucose_value_milligram_per_deciliter\nC003_serum_R+45,36\nC001_serum_R+45,80\n")
    hourly = tmp_path / "hourly.csv"
    hourly.write_text("id,date,hour,bpm\n")
    load_seeds(
        [CrewPairing("Crew 1", "C003", "a", role="commander"), CrewPairing("Crew 2", "C001", "b")], panel, hourly
    )
    with Session(engine) as session:
        created = {
            "commander": models.AppUser(
                display_name="Crew 1", role="commander", crew_member_id=1, pin_hash=hash_pin(COMMANDER_PIN)
            ),
            "crew": models.AppUser(display_name="Crew 2", role="crew_member", crew_member_id=2, pin_hash=hash_pin(CREW_PIN)),
            "admin": models.AppUser(
                display_name="Earth Admin", role="earth_admin", crew_member_id=None, pin_hash=hash_pin(ADMIN_PIN)
            ),
        }
        session.add_all(created.values())
        session.commit()
        return {name: user.id for name, user in created.items()}


@pytest.fixture
def client_on(engine: Engine) -> Iterator[Client]:
    """A client of the API as the moon or the earth server, on the test database. Keeps cookies like a browser."""

    def get_test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    def build(node_role: str) -> TestClient:
        app.dependency_overrides[get_session] = get_test_session
        app.dependency_overrides[get_settings] = lambda: settings_for(node_role)
        return TestClient(app)

    yield build
    app.dependency_overrides.clear()


def sign_in(api: TestClient, user_id: int, pin: str, **extra: str) -> object:
    return api.post("/api/auth/login", json={"user_id": user_id, "pin": pin, **extra})


# --- Signing in ---


def test_the_moon_lists_the_crew_for_the_sign_in_screen_and_earth_lists_its_administrators(
    users: dict[str, int], client_on: Client
) -> None:
    moon = client_on("moon").get("/api/auth/users").json()
    earth = client_on("earth").get("/api/auth/users").json()

    assert moon["node_role"] == "moon"
    assert [(user["display_name"], user["role"]) for user in moon["users"]] == [
        ("Crew 1", "commander"),
        ("Crew 2", "crew_member"),
    ]
    assert set(moon["users"][0]) == {"id", "display_name", "role", "crew_member_id"}  # never the PIN hash
    assert [user["role"] for user in earth["users"]] == ["earth_admin"]


def test_a_right_pin_opens_a_ten_day_session_in_an_http_only_cookie(users: dict[str, int], client_on: Client) -> None:
    client = client_on("moon")

    response = sign_in(client, users["crew"], CREW_PIN)

    assert response.status_code == 200
    body = response.json()
    assert body["user"] == {
        "id": users["crew"],
        "display_name": "Crew 2",
        "role": "crew_member",
        "crew_member_id": 2,
        "node_role": "moon",
    }
    assert body["token"] is None  # a browser never sees the token
    cookie = response.headers["set-cookie"]
    assert f"{SESSION_COOKIE}=" in cookie
    assert "HttpOnly" in cookie
    assert "Max-Age=864000" in cookie  # 10 days
    assert "SameSite=lax" in cookie
    assert client.get("/api/auth/me").json()["display_name"] == "Crew 2"


def test_a_wrong_pin_and_an_unknown_user_get_the_same_answer(users: dict[str, int], client_on: Client) -> None:
    client = client_on("moon")

    wrong_pin = sign_in(client, users["crew"], "999999")
    unknown = sign_in(client, 9999, "999999")

    assert (wrong_pin.status_code, unknown.status_code) == (401, 401)
    assert wrong_pin.json() == unknown.json() == {"detail": "Wrong name or PIN"}
    assert client.get("/api/auth/me").status_code == 401


def test_five_wrong_pins_lock_the_account(users: dict[str, int], client_on: Client) -> None:
    client = client_on("moon")
    for _ in range(5):
        sign_in(client, users["crew"], "999999")

    locked = sign_in(client, users["crew"], CREW_PIN)  # even with the right PIN

    assert locked.status_code == 429
    assert "Try again in" in locked.json()["detail"]
    assert sign_in(client, users["commander"], COMMANDER_PIN).status_code == 200  # other accounts are not affected


def test_each_role_signs_in_only_on_its_own_server(users: dict[str, int], client_on: Client) -> None:
    assert sign_in(client_on("moon"), users["admin"], ADMIN_PIN).status_code == 401
    assert sign_in(client_on("earth"), users["crew"], CREW_PIN).status_code == 401
    assert sign_in(client_on("earth"), users["admin"], ADMIN_PIN).status_code == 200


def test_signing_out_ends_the_session(users: dict[str, int], client_on: Client) -> None:
    client = client_on("moon")
    token = sign_in(client, users["crew"], CREW_PIN, client="native").json()["token"]

    assert client.post("/api/auth/logout").status_code == 204

    assert client.get("/api/auth/me").status_code == 401
    assert client_on("moon").get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_a_native_client_gets_the_token_and_sends_it_as_a_header(users: dict[str, int], client_on: Client) -> None:
    token = sign_in(client_on("moon"), users["crew"], CREW_PIN, client="native").json()["token"]

    fresh = client_on("moon")  # no cookie
    response = fresh.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200


def test_an_expired_session_is_refused(users: dict[str, int], client_on: Client, engine: Engine) -> None:
    client = client_on("moon")
    sign_in(client, users["crew"], CREW_PIN)
    with Session(engine) as session:
        session.execute(update(models.UserSession).values(expires_at=now() - timedelta(seconds=1)))
        session.commit()

    assert client.get("/api/auth/me").json() == {"detail": "Session expired. Sign in again"}


def test_a_deactivated_user_loses_their_session(users: dict[str, int], client_on: Client, engine: Engine) -> None:
    client = client_on("moon")
    sign_in(client, users["crew"], CREW_PIN)
    with Session(engine) as session:
        session.execute(update(models.AppUser).where(models.AppUser.id == users["crew"]).values(is_active=False))
        session.commit()

    assert client.get("/api/auth/me").status_code == 401


# --- Who may see what ---


def test_nothing_but_the_sign_in_endpoints_answer_without_a_session(users: dict[str, int], client_on: Client) -> None:
    client = client_on("moon")

    for path in ["/api/crew", "/api/crew/1/panel?date=2021-11-02", "/api/node", "/api/sync/history"]:
        assert client.get(path).status_code == 401, path
    assert client.put("/api/crew/2/checkins/2021-11-02", json={"moods": []}).status_code == 401


def test_a_crew_member_sees_only_their_own_data_and_checks_in_only_for_themselves(
    users: dict[str, int], client_on: Client
) -> None:
    client = client_on("moon")
    sign_in(client, users["crew"], CREW_PIN)

    assert client.get("/api/crew/2/panel", params={"date": "2021-11-02"}).status_code == 200
    assert client.get("/api/crew/1/panel", params={"date": "2021-11-02"}).status_code == 403
    assert client.get("/api/crew/1/indicators/glucose", params={"from": "2021-01-01", "to": "2021-12-31"}).status_code == 403
    assert client.put("/api/crew/2/checkins/2021-11-02", json={"moods": ["mood_happy"]}).status_code == 200
    assert client.put("/api/crew/1/checkins/2021-11-02", json={"moods": ["mood_happy"]}).status_code == 403
    assert client.get("/api/sync/history").status_code == 403


def test_the_commander_sees_the_whole_crew_but_checks_in_only_for_themselves(
    users: dict[str, int], client_on: Client
) -> None:
    client = client_on("moon")
    sign_in(client, users["commander"], COMMANDER_PIN)

    assert client.get("/api/crew/2/panel", params={"date": "2021-11-02"}).status_code == 200
    assert client.get("/api/sync/history").status_code == 200
    assert client.put("/api/crew/2/checkins/2021-11-02", json={"moods": ["mood_happy"]}).status_code == 403


def test_the_earth_administrator_sees_the_whole_crew_on_earth(users: dict[str, int], client_on: Client) -> None:
    client = client_on("earth")
    sign_in(client, users["admin"], ADMIN_PIN)

    assert client.get("/api/crew").status_code == 200
    assert client.get("/api/crew/1/panel", params={"date": "2021-11-02"}).status_code == 200
    assert client.put("/api/crew/1/checkins/2021-11-02", json={"moods": []}).status_code == 403
