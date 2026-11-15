"""What the seed script loads besides the readings: sources, indicators and rules.

Edit this file to change a text, add an indicator or add a rule. Never write a limit without its source.
"""

from dataclasses import dataclass

from app.baseline import BASELINE_MIN_READINGS, BASELINE_WINDOW_DAYS
from app.moods import MOOD_DAY_COUNT_IDS, MOOD_WINDOW_DAYS


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
class Routine:
    """Who takes a measurement and every how many days a new reading is expected."""

    measured_by: str  # sensor, astronaut or computed
    cadence_days: int | None


@dataclass(frozen=True)
class Rule:
    indicator_id: str
    title: str
    explanation: str
    action: str
    threshold_source: str
    low: float | None = None
    high: float | None = None
    baseline_direction: str | None = None
    baseline_deviations: float | None = None


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
        id="inspiration4_blood_count",
        name="Inspiration4 blood count (NASA OSDR, OSD-569)",
        url="https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
        citation=(
            "NASA Open Science Data Repository, study OSD-569, SpaceX Inspiration4 complete blood count "
            "(file LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv)."
        ),
    ),
    Source(
        id="radlab",
        name="RadLab (NASA OSDR)",
        url="https://visualization.osdr.nasa.gov/radlab/",
        citation="NASA Open Science Data Repository, RadLab: readings of the radiation detectors of the ISS.",
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


@dataclass(frozen=True)
class DailyTask:
    id: str
    title: str
    xp: int
    completion: str  # auto_checkin: done when the day has a check-in; auto_sleep: when the tracker recorded sleep


# The daily checklist. XP is game design, not a health measure: it rewards the routine, never a value.
DAILY_TASKS = [
    DailyTask(id="checkin", title="Daily check-in: how you feel", xp=50, completion="auto_checkin"),
    DailyTask(id="tracker_overnight", title="Wear your tracker overnight", xp=30, completion="auto_sleep"),
    DailyTask(id="exercise", title="Resistance exercise session", xp=120, completion="manual"),
    DailyTask(id="meals", title="Log water and meals", xp=40, completion="manual"),
    DailyTask(id="read_alerts", title="Read today’s alerts and what to do", xp=30, completion="manual"),
]

@dataclass(frozen=True)
class HydrationGoal:
    sex: str
    total_water_ml: int  # adequate total water intake a day, from food and drinks
    drinks_share: float  # the part of it that comes from drinks


HYDRATION_SOURCE = (
    "EFSA Panel on Dietetic Products, Nutrition and Allergies (2010). Scientific Opinion on Dietary Reference Values "
    "for water. EFSA Journal 8(3):1459. Adequate total water intake for adults: 2.0 L a day for women and 2.5 L for "
    "men, with 20 to 30% coming from food, so about 75% from drinks. An Earth reference: the flight surgeon sets "
    "space and exercise targets."
)

# The goal of the hydration fountain of the crew app. A reference, not a threshold: it raises no alert.
HYDRATION_GOALS = [
    HydrationGoal(sex="female", total_water_ml=2000, drinks_share=0.75),
    HydrationGoal(sex="male", total_water_ml=2500, drinks_share=0.75),
]


# REVIEW: the mood names are drafts built from the LifeSnaps column names.
MOOD_NAMES = {
    "mood_happy": "Happy",
    "mood_sad": "Sad",
    "mood_tense": "Tense or anxious",
    "mood_alert": "Alert",
    "mood_rested": "Rested or relaxed",
    "mood_neutral": "Neutral",
    "mood_tired": "Tired",
}

# Indicator id, which is also its name, to the normal range of the Inspiration4 metabolic panel file, in mmol/L
ELECTROLYTE_RANGES = {"sodium": (135.0, 146.0), "potassium": (3.5, 5.3), "chloride": (98.0, 110.0)}
HAEMATOLOGY_HOW_TO_MEASURE = "With a portable haematology analyser, from a drop of blood from the finger."
KIDNEY_HOW_TO_MEASURE = "With a portable analyser, from a drop of blood from the finger or a blood sample."

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
    *[
        Indicator(
            id=electrolyte,
            name=f"Blood {electrolyte}",
            unit="mmol/L",
            how_to_measure="With a portable chemistry analyser, from a drop of blood from the finger.",
            why_it_matters=(
                f"{electrolyte.capitalize()} is one of the electrolytes in your blood. A value outside "
                "the normal range is an electrolyte imbalance."
            ),
            source_id="inspiration4_metabolic_panel",
        )
        for electrolyte in ELECTROLYTE_RANGES
    ],
    Indicator(
        id="creatinine",
        name="Creatinine",
        unit="mg/dL",
        how_to_measure=KIDNEY_HOW_TO_MEASURE,
        why_it_matters=(
            "Creatinine is a waste product that your kidneys clear from the blood. A value that rises "
            "against your own baseline can be a sign that the kidneys are working less well."
        ),
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="urea_nitrogen",
        name="Urea nitrogen (BUN)",
        unit="mg/dL",
        how_to_measure=KIDNEY_HOW_TO_MEASURE,
        why_it_matters=(
            "Urea is a waste product that your kidneys clear from the blood. It is followed together with "
            "creatinine to watch kidney function."
        ),
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="egfr",
        name="Kidney filtration rate (eGFR)",
        unit="mL/min/1.73 m²",
        how_to_measure="It is worked out from the creatinine of the same blood test.",
        why_it_matters=(
            "An estimate of how much blood your kidneys filter each minute. A value that falls against "
            "your own baseline can be a sign that the kidneys are working less well."
        ),
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="albumin",
        name="Albumin",
        unit="g/dL",
        how_to_measure="With a portable chemistry analyser, from a blood sample.",
        why_it_matters=(
            "Albumin is the main protein in your blood. An abnormal value can be a sign of a nutritional "
            "deficiency."
        ),
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="calcium",
        name="Blood calcium",
        unit="mg/dL",
        how_to_measure="With a blood test.",
        why_it_matters="The calcium in your blood. A value outside the normal range is worth a second test.",
        source_id="inspiration4_metabolic_panel",
    ),
    Indicator(
        id="white_blood_cells",
        name="White blood cells",
        unit="thousand/µL",
        how_to_measure=HAEMATOLOGY_HOW_TO_MEASURE,
        why_it_matters=(
            "White blood cells are the cells of your immune system. A count outside the normal range can be "
            "a sign of infection or of a weaker immune system."
        ),
        source_id="inspiration4_blood_count",
    ),
    Indicator(
        id="lymphocytes",
        name="Lymphocytes",
        unit="cells/µL",
        how_to_measure=HAEMATOLOGY_HOW_TO_MEASURE,
        why_it_matters=(
            "Lymphocytes are white blood cells of your immune system. A count well below your own baseline "
            "can be a sign of immune suppression."
        ),
        source_id="inspiration4_blood_count",
    ),
    Indicator(
        id="hemoglobin",
        name="Haemoglobin",
        unit="g/dL",
        how_to_measure=HAEMATOLOGY_HOW_TO_MEASURE,
        why_it_matters=(
            "Haemoglobin carries oxygen in your blood. An abnormal value can be a sign of a nutritional "
            "deficiency."
        ),
        source_id="inspiration4_blood_count",
    ),
    *[
        Indicator(
            id=marker_id,
            name=marker_name,
            unit=unit,
            how_to_measure="With a microfluidic analyser, from a blood sample.",
            why_it_matters=(
                "A marker of inflammation. A value above your own baseline is a reason to assess infection, "
                "inflammation and stress. It has no normal range in the data, so compare it with your own "
                "earlier values."
            ),
            source_id="inspiration4_metabolic_panel",
        )
        for marker_id, marker_name, unit in [
            ("il_6", "Interleukin 6 (IL-6)", "pg/mL"),
            ("tnf_alpha", "TNF-α", "pg/mL"),
            # NPQ is the normalised unit of the Alamar panel, not a concentration
            ("il_1_beta", "Interleukin 1β (IL-1β)", "NPQ"),
            ("ifn_gamma", "Interferon γ (IFN-γ)", "NPQ"),
        ]
    ],
    *[
        Indicator(
            id=marker_id,
            name=marker_name,
            unit=unit,
            how_to_measure="With a blood test.",
            why_it_matters=(
                "A blood marker related to inflammation and to the heart and blood vessels. It has no normal "
                "range in the data, so compare it with your own earlier values."
            ),
            source_id="inspiration4_metabolic_panel",
        )
        for marker_id, marker_name, unit in [
            ("crp", "C-reactive protein (CRP)", "mg/L"),
            ("fibrinogen", "Fibrinogen", "ng/mL"),
        ]
    ],
    Indicator(
        id="spo2",
        name="Blood oxygen (SpO2)",
        unit="%",
        how_to_measure=(
            "With a pulse oximeter, or a wrist tracker during the night. On the ISS, the Bio-Monitor shirt measures it."
        ),
        why_it_matters=(
            "How much oxygen your blood carries. A low value, or one that falls from your own baseline, is a reason to repeat it and to assess breathing and circulation."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="breathing_rate",
        name="Breathing rate during sleep",
        unit="breaths/min",
        how_to_measure=(
            "A wearable sensor measures it while you sleep. On the ISS, the Bio-Monitor shirt measures it."
        ),
        why_it_matters=(
            "How many breaths you take each minute while asleep. An abnormal rate, or one with symptoms, is a reason for a respiratory assessment."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="heart_rate_variability",
        name="Heart rate variability",
        unit="ms",
        how_to_measure=(
            "A wrist tracker or an ECG works it out from the time between heartbeats (RMSSD)."
        ),
        why_it_matters=(
            "How much the time between your heartbeats changes. It is a signal of physical stress: follow its trend against your own baseline."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="stress_score",
        name="Stress score of the watch",
        unit="points",
        how_to_measure=(
            "The watch works it out each day, from 1 to 100. It is not a questionnaire."
        ),
        why_it_matters=(
            "A daily score the watch computes from your body signals. Follow its trend against your own baseline."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="sleep_awake_minutes",
        name="Time awake during the night",
        unit="min",
        how_to_measure=(
            "A wrist tracker measures it every night."
        ),
        why_it_matters=(
            "How long you were awake after going to bed. Frequent awakenings mean lower sleep quality."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="vo2_max",
        name="Cardiovascular fitness (VO2 max)",
        unit="mL/kg/min",
        how_to_measure=(
            "Estimated by the watch from heart rate and activity. On a mission it is measured in a standard exercise test."
        ),
        why_it_matters=(
            "How much oxygen your body can use during hard exercise. It falls in microgravity without enough exercise, and a spacewalk needs a minimum."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="anxiety_score",
        name="Anxiety questionnaire (STAI)",
        unit="points",
        how_to_measure=(
            "A questionnaire on the tablet, every few weeks."
        ),
        why_it_matters=(
            "The score of the STAI anxiety questionnaire. A rising score is a reason to ask for confidential psychological support."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="positive_affect",
        name="Positive affect (PANAS)",
        unit="points",
        how_to_measure=(
            "A questionnaire on the tablet, every few weeks."
        ),
        why_it_matters=(
            "The positive score of the PANAS questionnaire: how strongly you felt positive emotions. Follow its trend over time."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="negative_affect",
        name="Negative affect (PANAS)",
        unit="points",
        how_to_measure=(
            "A questionnaire on the tablet, every few weeks."
        ),
        why_it_matters=(
            "The negative score of the PANAS questionnaire: how strongly you felt negative emotions. Follow its trend over time."
        ),
        source_id="lifesnaps",
    ),
    Indicator(
        id="radiation_dose_rate",
        name="Radiation dose rate in the ship",
        unit="µGy/h",
        how_to_measure=(
            "With a radiation detector inside the ship, every 5 minutes (Lidal, in the Columbus module of "
            "the ISS). It is a reading of the ship, the same for the whole crew, not your personal dose."
        ),
        why_it_matters=(
            "How much radiation the ship is receiving. The dose adds up over a mission, so a sustained rise "
            "matters. The value is the mean of the day."
        ),
        source_id="radlab",
    ),
    *[
        Indicator(
            id=mood_id,
            name=mood_name,
            unit=None,
            how_to_measure="In the daily check-in on the tablet.",
            why_it_matters=(
                "One of the moods of the daily check-in. A change in the moods you report over time "
                "can be a sign of a behavioural change. It is not a diagnosis."
            ),
            source_id="lifesnaps",
        )
        for mood_id, mood_name in MOOD_NAMES.items()
    ],
    *[
        Indicator(
            id=count_id,
            name=f"{MOOD_NAMES[mood_id]} days in the last {MOOD_WINDOW_DAYS}",
            unit="days",
            how_to_measure="Counted from your daily check-ins. A day with no check-in counts as not chosen.",
            why_it_matters=(
                "A mood that stays for most of two weeks is worth a conversation. This is a count of your "
                "own check-ins, not a questionnaire and not a diagnosis."
            ),
            source_id="lifesnaps",
        )
        for mood_id, count_id in MOOD_DAY_COUNT_IDS.items()
    ],
]

MOOD_RULE_ACTION = "Bring it up in your next private psychological conference."
MOOD_RULE_LIMITS = (
    "This is an adaptation, not a validated screening: each questionnaire has two questions and the "
    "check-in covers one. To confirm with the medical reviewer."
)

def get_metabolic_panel_range_source(analyte_name: str) -> str:
    return f"Normal range given for {analyte_name} in the Inspiration4 metabolic panel file (NASA OSDR, OSD-575)."


BLOOD_COUNT_RANGE_SOURCE = "Normal range given in the Inspiration4 blood count file (NASA OSDR, OSD-569)."


def get_widest_metabolic_panel_range_source(analyte_name: str) -> str:
    return (
        f"Widest of the normal ranges given for {analyte_name} in the Inspiration4 metabolic panel file "
        "(NASA OSDR, OSD-575). The file gives a different range by astronaut and draw."
    )


# REVIEW: title, explanation and action are drafts built from docs/parameters_and_datasets.md.
# Chosen on the LifeSnaps data of the four crew members: at 3 deviations the five baseline rules together
# alert about once every two weeks per person. At 2.5 it is twice as often.
BASELINE_DEVIATIONS = 3.0


def get_baseline_source(direction: str) -> str:
    return (
        f"Your personal baseline: the median of your own readings of the last {BASELINE_WINDOW_DAYS} days. "
        f"The alert comes when a reading is more than {BASELINE_DEVIATIONS:g} deviations {direction} it, "
        "where a deviation is the median distance of those readings to their median, times 1.4826 "
        f"(the Hampel identifier for outliers). It needs at least {BASELINE_MIN_READINGS} readings. "
        f"The {BASELINE_DEVIATIONS:g} is our choice, not a medical limit."
    )


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
        threshold_source=get_metabolic_panel_range_source("glucose"),
    ),
    Rule(
        indicator_id="resting_heart_rate",
        high=100.0,
        title="Resting heart rate high",
        explanation=(
            "Your resting heart rate is above 100 bpm. At rest, this can point to dehydration, infection, "
            "stress or a cardiovascular problem."
        ),
        action="Check your hydration and how you feel, and ask for a cardiovascular assessment.",
        threshold_source=(
            "American Heart Association definition of tachycardia: a resting heart rate above 100 bpm. "
            "General adult reference on Earth, not a spaceflight limit."
        ),
    ),
    Rule(
        indicator_id="sleep_duration",
        low=420.0,
        title="Short night",
        explanation=(
            "You slept less than 7 hours (420 minutes). Too little sleep, night after night, lowers "
            "attention and mood."
        ),
        action="Adjust your schedule to protect tonight's sleep and review what kept you awake.",
        threshold_source=(
            "American Academy of Sleep Medicine and Sleep Research Society consensus for adults, 2015: "
            "7 or more hours per night. https://doi.org/10.5664/jcsm.4758. General adult reference on "
            "Earth, not a spaceflight limit."
        ),
    ),
    Rule(
        indicator_id="mood_sad_days_14",
        high=7.0,
        title="Sad on most of the last 14 days",
        explanation=(
            "You chose Sad on more than half of the last 14 days. It is not a diagnosis. It is a reason "
            "to talk about it."
        ),
        action=MOOD_RULE_ACTION,
        threshold_source=(
            'PHQ-2 depression screening (Kroenke, Spitzer and Williams, Medical Care, 2003) asks about the '
            'last 2 weeks, and "more than half the days" is the answer that starts to count. '
            + MOOD_RULE_LIMITS
        ),
    ),
    Rule(
        indicator_id="mood_tense_days_14",
        high=7.0,
        title="Tense or anxious on most of the last 14 days",
        explanation=(
            "You chose Tense or anxious on more than half of the last 14 days. It is not a diagnosis. "
            "It is a reason to talk about it."
        ),
        action=MOOD_RULE_ACTION,
        threshold_source=(
            'GAD-2 anxiety screening (Kroenke et al., Annals of Internal Medicine, 2007) asks about the '
            'last 2 weeks, and "more than half the days" is the answer that starts to count. '
            + MOOD_RULE_LIMITS
        ),
    ),
    *[
        Rule(
            indicator_id=electrolyte,
            low=low,
            high=high,
            title=f"{electrolyte.capitalize()} out of range",
            explanation=(
                f"Your blood {electrolyte} is outside the normal range of "
                f"{low:g} to {high:g} mmol/L. This is an electrolyte imbalance."
            ),
            action="Repeat the test and ask for a clinical review.",
            threshold_source=get_metabolic_panel_range_source(electrolyte),
        )
        for electrolyte, (low, high) in ELECTROLYTE_RANGES.items()
    ],
    Rule(
        indicator_id="urea_nitrogen",
        low=7.0,
        high=25.0,
        title="Urea nitrogen out of range",
        explanation=(
            "Your blood urea nitrogen is outside the normal range of 7 to 25 mg/dL. "
            "This can be a sign of a change in kidney function."
        ),
        action="Ask for a renal assessment.",
        threshold_source=get_metabolic_panel_range_source("urea nitrogen (BUN)"),
    ),
    Rule(
        indicator_id="egfr",
        low=60.0,
        title="Kidney filtration rate low",
        explanation=(
            "Your estimated kidney filtration rate (eGFR) is below 60 mL/min/1.73 m². "
            "This can be a sign that the kidneys are working less well."
        ),
        action="Ask for a renal assessment.",
        threshold_source=(
            "Lower limit given for eGFR in the Inspiration4 metabolic panel file (NASA OSDR, OSD-575). "
            "The file gives no upper limit."
        ),
    ),
    Rule(
        indicator_id="albumin",
        low=3.6,
        high=5.1,
        title="Albumin out of range",
        explanation=(
            "Your blood albumin is outside the normal range of 3.6 to 5.1 g/dL. "
            "This can be a sign of a nutritional deficiency."
        ),
        action="Ask for a targeted nutritional assessment.",
        threshold_source=get_metabolic_panel_range_source("albumin"),
    ),
    # The file gives creatinine and calcium a different range by astronaut and draw, and a rule holds one
    # range for the whole crew: these two take the widest, from the lowest minimum to the highest maximum.
    Rule(
        indicator_id="creatinine",
        low=0.5,
        high=1.35,
        title="Creatinine out of range",
        explanation=(
            "Your creatinine is outside the normal range of 0.5 to 1.35 mg/dL. "
            "This can be a sign of a change in kidney function."
        ),
        action="Ask for a renal assessment.",
        threshold_source=get_widest_metabolic_panel_range_source("creatinine"),
    ),
    Rule(
        indicator_id="calcium",
        low=8.6,
        high=10.4,
        title="Calcium out of range",
        explanation="Your blood calcium is outside the normal range of 8.6 to 10.4 mg/dL.",
        action="Repeat the test and ask for a clinical review.",
        threshold_source=get_widest_metabolic_panel_range_source("calcium"),
    ),
    Rule(
        indicator_id="white_blood_cells",
        low=3.8,
        high=10.8,
        title="White blood cells out of range",
        explanation=(
            "Your white blood cell count is outside the normal range of 3.8 to 10.8 thousand/µL. "
            "This can be a sign of infection or of a weaker immune system."
        ),
        action="Repeat the test and ask for a clinical review.",
        threshold_source=BLOOD_COUNT_RANGE_SOURCE,
    ),
    Rule(
        indicator_id="lymphocytes",
        low=850.0,
        high=3900.0,
        title="Lymphocytes out of range",
        explanation=(
            "Your lymphocyte count is outside the normal range of 850 to 3900 cells/µL. "
            "A low count can be a sign of immune suppression."
        ),
        action="Repeat the test.",
        threshold_source=BLOOD_COUNT_RANGE_SOURCE,
    ),
    Rule(
        indicator_id="hemoglobin",
        low=11.7,
        high=17.1,
        title="Haemoglobin out of range",
        explanation=(
            "Your haemoglobin is outside the normal range of 11.7 to 17.1 g/dL. "
            "This can be a sign of a nutritional deficiency."
        ),
        action="Ask for a targeted nutritional assessment.",
        threshold_source=(
            "Widest of the normal ranges given for haemoglobin in the Inspiration4 blood count file "
            "(NASA OSDR, OSD-569). The file gives a different range by astronaut and draw."
        ),
    ),
    Rule(
        indicator_id="vo2_max",
        low=32.9,
        title="Cardiovascular fitness below the NASA limit",
        explanation=(
            "Your VO2 max is below 32.9 mL/kg/min, the minimum NASA sets during a mission with spacewalks "
            "in microgravity."
        ),
        action="Review your exercise plan and your tolerance to effort.",
        threshold_source=(
            "NASA-STD-3001, Volume 1, requirement V1 4001: in-mission VO2 max at or above 32.9 mL/kg/min. "
            "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf. "
            "The value shown is an estimate by the watch, not an exercise test."
        ),
    ),
    Rule(
        indicator_id="resting_heart_rate",
        baseline_direction="above",
        baseline_deviations=BASELINE_DEVIATIONS,
        title="Resting heart rate above your usual",
        explanation=(
            "Your resting heart rate is well above your own usual value of the last 4 weeks. "
            "A rise like this can point to dehydration, infection, stress or a cardiovascular problem, "
            "even when the value is normal for other people."
        ),
        action="Check your hydration and how you feel, and measure it again tomorrow.",
        threshold_source=get_baseline_source("above"),
    ),
    Rule(
        indicator_id="skin_temperature",
        baseline_direction="above",
        baseline_deviations=BASELINE_DEVIATIONS,
        title="Skin temperature above your usual",
        explanation=(
            "Your skin temperature during the night is well above your own usual value of the last 4 weeks. "
            "Together with symptoms, this can be an early sign of infection."
        ),
        action="Check how you feel. If you have symptoms, start the infection assessment.",
        threshold_source=get_baseline_source("above"),
    ),
    Rule(
        indicator_id="heart_rate_variability",
        baseline_direction="below",
        baseline_deviations=BASELINE_DEVIATIONS,
        title="Heart rate variability below your usual",
        explanation=(
            "Your heart rate variability is well below your own usual value of the last 4 weeks. "
            "A drop like this is a sign of physical stress: poor sleep, a hard effort or the start of an illness."
        ),
        action="Protect tonight's sleep, lower today's effort if you can, and watch how it goes tomorrow.",
        threshold_source=get_baseline_source("below"),
    ),
    Rule(
        indicator_id="spo2",
        baseline_direction="below",
        baseline_deviations=BASELINE_DEVIATIONS,
        title="Blood oxygen below your usual",
        explanation=(
            "Your blood oxygen is well below your own usual value of the last 4 weeks. "
            "A fall from your baseline is a reason to look at breathing and circulation."
        ),
        action="Repeat the measurement. If it stays low, ask for a respiratory and cardiovascular assessment.",
        threshold_source=get_baseline_source("below"),
    ),
    Rule(
        indicator_id="stress_score",
        baseline_direction="below",
        baseline_deviations=BASELINE_DEVIATIONS,
        title="Stress score below your usual",
        explanation=(
            "Your stress score is well below your own usual value of the last 4 weeks. "
            "On this score a lower number means more signs of physical stress."
        ),
        action="Use a stress management routine today and check the score again tomorrow.",
        threshold_source=get_baseline_source("below"),
    ),
]


# --- Measurement routines (docs/parameters_and_datasets.md, "How often each parameter is measured") ---

QUESTIONNAIRE_IDS = {"anxiety_score", "positive_affect", "negative_affect"}
BLOOD_SOURCE_IDS = {"inspiration4_metabolic_panel", "inspiration4_blood_count"}
DAILY = 1
# ASTRA-HEALTH says "weekly or periodically". In LifeSnaps the answers come every 7 to 14 days.
QUESTIONNAIRE_CADENCE_DAYS = 14
# ASTRA-HEALTH says "periodically" and gives no interval. This is the cadence of the periodic health exam of
# the ISS (NASA, 2006, https://ntrs.nasa.gov/api/citations/20060051792/downloads/20060051792.pdf).
BLOOD_TEST_CADENCE_DAYS = 30


def get_routine(indicator: Indicator) -> Routine:
    if indicator.id in MOOD_DAY_COUNT_IDS.values():
        return Routine("computed", None)
    if indicator.id in MOOD_NAMES:
        return Routine("astronaut", DAILY)
    if indicator.id in QUESTIONNAIRE_IDS:
        return Routine("astronaut", QUESTIONNAIRE_CADENCE_DAYS)
    if indicator.source_id in BLOOD_SOURCE_IDS:
        return Routine("astronaut", BLOOD_TEST_CADENCE_DAYS)
    # The wearable and the detectors of the ship measure on their own, at least once a day
    return Routine("sensor", DAILY)
