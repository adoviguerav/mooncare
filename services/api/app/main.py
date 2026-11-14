from collections.abc import Sequence
from datetime import date, datetime, time, timedelta
from typing import Annotated, get_args

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.orm import Session

from app import models
from app.auth import CurrentUser, require_access_to_crew_member, require_own_crew_member
from app.auth import router as auth_router
from app.daily import router as daily_router
from app.baseline import BASELINE_WINDOW_DAYS, find_baseline_limit
from app.db import DbSession
from app.moods import MOOD_DAY_COUNT_IDS, MOOD_WINDOW_DAYS
from app.sync_routes import router as sync_router
from app.schemas import (
    BrokenRule,
    Checkin,
    CheckinResponse,
    CrewMember,
    CrewResponse,
    HistoryReading,
    Indicator,
    IndicatorResponse,
    MoodId,
    PanelIndicator,
    PanelReading,
    PanelResponse,
    Rule,
    Source,
)

MOOD_IDS = get_args(MoodId)
TAKEN_AT_FORMAT = "%Y-%m-%dT%H:%M"  # the contracts give taken_at as YYYY-MM-DDTHH:MM


def start_of(day: date) -> datetime:
    return datetime.combine(day, time.min)


def start_of_next_day(day: date) -> datetime:
    """Readings up to the end of a day are the ones before the next day starts."""
    return start_of(day + timedelta(days=1))


def format_taken_at(taken_at: datetime) -> str:
    return taken_at.strftime(TAKEN_AT_FORMAT)


def require_crew_member(session: Session, crew_member_id: int) -> None:
    if session.get(models.CrewMember, crew_member_id) is None:
        raise HTTPException(status_code=404, detail=f"Crew member {crew_member_id} not found")


def get_rules_by_indicator(session: Session) -> dict[str, list[Rule]]:
    rules_by_indicator: dict[str, list[Rule]] = {}
    for rule in session.scalars(select(models.Rule).order_by(models.Rule.id)):
        rules_by_indicator.setdefault(rule.indicator_id, []).append(Rule.model_validate(rule, from_attributes=True))
    return rules_by_indicator


def has_baseline_rule(rules: list[Rule]) -> bool:
    return any(rule.baseline_direction is not None for rule in rules)


def start_of_baseline_window(taken_at: datetime) -> datetime:
    return taken_at - timedelta(days=BASELINE_WINDOW_DAYS)


def get_baseline_values(session: Session, crew_member_id: int, indicator_id: str, taken_at: datetime) -> list[float]:
    """The values of the baseline window that ends just before a reading."""
    return list(
        session.scalars(
            select(models.Reading.value).where(
                models.Reading.crew_member_id == crew_member_id,
                models.Reading.indicator_id == indicator_id,
                models.Reading.taken_at >= start_of_baseline_window(taken_at),
                models.Reading.taken_at < taken_at,
            )
        )
    )


def is_broken(rule: Rule, value: float, baseline_values: Sequence[float]) -> bool:
    if rule.baseline_direction is None or rule.baseline_deviations is None:
        below_low = rule.low is not None and value < rule.low
        above_high = rule.high is not None and value > rule.high
        return below_low or above_high
    limit = find_baseline_limit(baseline_values, rule.baseline_direction, rule.baseline_deviations)
    if limit is None:
        return False
    return value > limit if rule.baseline_direction == "above" else value < limit


def find_broken_rule(rules: list[Rule], value: float, baseline_values: Sequence[float]) -> Rule | None:
    for rule in rules:
        if is_broken(rule, value, baseline_values):
            return rule
    return None


def save_readings(
    session: Session, crew_member_id: int, taken_at: datetime, value_by_indicator: dict[str, float]
) -> None:
    """Inserts the readings, or replaces the value of the ones that already exist at that moment."""
    save = insert(models.Reading).values(
        [
            {"crew_member_id": crew_member_id, "indicator_id": indicator_id, "taken_at": taken_at, "value": value}
            for indicator_id, value in value_by_indicator.items()
        ]
    )
    session.execute(
        save.on_conflict_do_update(
            index_elements=["crew_member_id", "indicator_id", "taken_at"],
            set_={"value": save.excluded.value},
        )
    )


def is_due(indicator: models.Indicator, latest_reading: models.Reading | None, day: date) -> bool:
    """Whether a new reading is expected by this day and has not arrived."""
    if indicator.cadence_days is None:
        return False
    if latest_reading is None:
        return True
    days_since_reading = (day - latest_reading.taken_at.date()).days
    if indicator.measured_by == "astronaut":
        return days_since_reading >= indicator.cadence_days
    # A sensor reports during the day, so it is late only after a whole interval with nothing
    return days_since_reading > indicator.cadence_days


app = FastAPI(title="Real Telemetry API")
app.include_router(auth_router)  # /api/auth: sign-in. Every other endpoint needs a signed-in user
app.include_router(sync_router)  # /api/node and /api/sync: moon-earth synchronisation
app.include_router(daily_router)  # /api/crew/{id}/tasks: the daily checklist, XP, level and streak


@app.get("/api/crew")
def get_crew(session: DbSession, user: CurrentUser) -> CrewResponse:
    crew = session.scalars(select(models.CrewMember).order_by(models.CrewMember.id))
    return CrewResponse(crew=[CrewMember.model_validate(member, from_attributes=True) for member in crew])


@app.get("/api/crew/{crew_member_id}/panel")
def get_panel(
    crew_member_id: int,
    session: DbSession,
    user: CurrentUser,
    panel_date: Annotated[date, Query(alias="date")],
) -> PanelResponse:
    require_access_to_crew_member(user, crew_member_id)
    require_crew_member(session, crew_member_id)
    rules_by_indicator = get_rules_by_indicator(session)
    indicators = session.scalars(select(models.Indicator).order_by(models.Indicator.display_order)).all()
    # DISTINCT ON keeps the first row of each indicator: its latest reading up to the end of the day
    latest_readings = session.scalars(
        select(models.Reading)
        .where(
            models.Reading.crew_member_id == crew_member_id,
            models.Reading.taken_at < start_of_next_day(panel_date),
        )
        .order_by(models.Reading.indicator_id, models.Reading.taken_at.desc())
        .ext(distinct_on(models.Reading.indicator_id))
    )
    latest_by_indicator = {reading.indicator_id: reading for reading in latest_readings}

    panel_indicators = []
    for indicator in indicators:
        reading = latest_by_indicator.get(indicator.id)
        panel_reading = None
        broken_rule = None
        if reading is not None:
            panel_reading = PanelReading(taken_at=format_taken_at(reading.taken_at), value=reading.value)
            rules = rules_by_indicator.get(indicator.id, [])
            baseline_values = (
                get_baseline_values(session, crew_member_id, indicator.id, reading.taken_at)
                if has_baseline_rule(rules)
                else []
            )
            rule = find_broken_rule(rules, reading.value, baseline_values)
            if rule is not None:
                broken_rule = BrokenRule(id=rule.id, title=rule.title, explanation=rule.explanation, action=rule.action)
        panel_indicators.append(
            PanelIndicator(
                id=indicator.id,
                name=indicator.name,
                unit=indicator.unit,
                reading=panel_reading,
                measured_by=indicator.measured_by,  # type: ignore[arg-type]
                cadence_days=indicator.cadence_days,
                due=is_due(indicator, reading, panel_date),
                broken_rule=broken_rule,
            )
        )
    return PanelResponse(date=panel_date, indicators=panel_indicators)


@app.get("/api/crew/{crew_member_id}/indicators/{indicator_id}")
def get_indicator(
    crew_member_id: int,
    indicator_id: str,
    session: DbSession,
    user: CurrentUser,
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date, Query(alias="to")],
) -> IndicatorResponse:
    require_access_to_crew_member(user, crew_member_id)
    require_crew_member(session, crew_member_id)
    indicator = session.get(models.Indicator, indicator_id)
    if indicator is None:
        raise HTTPException(status_code=404, detail=f"Indicator {indicator_id!r} not found")

    rules = get_rules_by_indicator(session).get(indicator_id, [])
    history_start = start_of(from_date)
    # A baseline rule compares each reading with the ones before it, so those are read too
    first_needed = start_of_baseline_window(history_start) if has_baseline_rule(rules) else history_start
    readings = session.scalars(
        select(models.Reading)
        .where(
            models.Reading.crew_member_id == crew_member_id,
            models.Reading.indicator_id == indicator_id,
            models.Reading.taken_at >= first_needed,
            models.Reading.taken_at < start_of_next_day(to_date),
        )
        .order_by(models.Reading.taken_at)
    ).all()

    history = []
    for reading in readings:
        if reading.taken_at < history_start:
            continue
        window_start = start_of_baseline_window(reading.taken_at)
        baseline_values = [
            earlier.value for earlier in readings if window_start <= earlier.taken_at < reading.taken_at
        ]
        broken_rule = find_broken_rule(rules, reading.value, baseline_values)
        history.append(
            HistoryReading(
                taken_at=format_taken_at(reading.taken_at),
                value=reading.value,
                broken_rule_id=broken_rule.id if broken_rule is not None else None,
            )
        )
    return IndicatorResponse(
        indicator=Indicator(
            id=indicator.id,
            name=indicator.name,
            unit=indicator.unit,
            how_to_measure=indicator.how_to_measure,
            why_it_matters=indicator.why_it_matters,
            source=Source.model_validate(indicator.source, from_attributes=True),
        ),
        rules=rules,
        readings=history,
    )


@app.put("/api/crew/{crew_member_id}/checkins/{checkin_date}")
def save_checkin(
    crew_member_id: int, checkin_date: date, checkin: Checkin, session: DbSession, user: CurrentUser
) -> CheckinResponse:
    require_crew_member(session, crew_member_id)
    require_own_crew_member(user, crew_member_id)
    chosen_moods = [mood_id for mood_id in MOOD_IDS if mood_id in checkin.moods]
    taken_at = start_of(checkin_date)
    save_readings(
        session, crew_member_id, taken_at, {mood_id: float(mood_id in chosen_moods) for mood_id in MOOD_IDS}
    )
    # shortcut: changing a past day leaves the counts of the 13 days after it stale, compute them on read to fix it
    window_start = start_of(checkin_date - timedelta(days=MOOD_WINDOW_DAYS - 1))
    day_counts = {
        count_id: float(
            session.scalar(
                select(func.count()).where(
                    models.Reading.crew_member_id == crew_member_id,
                    models.Reading.indicator_id == mood_id,
                    models.Reading.taken_at.between(window_start, taken_at),
                    models.Reading.value == 1,
                )
            )
        )
        for mood_id, count_id in MOOD_DAY_COUNT_IDS.items()
    }
    save_readings(session, crew_member_id, taken_at, day_counts)
    session.commit()
    return CheckinResponse(date=checkin_date, moods=chosen_moods)
