"""Story 8.3: the limits of a requested reference period, and the statistics following it."""
from datetime import date

import pytest

from burncal.core import record, stats

DT = date(2026, 11, 13)


@pytest.mark.parametrize("span,why", [
    ((2003, 2025), None),           # the default period itself
    ((2003, 2011), None),           # the flag years
    ((2021, 2025), None),           # exactly the minimum length
    ((2003, 2007), None),
    ((2022, 2025), "too_short"),    # four years
    ((2010, 2010), "too_short"),
    ((2002, 2010), "outside"),      # 2002 is not a complete year (the record starts in July)
    ((2020, 2026), "outside"),      # 2026 is the current year, not complete
    ((2011, 2003), "order"),
])
def test_8_3_limits(span, why):
    assert record.reference_period_problem(*span, data_through=DT) == why


def test_8_3_the_last_year_follows_data_through():
    assert record.reference_period_problem(2021, 2025, data_through=date(2026, 1, 1)) is None
    assert record.reference_period_problem(2021, 2025, data_through=date(2025, 12, 31)) == "outside"


def test_8_3_the_minimum_is_five_years():
    assert record.REFERENCE_MIN_YEARS == 5


def test_8_3_the_median_and_mean_use_only_the_period_given():
    s = {(y, 1): float(y - 2000) for y in range(2003, 2026)}
    complete = set(s)
    assert stats.reference(s, complete, (2003, 2007))[1] == (5.0, 5.0)
    assert stats.reference(s, complete, (2021, 2025))[1] == (23.0, 23.0)
