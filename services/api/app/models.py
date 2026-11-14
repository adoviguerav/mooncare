"""SQLAlchemy models of the tables in database/postgresql/schema.

The .sql files define the tables; these classes only map them. A change to a table goes in both places,
in the same commit. Nothing here creates or alters a table.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey
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
    measured_by: Mapped[str]
    cadence_days: Mapped[int | None]
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
