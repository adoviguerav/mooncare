"""Creates and manages the users who can sign in, in the database chosen by the .env (ENV_FILE picks another).

    uv run python manage_users.py list
    uv run python manage_users.py create-crew                       # one user per crew member who has none
    uv run python manage_users.py create-earth-admin "Earth Admin"
    uv run python manage_users.py set-pin 3                         # new random PIN for user 3
    uv run python manage_users.py set-pin 3 --pin 482913            # or a chosen one
    uv run python manage_users.py deactivate 3

PINs are never stored, only their argon2 hash, and never go into git: a generated PIN is printed once, here.
Users are managed on EARTH and the moon downloads them with POST /api/sync. Run this against the earth database
(ENV_FILE=.env.earth) and sync, or against the moon directly when it runs alone, as for the jury.
"""

import argparse
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.auth import hash_pin
from app.db import get_session_factory

CREW_PIN_DIGITS = 6
ADMIN_PIN_DIGITS = 8


def generate_pin(digits: int) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(digits))


def check_pin(pin: str) -> str:
    if not pin.isdigit() or not 4 <= len(pin) <= 64:
        raise SystemExit("A PIN is 4 to 64 digits")
    return pin


def print_users(rows: list[tuple[models.AppUser, str | None]]) -> None:
    print(f"{'id':>3}  {'name':<24} {'role':<12} {'crew':>4}  {'active':<6} PIN")
    for user, pin in rows:
        shown = pin if pin is not None else "(set, not shown)"
        print(
            f"{user.id:>3}  {user.display_name:<24} {user.role:<12} {user.crew_member_id or '-':>4}  "
            f"{'yes' if user.is_active else 'no':<6} {shown}"
        )


def list_users(session: Session) -> None:
    users = session.scalars(select(models.AppUser).order_by(models.AppUser.id)).all()
    print_users([(user, None) for user in users])


def create_crew_users(session: Session) -> None:
    """One user per crew member without one. A crew member's role (commander or crew_member) becomes the user's."""
    crew = session.scalars(
        select(models.CrewMember)
        .where(~select(models.AppUser).where(models.AppUser.crew_member_id == models.CrewMember.id).exists())
        .order_by(models.CrewMember.id)
    ).all()
    created = []
    for member in crew:
        pin = generate_pin(CREW_PIN_DIGITS)
        user = models.AppUser(display_name=member.name, role=member.role, crew_member_id=member.id, pin_hash=hash_pin(pin))
        session.add(user)
        created.append((user, pin))
    session.commit()
    if not created:
        print("Every crew member already has a user.")
        return
    print("Write these PINs down now. They are not stored and will not be shown again.\n")
    print_users(created)


def create_earth_admin(session: Session, name: str, pin: str | None) -> None:
    pin = check_pin(pin) if pin else generate_pin(ADMIN_PIN_DIGITS)
    user = models.AppUser(display_name=name, role="earth_admin", crew_member_id=None, pin_hash=hash_pin(pin))
    session.add(user)
    session.commit()
    print("Write this PIN down now. It is not stored and will not be shown again.\n")
    print_users([(user, pin)])


def get_user(session: Session, user_id: int) -> models.AppUser:
    user = session.get(models.AppUser, user_id)
    if user is None:
        raise SystemExit(f"No user {user_id}")
    return user


def set_pin(session: Session, user_id: int, pin: str | None) -> None:
    user = get_user(session, user_id)
    pin = check_pin(pin) if pin else generate_pin(ADMIN_PIN_DIGITS if user.role == "earth_admin" else CREW_PIN_DIGITS)
    user.pin_hash = hash_pin(pin)
    session.commit()
    print_users([(user, pin)])


def deactivate(session: Session, user_id: int) -> None:
    user = get_user(session, user_id)
    user.is_active = False
    session.commit()
    print_users([(user, None)])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list")
    commands.add_parser("create-crew")
    admin = commands.add_parser("create-earth-admin")
    admin.add_argument("name")
    admin.add_argument("--pin")
    pin = commands.add_parser("set-pin")
    pin.add_argument("user_id", type=int)
    pin.add_argument("--pin")
    off = commands.add_parser("deactivate")
    off.add_argument("user_id", type=int)
    arguments = parser.parse_args()

    with get_session_factory()() as session:
        match arguments.command:
            case "list":
                list_users(session)
            case "create-crew":
                create_crew_users(session)
            case "create-earth-admin":
                create_earth_admin(session, arguments.name, arguments.pin)
            case "set-pin":
                set_pin(session, arguments.user_id, arguments.pin)
            case "deactivate":
                deactivate(session, arguments.user_id)


if __name__ == "__main__":
    main()
