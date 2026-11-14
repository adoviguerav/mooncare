"""The voice agent of the emergency guide: POST /api/emergency/voice-session.

The agent lives in ElevenLabs and is private. The browser talks to it over a signed URL that only this
server can ask for, so the API key never reaches the browser. See docs/emergency_guide.md.
"""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import Settings, get_settings

SIGNED_URL_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
TIMEOUT_SECONDS = 10.0

router = APIRouter(prefix="/api/emergency")


class VoiceSession(BaseModel):
    # Opens one conversation with the agent. ElevenLabs lets it be used for 15 minutes.
    signed_url: str


def get_elevenlabs_transport() -> httpx.BaseTransport | None:
    """None is the real network. The tests replace it."""
    return None


@router.post("/voice-session")
def create_voice_session(
    settings: Annotated[Settings, Depends(get_settings)],
    transport: Annotated[httpx.BaseTransport | None, Depends(get_elevenlabs_transport)],
) -> VoiceSession:
    if settings.elevenlabs_api_key is None or settings.elevenlabs_agent_id is None:
        raise HTTPException(status_code=503, detail="The voice agent is not set up on this server")
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
