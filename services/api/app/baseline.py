"""Personal baseline: a reading is compared with the recent readings of the same person."""

from collections.abc import Sequence
from statistics import median
from typing import Literal

BaselineDirection = Literal["above", "below"]

BASELINE_WINDOW_DAYS = 28
BASELINE_MIN_READINGS = 14
# Turns a median distance to the median into a standard deviation, for values that follow a normal curve
MEDIAN_DISTANCE_TO_STANDARD_DEVIATION = 1.4826


def find_baseline_limit(
    earlier_values: Sequence[float], direction: BaselineDirection, deviations: float
) -> float | None:
    """The personal limit, or None when the earlier readings are too few or do not vary."""
    if len(earlier_values) < BASELINE_MIN_READINGS:
        return None
    usual_value = median(earlier_values)
    # Median and median distance, not mean and standard deviation: one extreme day does not move them
    deviation = MEDIAN_DISTANCE_TO_STANDARD_DEVIATION * median(abs(value - usual_value) for value in earlier_values)
    if deviation == 0:
        return None
    distance = deviations * deviation
    return usual_value + distance if direction == "above" else usual_value - distance
