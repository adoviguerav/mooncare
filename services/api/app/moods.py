"""The mood rule: how many of the last 14 days a mood was chosen (docs/plan.md, Mood rule)."""

MOOD_WINDOW_DAYS = 14

# Mood indicator to the indicator that holds its count of days. The limit is in the rules of seed_content.py.
MOOD_DAY_COUNT_IDS = {
    "mood_sad": "mood_sad_days_14",
    "mood_tense": "mood_tense_days_14",
}
