"""Endpoints of the moon-earth synchronisation and of the node status.

On both servers:  GET  /api/node, GET /api/sync/history
Moon only:        POST /api/sync          the crew or the dashboard asks the moon to sync with earth now
Earth only:       POST /api/sync/push     the moon sends its rows
                  GET  /api/sync/pull     the moon downloads earth's rows
The two earth endpoints need the shared SYNC_TOKEN. The node status needs a signed-in user; the history and
POST /api/sync need a commander or the earth administrator.
"""

import secrets
import threading
from collections.abc import Iterator
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app import models
from app.auth import CrewWideUser, CurrentUser
from app.config import NodeRole, Settings, get_settings
from app.db import DbSession
from app.sync import (
    EarthServer,
    count_pending_push,
    pull_from_earth,
    push_to_earth,
    receive_push,
    serve_pull,
)
from app.sync_client import HttpEarthServer

router = APIRouter(prefix="/api")

SettingsDependency = Annotated[Settings, Depends(get_settings)]

# One sync at a time on the moon: two at once would read the same "last synced" point and send twice
_sync_lock = threading.Lock()


# --- Contracts ---


class SyncOperation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    direction: str
    peer: str
    started_at: datetime
    finished_at: datetime
    status: str
    row_count: int
    from_seq: int | None
    to_seq: int | None
    error: str | None


class NodeStatus(BaseModel):
    role: NodeRole
    sync_configured: bool  # moon: earth URL and token set. Earth: token set
    earth_url: str | None  # moon only
    pending_push_rows: int | None  # moon only: rows earth does not have yet
    last_push: SyncOperation | None  # moon: last push it made. Earth: last push it received
    last_pull: SyncOperation | None  # moon: last pull it made. Earth: last pull it served


class SyncRequest(BaseModel):
    push: bool = True
    pull: bool = True


class SyncResult(BaseModel):
    push: SyncOperation | None
    pull: SyncOperation | None


class PushRequest(BaseModel):
    changes: dict[str, list[dict[str, Any]]]


class PushResponse(BaseModel):
    received: int


class PullResponse(BaseModel):
    changes: dict[str, list[dict[str, Any]]]
    to_seq: int


# --- Dependencies ---


def require_role(settings: Settings, role: NodeRole) -> None:
    if settings.node_role != role:
        raise HTTPException(status_code=404, detail=f"Not available on the {settings.node_role} server")


def require_sync_token(settings: SettingsDependency, authorization: Annotated[str | None, Header()] = None) -> None:
    """Earth endpoints: only the moon, with the shared token, may call them."""
    require_role(settings, "earth")
    if not settings.sync_token:
        raise HTTPException(status_code=503, detail="Sync is not configured on this server: set SYNC_TOKEN")
    expected = f"Bearer {settings.sync_token}"
    if authorization is None or not secrets.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or wrong sync token")


def get_earth_server(settings: SettingsDependency) -> Iterator[EarthServer]:
    require_role(settings, "moon")
    if not settings.earth_url or not settings.sync_token:
        raise HTTPException(status_code=503, detail="Sync is not configured: set EARTH_URL and SYNC_TOKEN")
    earth = HttpEarthServer(settings.earth_url, settings.sync_token)
    try:
        yield earth
    finally:
        earth.close()


def last_operation(session: DbSession, direction: str) -> models.SyncOperation | None:
    return session.scalar(
        select(models.SyncOperation)
        .where(models.SyncOperation.direction == direction)
        .order_by(models.SyncOperation.id.desc())
        .limit(1)
    )


def to_contract(operation: models.SyncOperation | None) -> SyncOperation | None:
    return SyncOperation.model_validate(operation) if operation is not None else None


# --- Both servers ---


@router.get("/node")
def get_node_status(session: DbSession, settings: SettingsDependency, user: CurrentUser) -> NodeStatus:
    is_moon = settings.node_role == "moon"
    return NodeStatus(
        role=settings.node_role,
        sync_configured=bool(settings.sync_token and (settings.earth_url or not is_moon)),
        earth_url=settings.earth_url if is_moon else None,
        pending_push_rows=count_pending_push(session) if is_moon else None,
        last_push=to_contract(last_operation(session, "push" if is_moon else "received_push")),
        last_pull=to_contract(last_operation(session, "pull" if is_moon else "served_pull")),
    )


@router.get("/sync/history")
def get_sync_history(
    session: DbSession, user: CrewWideUser, limit: Annotated[int, Query(ge=1, le=200)] = 20
) -> list[SyncOperation]:
    operations = session.scalars(select(models.SyncOperation).order_by(models.SyncOperation.id.desc()).limit(limit))
    return [SyncOperation.model_validate(operation) for operation in operations]


# --- Moon ---


@router.post("/sync")
def sync_with_earth(
    session: DbSession,
    user: CrewWideUser,
    earth: Annotated[EarthServer, Depends(get_earth_server)],
    request: SyncRequest | None = None,
) -> SyncResult:
    """Sends the moon's new rows to earth, then downloads earth's new rows. Failures are in the result."""
    request = request or SyncRequest()
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A sync is already running")
    try:
        pushed = push_to_earth(session, earth) if request.push else None
        pulled = pull_from_earth(session, earth) if request.pull else None
    finally:
        _sync_lock.release()
    return SyncResult(push=to_contract(pushed), pull=to_contract(pulled))


# --- Earth ---


@router.post("/sync/push", dependencies=[Depends(require_sync_token)])
def accept_push(session: DbSession, request: PushRequest) -> PushResponse:
    try:
        received = receive_push(session, request.changes)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return PushResponse(received=received)


@router.get("/sync/pull", dependencies=[Depends(require_sync_token)])
def answer_pull(session: DbSession, since: Annotated[int, Query(ge=0)] = 0) -> PullResponse:
    changes, to_seq = serve_pull(session, since)
    return PullResponse(changes=changes, to_seq=to_seq)
