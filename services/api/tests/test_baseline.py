import pytest

from app.baseline import find_baseline_limit

# Median 50. The distances to it are five 0s, six 1s and four 2s, so their median is 1.
FIFTEEN_VALUES = [50, 51, 49, 50, 52, 48, 50, 51, 49, 50, 52, 48, 50, 51, 49]


def test_the_limit_above_is_the_median_plus_the_deviations_times_the_scaled_median_distance() -> None:
    limit = find_baseline_limit(FIFTEEN_VALUES, "above", 3.0)

    assert limit == pytest.approx(50 + 3 * 1.4826)


def test_the_limit_below_is_the_same_distance_under_the_median() -> None:
    limit = find_baseline_limit(FIFTEEN_VALUES, "below", 3.0)

    assert limit == pytest.approx(50 - 3 * 1.4826)


def test_one_extreme_earlier_reading_does_not_move_the_limit() -> None:
    with_a_spike = [*FIFTEEN_VALUES[:-1], 90]

    assert find_baseline_limit(with_a_spike, "above", 3.0) == pytest.approx(50 + 3 * 1.4826)


def test_there_is_no_limit_with_fewer_than_14_earlier_readings() -> None:
    assert find_baseline_limit(FIFTEEN_VALUES[:13], "above", 3.0) is None
    assert find_baseline_limit(FIFTEEN_VALUES[:14], "above", 3.0) is not None


def test_there_is_no_limit_when_the_earlier_readings_do_not_vary() -> None:
    assert find_baseline_limit([50.0] * 20, "above", 3.0) is None
