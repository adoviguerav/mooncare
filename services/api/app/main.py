import sqlite3
from datetime import date
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query

from app.db import Connection
from app.schemas import (
    BrokenRule,
    CrewMember,
    CrewResponse,
    HistoryReading,
    Indicator,
    IndicatorResponse,
    PanelIndicator,
    PanelReading,
    PanelResponse,
    Rule,
    Source,
)

END_OF_DAY = "T23:59"


def require_crew_member(connection: sqlite3.Connection, crew_member_id: int) -> None:
    row = connection.execute("SELECT 1 FROM crew_member WHERE id = ?", (crew_member_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Crew member {crew_member_id} not found")


def get_rules_by_indicator(connection: sqlite3.Connection) -> dict[str, list[Rule]]:
    rules_by_indicator: dict[str, list[Rule]] = {}
    for row in connection.execute("SELECT * FROM rule ORDER BY id"):
        rules_by_indicator.setdefault(row["indicator_id"], []).append(Rule.model_validate(dict(row)))
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
def get_crew(connection: Connection) -> CrewResponse:
    rows = connection.execute("SELECT id, name FROM crew_member ORDER BY id").fetchall()
    return CrewResponse(crew=[CrewMember.model_validate(dict(row)) for row in rows])


@app.get("/api/crew/{crew_member_id}/panel")
def get_panel(
    crew_member_id: int, connection: Connection, panel_date: Annotated[date, Query(alias="date")]
) -> PanelResponse:
    require_crew_member(connection, crew_member_id)
    rules_by_indicator = get_rules_by_indicator(connection)
    rows = connection.execute(
        """
        SELECT indicator.id, indicator.name, indicator.unit, reading.taken_at, reading.value
        FROM indicator
        LEFT JOIN reading
          ON reading.indicator_id = indicator.id
         AND reading.crew_member_id = :crew_member_id
         AND reading.taken_at = (
               SELECT MAX(taken_at) FROM reading
               WHERE indicator_id = indicator.id
                 AND crew_member_id = :crew_member_id
                 AND taken_at <= :end_of_day
             )
        ORDER BY indicator.rowid
        """,
        {"crew_member_id": crew_member_id, "end_of_day": panel_date.isoformat() + END_OF_DAY},
    ).fetchall()

    indicators = []
    for row in rows:
        reading = None
        broken_rule = None
        if row["taken_at"] is not None:
            reading = PanelReading(taken_at=row["taken_at"], value=row["value"])
            rule = find_broken_rule(rules_by_indicator.get(row["id"], []), row["value"])
            if rule is not None:
                broken_rule = BrokenRule(
                    id=rule.id, title=rule.title, explanation=rule.explanation, action=rule.action
                )
        indicators.append(
            PanelIndicator(
                id=row["id"], name=row["name"], unit=row["unit"], reading=reading, broken_rule=broken_rule
            )
        )
    return PanelResponse(date=panel_date, indicators=indicators)


@app.get("/api/crew/{crew_member_id}/indicators/{indicator_id}")
def get_indicator(
    crew_member_id: int,
    indicator_id: str,
    connection: Connection,
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date, Query(alias="to")],
) -> IndicatorResponse:
    require_crew_member(connection, crew_member_id)
    indicator_row = connection.execute(
        """
        SELECT indicator.id, indicator.name, indicator.unit, indicator.how_to_measure,
               indicator.why_it_matters, source.id AS source_id, source.name AS source_name,
               source.url AS source_url, source.citation AS source_citation
        FROM indicator JOIN source ON source.id = indicator.source_id
        WHERE indicator.id = ?
        """,
        (indicator_id,),
    ).fetchone()
    if indicator_row is None:
        raise HTTPException(status_code=404, detail=f"Indicator {indicator_id!r} not found")

    rules = get_rules_by_indicator(connection).get(indicator_id, [])
    reading_rows = connection.execute(
        """
        SELECT taken_at, value FROM reading
        WHERE crew_member_id = ? AND indicator_id = ? AND taken_at >= ? AND taken_at <= ?
        ORDER BY taken_at
        """,
        (crew_member_id, indicator_id, from_date.isoformat(), to_date.isoformat() + END_OF_DAY),
    ).fetchall()

    readings = []
    for row in reading_rows:
        broken_rule = find_broken_rule(rules, row["value"])
        readings.append(
            HistoryReading(
                taken_at=row["taken_at"],
                value=row["value"],
                broken_rule_id=broken_rule.id if broken_rule is not None else None,
            )
        )
    return IndicatorResponse(
        indicator=Indicator(
            id=indicator_row["id"],
            name=indicator_row["name"],
            unit=indicator_row["unit"],
            how_to_measure=indicator_row["how_to_measure"],
            why_it_matters=indicator_row["why_it_matters"],
            source=Source(
                id=indicator_row["source_id"],
                name=indicator_row["source_name"],
                url=indicator_row["source_url"],
                citation=indicator_row["source_citation"],
            ),
        ),
        rules=rules,
        readings=readings,
    )
