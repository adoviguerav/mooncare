"""Accounts and sign-in.

- A user picks their name and types their PIN. The PIN is checked against its argon2 hash.
- A session lasts 10 days. The browser keeps it in an HttpOnly cookie that page scripts cannot read; a native
  client may ask for the token and send it as `Authorization: Bearer`. Only the token's SHA-256 is stored.
- After 5 wrong PINs in 15 minutes the account is locked for 15 minutes.
- Who signs in where: crew members and commanders on the moon, the earth administrator on earth.
- What each one sees: a crew member only their own data; a commander the whole crew, on the moon; the earth
  administrator the whole crew, on earth. The backend checks it on every request; the frontend never decides.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.config import NodeRole, Settings, get_settings
from app.db import DbSession

Role = Literal["crew_member", "commander", "earth_admin"]

SESSION_DAYS = 10
SESSION_COOKIE = "mooncare_session"
MAX_FAILED_LOGINS = 5
LOCK_MINUTES = 15
ROLES_BY_NODE: dict[NodeRole, set[str]] = {"moon": {"crew_member", "commander"}, "earth": {"earth_admin"}}
# Roles that see every crew member's data, on the server where they sign in
CREW_WIDE_ROLES = {"commander", "earth_admin"}
WRONG_PIN = "Wrong name or PIN"

_hasher = PasswordHasher()

router = APIRouter(prefix="/api/auth", tags=["auth"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]


# --- PINs and tokens ---


def hash_pin(pin: str) -> str:
    return _hasher.hash(pin)


def verify_pin(pin_hash: str, pin: str) -> bool:
    try:
        return _hasher.verify(pin_hash, pin)
    except (VerificationError, InvalidHashError):
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def now() -> datetime:
    return datetime.now(UTC)


# --- Contracts ---


class SignInUser(BaseModel):
    """What the sign-in screen shows: names and roles only."""

    id: int
    display_name: str
    role: Role
    crew_member_id: int | None


class SignInUsersResponse(BaseModel):
    node_role: NodeRole
    users: list[SignInUser]


class LoginRequest(BaseModel):
    user_id: int
    pin: str = Field(min_length=4, max_length=64)
    # web: the session goes in an HttpOnly cookie. native: the token is also returned, for secure storage
    client: Literal["web", "native"] = "web"


class Me(BaseModel):
    id: int
    display_name: str
    role: Role
    crew_member_id: int | None
    node_role: NodeRole


class LoginResponse(BaseModel):
    user: Me
    expires_at: datetime
    token: str | None = None  # only for client="native"


def to_me(user: models.AppUser, settings: Settings) -> Me:
    return Me(
        id=user.id,
        display_name=user.display_name,
        role=user.role,  # type: ignore[arg-type]
        crew_member_id=user.crew_member_id,
        node_role=settings.node_role,
    )


# --- Sign-in ---


def can_sign_in_here(user: models.AppUser, settings: Settings) -> bool:
    return user.is_active and user.role in ROLES_BY_NODE[settings.node_role]


def record_event(session: Session, user_id: int | None, event: str) -> None:
    session.add(models.AuthEvent(user_id=user_id, event=event, occurred_at=now()))


def minutes_locked(session: Session, user_id: int) -> int:
    """0 if the account may try again, otherwise how many minutes are left."""
    since = now() - timedelta(minutes=LOCK_MINUTES)
    last_ok = session.scalar(
        select(func.max(models.AuthEvent.occurred_at)).where(
            models.AuthEvent.user_id == user_id, models.AuthEvent.event == "login_ok"
        )
    )
    window_start = max(since, last_ok) if last_ok else since
    failures = session.scalars(
        select(models.AuthEvent.occurred_at)
        .where(
            models.AuthEvent.user_id == user_id,
            models.AuthEvent.event == "login_failed",
            models.AuthEvent.occurred_at > window_start,
        )
        .order_by(models.AuthEvent.occurred_at.desc())
    ).all()
    if len(failures) < MAX_FAILED_LOGINS:
        return 0
    unlock_at = failures[MAX_FAILED_LOGINS - 1] + timedelta(minutes=LOCK_MINUTES)
    return max(1, int((unlock_at - now()).total_seconds() // 60) + 1)


def start_session(session: Session, user: models.AppUser) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires_at = now() + timedelta(days=SESSION_DAYS)
    session.add(
        models.UserSession(token_hash=hash_token(token), user_id=user.id, created_at=now(), expires_at=expires_at)
    )
    return token, expires_at


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,  # page scripts cannot read it
        samesite="lax",  # not sent on requests started by other sites
        secure=settings.cookie_secure,  # HTTPS only, when deployed
        path="/",
    )


# --- Who is calling ---


def get_current_user(
    session: DbSession,
    settings: SettingsDependency,
    session_cookie: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> models.AppUser:
    token = session_cookie
    if token is None and authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    user_session = session.get(models.UserSession, hash_token(token))
    if (
        user_session is None
        or user_session.revoked_at is not None
        or user_session.expires_at <= now()
        or not can_sign_in_here(user_session.user, settings)
    ):
        raise HTTPException(status_code=401, detail="Session expired. Sign in again")
    return user_session.user


CurrentUser = Annotated[models.AppUser, Depends(get_current_user)]


def require_crew_wide(user: CurrentUser) -> models.AppUser:
    """Commanders on the moon and the earth administrator: the dashboard and the sync."""
    if user.role not in CREW_WIDE_ROLES:
        raise HTTPException(status_code=403, detail="Only a commander or the earth administrator can do this")
    return user


CrewWideUser = Annotated[models.AppUser, Depends(require_crew_wide)]


def require_access_to_crew_member(user: models.AppUser, crew_member_id: int) -> None:
    if user.role in CREW_WIDE_ROLES or user.crew_member_id == crew_member_id:
        return
    raise HTTPException(status_code=403, detail="You can only see your own health data")


def require_own_crew_member(user: models.AppUser, crew_member_id: int) -> None:
    """Writing a check-in: only the crew member themselves, never on their behalf."""
    if user.crew_member_id != crew_member_id:
        raise HTTPException(status_code=403, detail="You can only check in for yourself")


# --- Endpoints ---


@router.get("/users")
def list_sign_in_users(session: DbSession, settings: SettingsDependency) -> SignInUsersResponse:
    """Public: the names for the sign-in screen, only of who can sign in on this server."""
    users = session.scalars(
        select(models.AppUser)
        .where(models.AppUser.is_active, models.AppUser.role.in_(ROLES_BY_NODE[settings.node_role]))
        .order_by(models.AppUser.crew_member_id.nulls_last(), models.AppUser.id)
    )
    return SignInUsersResponse(
        node_role=settings.node_role,
        users=[SignInUser.model_validate(user, from_attributes=True) for user in users],
    )


@router.post("/login")
def login(request: LoginRequest, response: Response, session: DbSession, settings: SettingsDependency) -> LoginResponse:
    """Public. The same answer for an unknown user and a wrong PIN, so it does not reveal who exists."""
    user = session.get(models.AppUser, request.user_id)
    if user is None or not can_sign_in_here(user, settings):
        raise HTTPException(status_code=401, detail=WRONG_PIN)
    locked_for = minutes_locked(session, user.id)
    if locked_for:
        record_event(session, user.id, "login_locked")
        session.commit()
        raise HTTPException(status_code=429, detail=f"Too many wrong PINs. Try again in {locked_for} min")
    if not verify_pin(user.pin_hash, request.pin):
        record_event(session, user.id, "login_failed")
        session.commit()
        raise HTTPException(status_code=401, detail=WRONG_PIN)

    token, expires_at = start_session(session, user)
    record_event(session, user.id, "login_ok")
    session.commit()
    set_session_cookie(response, token, settings)
    return LoginResponse(
        user=to_me(user, settings), expires_at=expires_at, token=token if request.client == "native" else None
    )


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session: DbSession,
    user: CurrentUser,
    session_cookie: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    token = session_cookie or (authorization or "").removeprefix("Bearer ")
    user_session = session.get(models.UserSession, hash_token(token))
    if user_session is not None and user_session.revoked_at is None:
        user_session.revoked_at = now()
    record_event(session, user.id, "logout")
    session.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me")
def get_me(user: CurrentUser, settings: SettingsDependency) -> Me:
    return to_me(user, settings)
