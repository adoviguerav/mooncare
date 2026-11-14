from datetime import date
from typing import Literal

from pydantic import BaseModel


class CrewMember(BaseModel):
    id: int
    name: str


class CrewResponse(BaseModel):
    crew: list[CrewMember]


class PanelReading(BaseModel):
    taken_at: str
    value: float


class BrokenRule(BaseModel):
    id: int
    title: str
    explanation: str
    action: str


class PanelIndicator(BaseModel):
    id: str
    name: str
    unit: str | None
    reading: PanelReading | None
    broken_rule: BrokenRule | None


class PanelResponse(BaseModel):
    date: date
    indicators: list[PanelIndicator]


class Source(BaseModel):
    id: str
    name: str
    url: str
    citation: str


class Indicator(BaseModel):
    id: str
    name: str
    unit: str | None
    how_to_measure: str
    why_it_matters: str
    source: Source


class Rule(BaseModel):
    id: int
    low: float | None
    high: float | None
    title: str
    explanation: str
    action: str
    threshold_source: str


class HistoryReading(BaseModel):
    taken_at: str
    value: float
    broken_rule_id: int | None


class IndicatorResponse(BaseModel):
    indicator: Indicator
    rules: list[Rule]
    readings: list[HistoryReading]


MoodId = Literal["mood_happy", "mood_sad", "mood_tense", "mood_alert", "mood_rested", "mood_neutral"]


class Checkin(BaseModel):
    moods: list[MoodId]


class CheckinResponse(BaseModel):
    date: date
    moods: list[MoodId]
