"""What the seed script loads besides the readings: sources, indicators and rules.

Edit this file to change a text, add an indicator or add a rule. Never write a limit without its source.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    url: str
    citation: str


@dataclass(frozen=True)
class Indicator:
    id: str
    name: str
    unit: str | None
    how_to_measure: str
    why_it_matters: str
    source_id: str


@dataclass(frozen=True)
class Rule:
    indicator_id: str
    title: str
    explanation: str
    action: str
    threshold_source: str
    low: float | None = None
    high: float | None = None


SOURCES = [
    Source(
        id="inspiration4_metabolic_panel",
        name="Inspiration4 metabolic panel (NASA OSDR, OSD-575)",
        url="https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
        citation=(
            'NASA Open Science Data Repository, "SpaceX Inspiration4 Blood Serum Metabolic Panel and '
            'Immune/Cardiac Cytokine Arrays", OSD-575, released 14 May 2024.'
        ),
    ),
    Source(
        id="lifesnaps",
        name="LifeSnaps",
        url="https://doi.org/10.5281/zenodo.7229547",
        citation=(
            'Yfantidou et al., "LifeSnaps, a 4-month multi-modal dataset capturing unobtrusive snapshots '
            'of our lives in the wild", Scientific Data, 2022. https://doi.org/10.1038/s41597-022-01764-x. '
            "Licence CC BY 4.0."
        ),
    ),
]

# REVIEW: how_to_measure and why_it_matters are drafts built from docs/parameters_and_datasets.md.
INDICATORS = [
    Indicator(
        id="glucose",
        name="Blood glucose",
        unit="mg/dL",
        how_to_measure=(
            "With a glucometer or a continuous glucose monitor. A continuous monitor flew on Ax-4 in 2025."
        ),
        why_it_matters=(
            "Glucose is the sugar in your blood. A value outside the normal range can be a sign of "
            "abnormal glucose regulation."
        ),
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="heart_rate",
        name="Heart rate",
        unit="bpm",
        how_to_measure=(
            "With a wearable ECG or a smartwatch, all day. On the ISS, the Bio-Monitor shirt does it."
        ),
        why_it_matters=(
            "How many times your heart beats each minute. A heart rate that stays high at rest can point "
            "to dehydration, infection, stress or a cardiovascular problem."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="resting_heart_rate",
        name="Resting heart rate",
        unit="bpm",
        how_to_measure=(
            "A wrist tracker or smartwatch works it out once a day from your heart rate while you are still. "
            "On the ISS, the Bio-Monitor shirt (CSA) records heart rate."
        ),
        why_it_matters=(
            "Your heart rate when you are at rest. If it stays above your usual value, it can point to "
            "dehydration, infection, stress or a cardiovascular problem."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="very_active_minutes",
        name="Very active minutes",
        unit="min",
        how_to_measure=(
            "A wrist tracker counts the minutes of intense activity each day. On a mission, the exercise "
            "sessions are also logged on the tablet."
        ),
        why_it_matters=(
            "Exercise is the main countermeasure against bone and muscle loss in space. This counts general "
            "intense activity, not only resistance exercise."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="steps",
        name="Steps",
        unit="steps",
        how_to_measure="A wrist tracker counts them each day.",
        why_it_matters=(
            "A simple measure of how much you move each day. In microgravity nobody walks, so on a mission "
            "the exercise log would take its place."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="sleep_duration",
        name="Sleep duration",
        unit="min",
        how_to_measure=(
            "A wrist tracker measures it every night. On the ISS, astronauts wear NASA's Actiwatch for it."
        ),
        why_it_matters=(
            "How long you were asleep, not how long you were in bed. Too little sleep, night after night, "
            "lowers attention and mood."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="sleep_efficiency",
        name="Sleep efficiency",
        unit="%",
        how_to_measure="A wrist tracker measures it every night, together with sleep duration.",
        why_it_matters=(
            "The share of your time in bed that you spent asleep. A low value means broken sleep, even when "
            "you were in bed long enough."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="skin_temperature",
        name="Skin temperature",
        unit="°C",
        how_to_measure=(
            "A wrist tracker measures it during the night. On the ISS, the Bio-Monitor shirt also measures "
            "skin temperature."
        ),
        why_it_matters=(
            "A rise from your usual value, together with symptoms, can be an early sign of infection. Skin "
            "temperature is lower than core body temperature, so compare it only with your own values."
        ),
        source_id="lifesnaps",
    ),
]

# REVIEW: title, explanation and action are drafts built from docs/parameters_and_datasets.md.
RULES = [
    Rule(
        indicator_id="glucose",
        low=65.0,
        high=99.0,
        title="Glucose out of range",
        explanation=(
            "Your blood glucose is outside the normal range of 65 to 99 mg/dL. "
            "This can be a sign of abnormal glucose regulation."
        ),
        action="Ask for a metabolic assessment.",
        threshold_source=(
            "Normal range given for glucose in the Inspiration4 metabolic panel file (NASA OSDR, OSD-575)."
        ),
    ),
]
