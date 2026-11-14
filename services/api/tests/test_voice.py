from collections.abc import Iterator

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.voice import get_elevenlabs_transport

SIGNED_URL = "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_1&conversation_signature=abc"


class FakeElevenLabs:
    """Stands in for the ElevenLabs API and keeps the requests it received."""

    def __init__(self, status_code: int = 200) -> None:
        self.status_code = status_code
        self.requests: list[httpx.Request] = []
        self.transport = httpx.MockTransport(self._answer)

    def _answer(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return httpx.Response(self.status_code, json={"signed_url": SIGNED_URL})


def settings_with(**voice_settings: str) -> Settings:
    return Settings(_env_file=None, postgresql_url="postgresql://unused", **voice_settings)  # type: ignore[call-arg]


@pytest.fixture
def serve() -> Iterator[TestClient]:
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_voice_session_returns_the_signed_url_of_the_agent(serve: TestClient) -> None:
    elevenlabs = FakeElevenLabs()
    app.dependency_overrides[get_settings] = lambda: settings_with(
        elevenlabs_api_key="secret-key", elevenlabs_agent_id="agent_1"
    )
    app.dependency_overrides[get_elevenlabs_transport] = lambda: elevenlabs.transport

    response = serve.post("/api/emergency/voice-session")

    assert response.status_code == 200
    assert response.json() == {"signed_url": SIGNED_URL}
    request = elevenlabs.requests[0]
    assert request.url.path == "/v1/convai/conversation/get-signed-url"
    assert request.url.params["agent_id"] == "agent_1"
    assert request.headers["xi-api-key"] == "secret-key"


def test_voice_session_is_unavailable_without_the_key_or_the_agent(serve: TestClient) -> None:
    app.dependency_overrides[get_settings] = lambda: settings_with(elevenlabs_api_key="secret-key")

    response = serve.post("/api/emergency/voice-session")

    assert response.status_code == 503
    assert response.json() == {"detail": "The voice agent is not set up on this server"}


def test_voice_session_hides_what_elevenlabs_answered_when_it_fails(serve: TestClient) -> None:
    elevenlabs = FakeElevenLabs(status_code=401)
    app.dependency_overrides[get_settings] = lambda: settings_with(
        elevenlabs_api_key="secret-key", elevenlabs_agent_id="agent_1"
    )
    app.dependency_overrides[get_elevenlabs_transport] = lambda: elevenlabs.transport

    response = serve.post("/api/emergency/voice-session")

    assert response.status_code == 502
    assert response.json() == {"detail": "The voice agent could not be reached"}
