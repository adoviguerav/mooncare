from datetime import date, datetime, time, timedelta
from typing import Annotated, get_args

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.orm import Session

from app import models
from app.db import DbSession
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


def find_broken_rule(rules: list[Rule], value: float) -> Rule | None:
    for rule in rules:
        below_low = rule.low is not None and value < rule.low
        above_high = rule.high is not None and value > rule.high
        if below_low or above_high:
            return rule
    return None


app = FastAPI(title="Real Telemetry API")


@app.get("/api/crew")
def get_crew(session: DbSession) -> CrewResponse:
    crew = session.scalars(select(models.CrewMember).order_by(models.CrewMember.id))
    return CrewResponse(crew=[CrewMember(id=member.id, name=member.name) for member in crew])


@app.get("/api/crew/{crew_member_id}/panel")
def get_panel(
    crew_member_id: int, session: DbSession, panel_date: Annotated[date, Query(alias="date")]
) -> PanelResponse:
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
            rule = find_broken_rule(rules_by_indicator.get(indicator.id, []), reading.value)
            if rule is not None:
                broken_rule = BrokenRule(id=rule.id, title=rule.title, explanation=rule.explanation, action=rule.action)
        panel_indicators.append(
            PanelIndicator(
                id=indicator.id,
                name=indicator.name,
                unit=indicator.unit,
                reading=panel_reading,
                broken_rule=broken_rule,
            )
        )
    return PanelResponse(date=panel_date, indicators=panel_indicators)


@app.get("/api/crew/{crew_member_id}/indicators/{indicator_id}")
def get_indicator(
    crew_member_id: int,
    indicator_id: str,
    session: DbSession,
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date, Query(alias="to")],
) -> IndicatorResponse:
    require_crew_member(session, crew_member_id)
    indicator = session.get(models.Indicator, indicator_id)
    if indicator is None:
        raise HTTPException(status_code=404, detail=f"Indicator {indicator_id!r} not found")

    rules = get_rules_by_indicator(session).get(indicator_id, [])
    readings = session.scalars(
        select(models.Reading)
        .where(
            models.Reading.crew_member_id == crew_member_id,
            models.Reading.indicator_id == indicator_id,
            models.Reading.taken_at >= start_of(from_date),
            models.Reading.taken_at < start_of_next_day(to_date),
        )
        .order_by(models.Reading.taken_at)
    )

    history = []
    for reading in readings:
        broken_rule = find_broken_rule(rules, reading.value)
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
    crew_member_id: int, checkin_date: date, checkin: Checkin, session: DbSession
) -> CheckinResponse:
    require_crew_member(session, crew_member_id)
    chosen_moods = [mood_id for mood_id in MOOD_IDS if mood_id in checkin.moods]
    save_moods = insert(models.Reading).values(
        [
            {
                "crew_member_id": crew_member_id,
                "indicator_id": mood_id,
                "taken_at": start_of(checkin_date),
                "value": float(mood_id in chosen_moods),
            }
            for mood_id in MOOD_IDS
        ]
    )
    session.execute(
        save_moods.on_conflict_do_update(
            index_elements=["crew_member_id", "indicator_id", "taken_at"],
            set_={"value": save_moods.excluded.value},
        )
    )
    session.commit()
    return CheckinResponse(date=checkin_date, moods=chosen_moods)
