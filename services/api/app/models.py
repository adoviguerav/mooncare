"""SQLAlchemy models of the tables in database/postgresql/schema.

The .sql files define the tables; these classes only map them. A change to a table goes in both places,
in the same commit. Nothing here creates or alters a table.
"""

from datetime import date, datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "source"
    __table_args__ = {"schema": "cfg"}

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    url: Mapped[str]
    citation: Mapped[str]


class Indicator(Base):
    __tablename__ = "indicator"
    __table_args__ = {"schema": "cfg"}

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    unit: Mapped[str | None]
    how_to_measure: Mapped[str]
    why_it_matters: Mapped[str]
    source_id: Mapped[str] = mapped_column(ForeignKey("cfg.source.id"))
    display_order: Mapped[int]

    source: Mapped[Source] = relationship(lazy="joined")


class Rule(Base):
    __tablename__ = "rule"
    __table_args__ = {"schema": "cfg"}

    id: Mapped[int] = mapped_column(primary_key=True)
    indicator_id: Mapped[str] = mapped_column(ForeignKey("cfg.indicator.id"))
    low: Mapped[float | None]
    high: Mapped[float | None]
    title: Mapped[str]
    explanation: Mapped[str]
    action: Mapped[str]
    threshold_source: Mapped[str]


class CrewMember(Base):
    __tablename__ = "crew_member"
    __table_args__ = {"schema": "dat"}

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    role: Mapped[str]


class Reading(Base):
    __tablename__ = "reading"
    __table_args__ = {"schema": "dat"}

    crew_member_id: Mapped[int] = mapped_column(ForeignKey("dat.crew_member.id"), primary_key=True)
    indicator_id: Mapped[str] = mapped_column(ForeignKey("cfg.indicator.id"), primary_key=True)
    taken_at: Mapped[datetime] = mapped_column(primary_key=True)
    value: Mapped[float]


# The sync_seq column of the synchronised tables (database/postgresql/schema/03_sync.sql) is left out of the
# classes above on purpose: the database fills it in, and only app/sync.py reads it.


class SyncOperation(Base):
    """One synchronisation between the moon and earth, successful or not. Append only."""

    __tablename__ = "sync_operation"
    __table_args__ = {"schema": "his"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    direction: Mapped[str]
    peer: Mapped[str]
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str]
    row_count: Mapped[int]
    from_seq: Mapped[int | None] = mapped_column(BigInteger)
    to_seq: Mapped[int | None] = mapped_column(BigInteger)
    error: Mapped[str | None]


# --- Accounts (database/postgresql/schema/04_auth.sql) ---


class AppUser(Base):
    """Someone who can sign in. Managed on earth and downloaded by the moon."""

    __tablename__ = "app_user"
    __table_args__ = {"schema": "dat"}

    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str]
    role: Mapped[str]  # crew_member, commander or earth_admin
    crew_member_id: Mapped[int | None] = mapped_column(ForeignKey("dat.crew_member.id"))
    pin_hash: Mapped[str]
    is_active: Mapped[bool] = mapped_column(server_default="true")


class UserSession(Base):
    """A signed-in device. Only the SHA-256 of the token is stored. Never synchronised."""

    __tablename__ = "session"
    __table_args__ = {"schema": "dat"}

    token_hash: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("dat.app_user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[AppUser] = relationship(lazy="joined")


class AuthEvent(Base):
    """A sign-in attempt or a sign-out. Append only. Never synchronised."""

    __tablename__ = "auth_event"
    __table_args__ = {"schema": "his"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("dat.app_user.id"))
    event: Mapped[str]
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --- Station radiation and daily checklist (database/postgresql/schema/05_station_and_tasks.sql) ---


class StationDose(Base):
    """One instrument's absorbed dose for one day, where the instrument sits. Not a person's dose."""

    __tablename__ = "station_dose"
    __table_args__ = {"schema": "dat"}

    day: Mapped[date] = mapped_column(primary_key=True)
    instrument: Mapped[str] = mapped_column(primary_key=True)
    module: Mapped[str]
    mean_rate_ugy_h: Mapped[float]
    absorbed_dose_ugy: Mapped[float]
    hours_measured: Mapped[int]


class DailyTask(Base):
    __tablename__ = "daily_task"
    __table_args__ = {"schema": "cfg"}

    id: Mapped[str] = mapped_column(primary_key=True)
    title: Mapped[str]
    xp: Mapped[int]
    completion: Mapped[str]  # auto_checkin, auto_sleep or manual
    display_order: Mapped[int]


class TaskCompletion(Base):
    __tablename__ = "task_completion"
    __table_args__ = {"schema": "dat"}

    crew_member_id: Mapped[int] = mapped_column(ForeignKey("dat.crew_member.id"), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("cfg.daily_task.id"), primary_key=True)
    day: Mapped[date] = mapped_column(primary_key=True)
    done: Mapped[bool]
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
