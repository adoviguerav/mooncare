"""The voice agent of the emergency guide: POST /api/emergency/voice-session.

The agent lives in ElevenLabs and is private. The browser talks to it over a signed URL that only this
server can ask for, so the API key never reaches the browser. See docs/emergency_guide.md.
"""

import threading
import time
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.config import Settings, get_settings

SIGNED_URL_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
TIMEOUT_SECONDS = 10.0
# Each session is a conversation billed to our ElevenLabs account, and the endpoint asks for no user
MAX_SESSIONS_PER_CALLER = 30
SESSION_WINDOW_SECONDS = 3600

router = APIRouter(prefix="/api/emergency")


class VoiceSession(BaseModel):
    # Opens one conversation with the agent. ElevenLabs lets it be used for 15 minutes.
    signed_url: str


class SessionLimiter:
    """How many sessions each caller has opened lately. Kept in memory: it starts again with the server."""

    def __init__(self, max_sessions: int, window_seconds: float) -> None:
        self._max_sessions = max_sessions
        self._window_seconds = window_seconds
        self._opened_at: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allow(self, caller: str, now: float) -> bool:
        with self._lock:
            recent = [opened for opened in self._opened_at.get(caller, []) if now - opened < self._window_seconds]
            allowed = len(recent) < self._max_sessions
            self._opened_at[caller] = [*recent, now] if allowed else recent
            return allowed


_session_limiter = SessionLimiter(MAX_SESSIONS_PER_CALLER, SESSION_WINDOW_SECONDS)


def get_session_limiter() -> SessionLimiter:
    return _session_limiter


def get_caller(request: Request) -> str:
    """The address the request came from. Behind Vercel and Render it is the first one of X-Forwarded-For."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_elevenlabs_transport() -> httpx.BaseTransport | None:
    """None is the real network. The tests replace it."""
    return None


@router.post("/voice-session")
def create_voice_session(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    limiter: Annotated[SessionLimiter, Depends(get_session_limiter)],
    transport: Annotated[httpx.BaseTransport | None, Depends(get_elevenlabs_transport)],
) -> VoiceSession:
    if settings.elevenlabs_api_key is None or settings.elevenlabs_agent_id is None:
        raise HTTPException(status_code=503, detail="The voice agent is not set up on this server")
    if not limiter.allow(get_caller(request), now=time.monotonic()):
        raise HTTPException(status_code=429, detail="Too many voice sessions. Try again later")
    try:
        with httpx.Client(transport=transport, timeout=TIMEOUT_SECONDS) as client:
            response = client.get(
                SIGNED_URL_ENDPOINT,
                params={"agent_id": settings.elevenlabs_agent_id},
                headers={"xi-api-key": settings.elevenlabs_api_key},
            )
            response.raise_for_status()
            return VoiceSession.model_validate(response.json())
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="The voice agent could not be reached") from error
