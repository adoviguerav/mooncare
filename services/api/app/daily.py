"""The daily routine: the checklist with its XP, level and check-in streak.

The checklist mixes tasks the data completes on its own (a check-in that day, sleep recorded by the tracker)
with tasks the crew member ticks. XP is game design: it rewards the routine and never depends on a health value.
"""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import Date, cast, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import models
from app.auth import CurrentUser, now, require_access_to_crew_member, require_own_crew_member
from app.db import DbSession

router = APIRouter(prefix="/api", tags=["daily"])

XP_PER_LEVEL = 1000
STREAK_WINDOW_DAYS = 400
CHECKIN_MOODS = ("mood_happy", "mood_sad", "mood_tense", "mood_alert", "mood_rested", "mood_neutral")
SLEEP_INDICATOR = "sleep_duration"


# --- Contracts ---


class DailyTaskStatus(BaseModel):
    id: str
    title: str
    xp: int
    completion: Literal["auto_checkin", "auto_sleep", "manual"]
    done: bool


class Progress(BaseModel):
    xp: int  # all XP earned up to the end of the day
    level: int
    level_xp: int  # XP inside the current level
    next_level_xp: int  # XP a level takes
    streak: int  # days in a row with a check-in, up to the day (or the day before, if the day has none yet)


class DailyChecklist(BaseModel):
    date: date
    tasks: list[DailyTaskStatus]
    progress: Progress


class TaskUpdate(BaseModel):
    done: bool


# --- Checklist ---


def days_with_checkin(session: Session, crew_member_id: int, until: date) -> set[date]:
    rows = session.scalars(
        select(cast(models.Reading.taken_at, Date))
        .where(
            models.Reading.crew_member_id == crew_member_id,
            models.Reading.indicator_id.in_(CHECKIN_MOODS),
            models.Reading.value == 1,
            models.Reading.taken_at < until + timedelta(days=1),
            models.Reading.taken_at >= until - timedelta(days=STREAK_WINDOW_DAYS),
        )
        .distinct()
    )
    return set(rows)


def days_with_sleep(session: Session, crew_member_id: int, until: date) -> set[date]:
    rows = session.scalars(
        select(cast(models.Reading.taken_at, Date))
        .where(
            models.Reading.crew_member_id == crew_member_id,
            models.Reading.indicator_id == SLEEP_INDICATOR,
            models.Reading.taken_at < until + timedelta(days=1),
        )
        .distinct()
    )
    return set(rows)


def count_streak(days: set[date], until: date) -> int:
    day = until if until in days else until - timedelta(days=1)  # today's check-in may still be to come
    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    return streak


def build_checklist(session: Session, crew_member_id: int, day: date) -> DailyChecklist:
    tasks = session.scalars(select(models.DailyTask).order_by(models.DailyTask.display_order)).all()
    checkins = days_with_checkin(session, crew_member_id, day)
    sleeps = days_with_sleep(session, crew_member_id, day)
    ticked = {
        completion.task_id: completion.done
        for completion in session.scalars(
            select(models.TaskCompletion).where(
                models.TaskCompletion.crew_member_id == crew_member_id, models.TaskCompletion.day == day
            )
        )
    }

    def is_done(task: models.DailyTask) -> bool:
        if task.completion == "auto_checkin":
            return day in checkins
        if task.completion == "auto_sleep":
            return day in sleeps
        return ticked.get(task.id, False)

    # XP of every day up to this one: automatic tasks from the data, manual ones from the ticks
    xp = 0
    for task in tasks:
        if task.completion == "auto_checkin":
            xp += task.xp * len(checkins)
        elif task.completion == "auto_sleep":
            xp += task.xp * len(sleeps)
    manual_xp = session.scalar(
        select(func.coalesce(func.sum(models.DailyTask.xp), 0))
        .join(models.TaskCompletion, models.TaskCompletion.task_id == models.DailyTask.id)
        .where(
            models.TaskCompletion.crew_member_id == crew_member_id,
            models.TaskCompletion.done,
            models.TaskCompletion.day <= day,
            models.DailyTask.completion == "manual",
        )
    )
    xp += int(manual_xp or 0)

    return DailyChecklist(
        date=day,
        tasks=[
            DailyTaskStatus(id=task.id, title=task.title, xp=task.xp, completion=task.completion, done=is_done(task))  # type: ignore[arg-type]
            for task in tasks
        ],
        progress=Progress(
            xp=xp,
            level=xp // XP_PER_LEVEL + 1,
            level_xp=xp % XP_PER_LEVEL,
            next_level_xp=XP_PER_LEVEL,
            streak=count_streak(checkins, day),
        ),
    )


def require_crew_member_exists(session: Session, crew_member_id: int) -> None:
    if session.get(models.CrewMember, crew_member_id) is None:
        raise HTTPException(status_code=404, detail=f"Crew member {crew_member_id} not found")


@router.get("/crew/{crew_member_id}/tasks/{day}")
def get_checklist(crew_member_id: int, day: date, session: DbSession, user: CurrentUser) -> DailyChecklist:
    require_access_to_crew_member(user, crew_member_id)
    require_crew_member_exists(session, crew_member_id)
    return build_checklist(session, crew_member_id, day)


@router.put("/crew/{crew_member_id}/tasks/{day}/{task_id}")
def tick_task(
    crew_member_id: int, day: date, task_id: str, update: TaskUpdate, session: DbSession, user: CurrentUser
) -> DailyChecklist:
    """Ticks or unticks a manual task. The automatic ones follow the data and cannot be ticked."""
    require_crew_member_exists(session, crew_member_id)
    require_own_crew_member(user, crew_member_id)
    task = session.get(models.DailyTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id!r} not found")
    if task.completion != "manual":
        raise HTTPException(status_code=409, detail="This task completes on its own from your data")
    statement = insert(models.TaskCompletion).values(
        crew_member_id=crew_member_id, task_id=task_id, day=day, done=update.done, updated_at=now()
    )
    session.execute(
        statement.on_conflict_do_update(
            index_elements=["crew_member_id", "task_id", "day"],
            set_={"done": statement.excluded.done, "updated_at": statement.excluded.updated_at},
        )
    )
    session.commit()
    return build_checklist(session, crew_member_id, day)
