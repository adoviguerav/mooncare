"""Hydration and breathing: the two daily tools of the crew app (from Becky's prototype, 15 Nov).

- Hydration: the crew member logs each drink and the fountain fills towards the day's goal. The goal is a
  reference value with its source (cfg.hydration_goal, from EFSA), chosen by the crew member's sex. It raises no
  alert: a fountain that is not full is not a health finding.
- Breathing: a slow-breathing exercise. Each finished session is stored, to show how many were done that day.

Reading is like the panel: the crew member, the medical officer and the commander. Writing is only the crew member
themselves, never on their behalf. Rows are written on the moon and sent to earth with the sync.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app import models
from app.auth import CurrentUser, now, require_access_to_crew_member, require_own_crew_member
from app.db import DbSession

router = APIRouter(prefix="/api", tags=["wellbeing"])

NOT_SET_UP = "Hydration and breathing are not set up on this server yet"


@contextmanager
def tables_ready(session: Session) -> Iterator[None]:
    """A database that has not run migrations/2026-11-15_wellbeing.sql lacks these tables: say so, as a 503."""
    try:
        yield
    except ProgrammingError as error:
        session.rollback()
        raise HTTPException(status_code=503, detail=NOT_SET_UP) from error

STREAK_WINDOW_DAYS = 400
GOAL_ROUNDING_ML = 100


# --- Contracts ---


class HydrationGoal(BaseModel):
    ml: int  # what the drinks of a day should add up to
    total_water_ml: int  # the reference total intake, food included
    drinks_share: float  # the part of it that comes from drinks
    source: str


class Drink(BaseModel):
    drunk_at: str
    ml: int


class HydrationDay(BaseModel):
    date: date
    goal: HydrationGoal | None  # None when the crew member has no sex recorded: the fountain has no goal
    total_ml: int
    drinks: list[Drink]  # the drinks of the day that were not undone, oldest first
    full_days_in_a_row: int  # days before this one that reached the goal, without a gap


class DrinkRequest(BaseModel):
    ml: int = Field(gt=0, le=1000)


class BreathingDay(BaseModel):
    date: date
    sessions: int


class BreathingRequest(BaseModel):
    breaths: int = Field(gt=0, le=20)


# --- Hydration ---


def find_goal(session: Session, crew_member_id: int) -> HydrationGoal | None:
    crew_member = session.get(models.CrewMember, crew_member_id)
    if crew_member is None:
        raise HTTPException(status_code=404, detail=f"Crew member {crew_member_id} not found")
    if crew_member.sex is None:
        return None
    goal = session.get(models.HydrationGoal, crew_member.sex)
    if goal is None:
        return None
    drinks_ml = round(goal.total_water_ml * float(goal.drinks_share) / GOAL_ROUNDING_ML) * GOAL_ROUNDING_ML
    return HydrationGoal(
        ml=drinks_ml, total_water_ml=goal.total_water_ml, drinks_share=float(goal.drinks_share), source=goal.source
    )


def count_full_days(session: Session, crew_member_id: int, day: date, goal_ml: int) -> int:
    totals = dict(
        session.execute(
            select(models.HydrationDrink.day, func.sum(models.HydrationDrink.ml))
            .where(
                models.HydrationDrink.crew_member_id == crew_member_id,
                models.HydrationDrink.undone.is_(False),
                models.HydrationDrink.day < day,
                models.HydrationDrink.day >= day - timedelta(days=STREAK_WINDOW_DAYS),
            )
            .group_by(models.HydrationDrink.day)
        ).all()
    )
    streak, previous = 0, day - timedelta(days=1)
    while totals.get(previous, 0) >= goal_ml:
        streak += 1
        previous -= timedelta(days=1)
    return streak


def build_hydration_day(session: Session, crew_member_id: int, day: date) -> HydrationDay:
    goal = find_goal(session, crew_member_id)
    drinks = session.scalars(
        select(models.HydrationDrink)
        .where(
            models.HydrationDrink.crew_member_id == crew_member_id,
            models.HydrationDrink.day == day,
            models.HydrationDrink.undone.is_(False),
        )
        .order_by(models.HydrationDrink.drunk_at)
    ).all()
    return HydrationDay(
        date=day,
        goal=goal,
        total_ml=sum(drink.ml for drink in drinks),
        drinks=[Drink(drunk_at=drink.drunk_at.isoformat(), ml=drink.ml) for drink in drinks],
        full_days_in_a_row=count_full_days(session, crew_member_id, day, goal.ml) if goal else 0,
    )


@router.get("/crew/{crew_member_id}/hydration/{day}")
def get_hydration(crew_member_id: int, day: date, session: DbSession, user: CurrentUser) -> HydrationDay:
    require_access_to_crew_member(user, crew_member_id)
    with tables_ready(session):
        return build_hydration_day(session, crew_member_id, day)


@router.post("/crew/{crew_member_id}/hydration/{day}")
def log_drink(crew_member_id: int, day: date, request: DrinkRequest, session: DbSession, user: CurrentUser) -> HydrationDay:
    require_own_crew_member(user, crew_member_id)
    with tables_ready(session):
        find_goal(session, crew_member_id)  # 404 for a crew member that does not exist
        session.add(models.HydrationDrink(crew_member_id=crew_member_id, drunk_at=now(), day=day, ml=request.ml, undone=False))
        session.commit()
        return build_hydration_day(session, crew_member_id, day)


@router.post("/crew/{crew_member_id}/hydration/{day}/undo")
def undo_last_drink(crew_member_id: int, day: date, session: DbSession, user: CurrentUser) -> HydrationDay:
    """Marks the day's last drink as undone. The row stays, because the sync does not carry deletions."""
    require_own_crew_member(user, crew_member_id)
    with tables_ready(session):
        return undo(session, crew_member_id, day)


def undo(session: Session, crew_member_id: int, day: date) -> HydrationDay:
    last = session.scalars(
        select(models.HydrationDrink)
        .where(
            models.HydrationDrink.crew_member_id == crew_member_id,
            models.HydrationDrink.day == day,
            models.HydrationDrink.undone.is_(False),
        )
        .order_by(models.HydrationDrink.drunk_at.desc())
        .limit(1)
    ).first()
    if last is None:
        raise HTTPException(status_code=409, detail="There is no drink to undo on this day")
    last.undone = True
    session.commit()
    return build_hydration_day(session, crew_member_id, day)


# --- Breathing ---


def count_sessions(session: Session, crew_member_id: int, day: date) -> BreathingDay:
    sessions = session.scalar(
        select(func.count()).where(
            models.BreathingSession.crew_member_id == crew_member_id, models.BreathingSession.day == day
        )
    )
    return BreathingDay(date=day, sessions=int(sessions or 0))


@router.get("/crew/{crew_member_id}/breathing/{day}")
def get_breathing(crew_member_id: int, day: date, session: DbSession, user: CurrentUser) -> BreathingDay:
    require_access_to_crew_member(user, crew_member_id)
    with tables_ready(session):
        find_goal(session, crew_member_id)  # 404 for a crew member that does not exist
        return count_sessions(session, crew_member_id, day)


@router.post("/crew/{crew_member_id}/breathing/{day}")
def log_breathing(
    crew_member_id: int, day: date, request: BreathingRequest, session: DbSession, user: CurrentUser
) -> BreathingDay:
    require_own_crew_member(user, crew_member_id)
    with tables_ready(session):
        find_goal(session, crew_member_id)
        session.add(models.BreathingSession(crew_member_id=crew_member_id, finished_at=now(), day=day, breaths=request.breaths))
        session.commit()
        return count_sessions(session, crew_member_id, day)

