"""Syncs the moon with earth now, from the moon server's own machine: push, then pull.

    uv run python sync_now.py            # push and pull
    uv run python sync_now.py --pull     # only download from earth
    uv run python sync_now.py --push     # only send to earth

The same as POST /api/sync, without signing in: whoever can run this already has the database. It is how a new
moon gets its first users from earth, before anyone can sign in on it. Uses the .env (ENV_FILE picks another).
"""

import argparse

from app.config import get_settings
from app.db import get_session_factory
from app.sync import pull_from_earth, push_to_earth
from app.sync_client import HttpEarthServer


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--push", action="store_true", help="only send the moon's new rows")
    parser.add_argument("--pull", action="store_true", help="only download earth's new rows")
    arguments = parser.parse_args()
    do_push = arguments.push or not arguments.pull
    do_pull = arguments.pull or not arguments.push

    settings = get_settings()
    if settings.node_role != "moon":
        raise SystemExit("Run this on the moon server: NODE_ROLE is not moon")
    if not settings.earth_url or not settings.sync_token:
        raise SystemExit("Set EARTH_URL and SYNC_TOKEN first")

    earth = HttpEarthServer(settings.earth_url, settings.sync_token)
    try:
        with get_session_factory()() as session:
            operations = []
            if do_push:
                operations.append(push_to_earth(session, earth))
            if do_pull:
                operations.append(pull_from_earth(session, earth))
    finally:
        earth.close()

    for operation in operations:
        detail = operation.error or f"{operation.row_count} rows"
        print(f"{operation.direction:<5} {operation.status:<6} {detail}")
    if any(operation.status != "ok" for operation in operations):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
