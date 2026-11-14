"""Moon-earth synchronisation, with two real databases: one for the moon and one for earth."""

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select, update
from sqlalchemy.orm import Session, sessionmaker

import app.sync as sync
from app import models
from app.config import Settings
from app.db import build_engine, get_session
from app.main import app
from app.sync import (
    Changes,
    SyncError,
    count_pending_push,
    pull_from_earth,
    push_to_earth,
    receive_push,
    serve_pull,
)
from app.sync_client import HttpEarthServer
from app.sync_routes import get_earth_server
from app.auth import get_current_user, hash_pin, verify_pin
from app.config import get_settings
from seed import DAILY_COLUMNS, CrewPairing, DatasetFiles, build_seed_files
from tests.conftest import run_sql

VOLUNTEER = "621e2f9167b776a240011ccb"
SYNC_TOKEN = "test-sync-token"


def write_seed_csvs(directory: Path) -> DatasetFiles:
    metabolic_panel = directory / "panel.csv"
    metabolic_panel.write_text(
        "Sample Name,glucose_value_milligram_per_deciliter,"
        "glucose_range_min_milligram_per_deciliter,glucose_range_max_milligram_per_deciliter\n"
        "C003_serum_R+45,36,65,99\n",
        encoding="utf-8",
    )
    hourly = directory / "hourly.csv"
    hourly.write_text(f"id,date,hour,bpm\n{VOLUNTEER},2021-11-02,9.0,71.0\n{VOLUNTEER},2021-11-02,10.0,72.0\n")
    daily = directory / "daily.csv"
    daily.write_text("," + ",".join(["id", "date", *DAILY_COLUMNS.values()]) + "\n")
    return DatasetFiles(metabolic_panel, hourly, daily)


@dataclass
class Node:
    url: str
    engine: Engine
    sessions: sessionmaker[Session]

    def count(self, model: type[models.Base]) -> int:
        with self.sessions() as session:
            return session.scalar(select(func.count()).select_from(model)) or 0


class InProcessEarth:
    """Earth called directly, without HTTP. `online = False` simulates a lost link."""

    url = "earth-test"

    def __init__(self, earth: Node) -> None:
        self.earth = earth
        self.online = True

    def push(self, changes: Changes) -> int:
        self._require_link()
        with self.earth.sessions() as session:
            return receive_push(session, changes)

    def pull(self, since_seq: int) -> tuple[Changes, int]:
        self._require_link()
        with self.earth.sessions() as session:
            return serve_pull(session, since_seq)

    def _require_link(self) -> None:
        if not self.online:
            raise SyncError("Earth server unreachable: ConnectError")


@pytest.fixture
def nodes(new_database: Callable[[], str], tmp_path: Path) -> Iterator[tuple[Node, Node]]:
    """A moon and an earth database, both loaded with the same small seed."""
    seed_files = build_seed_files([CrewPairing("Crew 1", "C003", VOLUNTEER, role="commander")], write_seed_csvs(tmp_path))
    built: list[Node] = []
    for _ in range(2):
        url = new_database()
        for script in seed_files.values():
            run_sql(url, script)
        engine = build_engine("postgresql", url)
        built.append(Node(url, engine, sessionmaker(bind=engine, expire_on_commit=False)))
    yield built[0], built[1]
    for node in built:
        node.engine.dispose()


@pytest.fixture
def moon(nodes: tuple[Node, Node]) -> Node:
    return nodes[0]


@pytest.fixture
def earth(nodes: tuple[Node, Node]) -> Node:
    return nodes[1]


@pytest.fixture
def earth_link(earth: Node) -> InProcessEarth:
    return InProcessEarth(earth)


def add_reading(node: Node, value: float, taken_at: str = "2021-11-03T08:00") -> None:
    with node.sessions() as session:
        session.add(
            models.Reading(
                crew_member_id=1, indicator_id="heart_rate", taken_at=datetime.fromisoformat(taken_at), value=value
            )
        )
        session.commit()


def get_reading(node: Node, taken_at: str) -> float | None:
    with node.sessions() as session:
        return session.scalar(
            select(models.Reading.value).where(
                models.Reading.indicator_id == "heart_rate", models.Reading.taken_at == datetime.fromisoformat(taken_at)
            )
        )


# --- Push: moon to earth ---


def test_push_sends_the_moon_readings_to_earth_and_records_it(moon: Node, earth: Node, earth_link: InProcessEarth) -> None:
    add_reading(moon, 88.0)

    with moon.sessions() as session:
        operation = push_to_earth(session, earth_link)

    assert operation.status == "ok"
    assert operation.direction == "push"
    assert operation.row_count == moon.count(models.Reading)
    assert get_reading(earth, "2021-11-03T08:00") == 88.0
    assert earth.count(models.Reading) == moon.count(models.Reading)


def test_the_next_push_sends_only_new_or_changed_readings(moon: Node, earth: Node, earth_link: InProcessEarth) -> None:
    add_reading(moon, 88.0)
    with moon.sessions() as session:
        push_to_earth(session, earth_link)
        nothing_new = push_to_earth(session, earth_link)

    add_reading(moon, 90.0, taken_at="2021-11-03T09:00")
    with moon.sessions() as session:
        session.execute(
            update(models.Reading)
            .where(models.Reading.taken_at == datetime.fromisoformat("2021-11-03T08:00"))
            .values(value=99.0)
        )
        session.commit()
        second = push_to_earth(session, earth_link)

    assert nothing_new.row_count == 0
    assert second.row_count == 2
    assert get_reading(earth, "2021-11-03T08:00") == 99.0  # earth's copy is replaced
    assert get_reading(earth, "2021-11-03T09:00") == 90.0


def test_push_goes_in_batches(moon: Node, earth: Node, earth_link: InProcessEarth, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sync, "ROWS_PER_PUSH", 2)
    for hour in range(5):
        add_reading(moon, 60.0 + hour, taken_at=f"2021-11-04T{hour:02d}:00")

    with moon.sessions() as session:
        operation = push_to_earth(session, earth_link)
        pending = count_pending_push(session)

    assert operation.row_count == moon.count(models.Reading)
    assert earth.count(models.Reading) == moon.count(models.Reading)
    assert pending == 0


# --- Pull: earth to moon ---


def test_pull_replaces_the_moon_copy_of_earth_configuration_and_crew(
    moon: Node, earth: Node, earth_link: InProcessEarth
) -> None:
    with earth.sessions() as session:
        session.execute(update(models.Indicator).where(models.Indicator.id == "glucose").values(name="Glucose (blood)"))
        session.add(models.CrewMember(id=2, name="Crew 2", role="crew_member"))
        session.commit()

    with moon.sessions() as session:
        operation = pull_from_earth(session, earth_link)
        again = pull_from_earth(session, earth_link)

    with moon.sessions() as session:
        assert session.get(models.Indicator, "glucose").name == "Glucose (blood)"  # type: ignore[union-attr]
        assert session.get(models.CrewMember, 2) is not None
    assert operation.status == "ok"
    assert operation.row_count > 0
    assert again.row_count == 0


def test_pull_never_brings_readings_and_push_never_sends_configuration(
    moon: Node, earth: Node, earth_link: InProcessEarth
) -> None:
    add_reading(earth, 50.0)  # a reading written on earth by hand

    with moon.sessions() as session:
        pull_from_earth(session, earth_link)
    with earth.sessions() as session:
        with pytest.raises(ValueError, match="cannot be synchronised"):
            receive_push(session, {"cfg.rule": []})

    assert get_reading(moon, "2021-11-03T08:00") is None


def test_earth_refuses_configuration_sent_by_the_moon_and_records_it(earth: Node) -> None:
    with earth.sessions() as session:
        rule = session.get(models.Rule, 1)
        assert rule is not None
        forged = {column.name: getattr(rule, column.key) for column in models.Rule.__table__.c}

        with pytest.raises(ValueError):
            receive_push(session, {"cfg.rule": [{**forged, "low": 0.0}]})

    with earth.sessions() as session:
        assert session.get(models.Rule, 1).low == 65.0  # type: ignore[union-attr]
        failed = session.scalars(select(models.SyncOperation)).all()
    assert [(operation.direction, operation.status) for operation in failed] == [("received_push", "failed")]


# --- Without the link ---


def test_with_the_link_down_the_moon_keeps_its_data_and_sends_it_when_the_link_is_back(
    moon: Node, earth: Node, earth_link: InProcessEarth
) -> None:
    earth_link.online = False
    add_reading(moon, 88.0)

    with moon.sessions() as session:
        failed_push = push_to_earth(session, earth_link)
        failed_pull = pull_from_earth(session, earth_link)
        pending_while_down = count_pending_push(session)

    add_reading(moon, 91.0, taken_at="2021-11-03T09:00")  # the moon goes on working
    earth_link.online = True
    with moon.sessions() as session:
        push = push_to_earth(session, earth_link)
        pending_after = count_pending_push(session)

    assert (failed_push.status, failed_push.error) == ("failed", "Earth server unreachable: ConnectError")
    assert failed_push.to_seq is None
    assert failed_pull.status == "failed"
    assert pending_while_down == moon.count(models.Reading) - 1
    assert push.status == "ok"
    assert get_reading(earth, "2021-11-03T08:00") == 88.0
    assert get_reading(earth, "2021-11-03T09:00") == 91.0
    assert pending_after == 0


def test_the_history_keeps_every_sync_newest_first(moon: Node, earth_link: InProcessEarth) -> None:
    with moon.sessions() as session:
        push_to_earth(session, earth_link)
        earth_link.online = False
        push_to_earth(session, earth_link)

    with moon.sessions() as session:
        history = session.scalars(select(models.SyncOperation).order_by(models.SyncOperation.id.desc())).all()
    assert [(operation.direction, operation.status) for operation in history] == [("push", "failed"), ("push", "ok")]


# --- Over HTTP ---


def settings_for(role: str, **values: str) -> Settings:
    return Settings(_env_file=None, database_provider="postgresql", postgresql_url="unused", node_role=role, **values)  # type: ignore[call-arg]


@pytest.fixture
def serve(moon: Node, earth: Node) -> Iterator[Callable[[Node, Settings], TestClient]]:
    """Points the API at one node's database with the given settings."""

    def use(node: Node, settings: Settings) -> TestClient:
        def get_node_session() -> Iterator[Session]:
            with node.sessions() as session:
                yield session

        app.dependency_overrides[get_session] = get_node_session
        app.dependency_overrides[get_settings] = lambda: settings
        role = "commander" if settings.node_role == "moon" else "earth_admin"
        app.dependency_overrides[get_current_user] = lambda: models.AppUser(
            id=1, display_name="Test", role=role, crew_member_id=1 if role == "commander" else None,
            pin_hash="", is_active=True,
        )
        return TestClient(app)

    yield use
    app.dependency_overrides.clear()


def test_earth_sync_endpoints_need_the_token(earth: Node, serve: Callable[[Node, Settings], TestClient]) -> None:
    client = serve(earth, settings_for("earth", sync_token=SYNC_TOKEN))

    assert client.get("/api/sync/pull").status_code == 401
    assert client.get("/api/sync/pull", headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.get("/api/sync/pull", headers={"Authorization": f"Bearer {SYNC_TOKEN}"}).status_code == 200
    assert client.post("/api/sync/push", json={"changes": {}}).status_code == 401


def test_earth_endpoints_do_not_exist_on_the_moon(moon: Node, serve: Callable[[Node, Settings], TestClient]) -> None:
    client = serve(moon, settings_for("moon", sync_token=SYNC_TOKEN))

    response = client.get("/api/sync/pull", headers={"Authorization": f"Bearer {SYNC_TOKEN}"})

    assert response.status_code == 404


def test_the_http_client_talks_to_the_earth_endpoints(earth: Node, serve: Callable[[Node, Settings], TestClient]) -> None:
    earth_client = serve(earth, settings_for("earth", sync_token=SYNC_TOKEN))
    earth_server = HttpEarthServer("http://testserver", SYNC_TOKEN)
    earth_server._client = earth_client  # the TestClient is an httpx client that calls the app in-process
    earth_client.headers["Authorization"] = f"Bearer {SYNC_TOKEN}"

    changes, to_seq = earth_server.pull(0)
    received = earth_server.push({"dat.reading": []})

    assert set(changes) == {"cfg.source", "cfg.indicator", "cfg.rule", "dat.crew_member"}
    assert to_seq > 0
    assert received == 0


def test_the_http_client_reports_a_refused_token(earth: Node, serve: Callable[[Node, Settings], TestClient]) -> None:
    earth_client = serve(earth, settings_for("earth", sync_token=SYNC_TOKEN))
    earth_server = HttpEarthServer("http://testserver", "wrong")
    earth_server._client = earth_client

    with pytest.raises(SyncError, match="refused the sync token"):
        earth_server.pull(0)


def test_the_http_client_reports_an_unreachable_earth() -> None:
    earth_server = HttpEarthServer("http://127.0.0.1:9", SYNC_TOKEN)  # nothing listens on port 9

    with pytest.raises(SyncError, match="unreachable"):
        earth_server.pull(0)


def test_moon_sync_endpoint_and_node_status(
    moon: Node, earth_link: InProcessEarth, serve: Callable[[Node, Settings], TestClient]
) -> None:
    client = serve(moon, settings_for("moon", sync_token=SYNC_TOKEN, earth_url="http://earth"))
    app.dependency_overrides[get_earth_server] = lambda: earth_link
    before = client.get("/api/node").json()

    result = client.post("/api/sync").json()
    after = client.get("/api/node").json()
    history = client.get("/api/sync/history").json()

    assert before["role"] == "moon"
    assert before["pending_push_rows"] == moon.count(models.Reading)
    assert before["last_push"] is None
    assert (result["push"]["status"], result["pull"]["status"]) == ("ok", "ok")
    assert after["pending_push_rows"] == 0
    assert after["last_push"]["status"] == "ok"
    assert [operation["direction"] for operation in history] == ["pull", "push"]


def test_moon_sync_endpoint_does_not_exist_on_earth(earth: Node, serve: Callable[[Node, Settings], TestClient]) -> None:
    client = serve(earth, settings_for("earth", sync_token=SYNC_TOKEN))

    assert client.post("/api/sync").status_code == 404


def test_a_user_created_on_earth_can_sign_in_on_the_moon_after_a_pull_even_with_the_link_down(
    moon: Node, earth: Node, earth_link: InProcessEarth
) -> None:
    with earth.sessions() as session:
        session.add(models.AppUser(display_name="Crew 1", role="commander", crew_member_id=1, pin_hash=hash_pin("424242")))
        session.commit()

    with moon.sessions() as session:
        pull_from_earth(session, earth_link)
    earth_link.online = False

    with moon.sessions() as session:
        user = session.scalars(select(models.AppUser)).one()
    assert (user.display_name, user.role) == ("Crew 1", "commander")
    assert verify_pin(user.pin_hash, "424242")


def test_sessions_and_sign_in_events_never_leave_their_server() -> None:
    synchronised = {sync.table_key(table) for table in sync.EARTH_TABLES + sync.MOON_TABLES}

    assert "dat.session" not in synchronised
    assert "his.auth_event" not in synchronised
