"""The moon's HTTP client for the earth server. Turns every failure into a SyncError with a short reason."""

import httpx

from app.sync import Changes, SyncError

TIMEOUT_SECONDS = 15.0


class HttpEarthServer:
    def __init__(self, url: str, sync_token: str, transport: httpx.BaseTransport | None = None) -> None:
        self.url = url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.url,
            headers={"Authorization": f"Bearer {sync_token}"},
            timeout=TIMEOUT_SECONDS,
            transport=transport,
        )

    def push(self, changes: Changes) -> int:
        response = self._request("POST", "/api/sync/push", json={"changes": changes})
        return int(response.json()["received"])

    def pull(self, since_seq: int) -> tuple[Changes, int]:
        body = self._request("GET", "/api/sync/pull", params={"since": since_seq}).json()
        return body["changes"], int(body["to_seq"])

    def close(self) -> None:
        self._client.close()

    def _request(self, method: str, path: str, **kwargs: object) -> httpx.Response:
        try:
            response = self._client.request(method, path, **kwargs)  # type: ignore[arg-type]
        except httpx.TimeoutException as error:
            raise SyncError(f"Earth server did not answer in {TIMEOUT_SECONDS:.0f} s") from error
        except httpx.TransportError as error:
            raise SyncError(f"Earth server unreachable: {type(error).__name__}") from error
        if response.status_code in (401, 403):
            raise SyncError("Earth server refused the sync token")
        if response.status_code == 404:
            raise SyncError("Earth server has no sync endpoints: check that it runs with NODE_ROLE=earth")
        if response.is_error:
            raise SyncError(f"Earth server answered {response.status_code}: {response.text[:200]}")
        return response
