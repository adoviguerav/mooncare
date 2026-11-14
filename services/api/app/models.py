"""SQLAlchemy models of the tables in database/postgresql/schema.

The .sql files define the tables; these classes only map them. A change to a table goes in both places,
in the same commit. Nothing here creates or alters a table.
"""

from datetime import datetime

from sqlalchemy import ForeignKey
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


class Reading(Base):
    __tablename__ = "reading"
    __table_args__ = {"schema": "dat"}

    crew_member_id: Mapped[int] = mapped_column(ForeignKey("dat.crew_member.id"), primary_key=True)
    indicator_id: Mapped[str] = mapped_column(ForeignKey("cfg.indicator.id"), primary_key=True)
    taken_at: Mapped[datetime] = mapped_column(primary_key=True)
    value: Mapped[float]
