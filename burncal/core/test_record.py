"""Story 2.4: which rows feed the record, their weights, and where the record starts."""
from datetime import date

import numpy as np
import pandas as pd
import pytest

from burncal.core import record


def _d(*s):
    return np.array([date.fromisoformat(x) for x in s], dtype=object)


def test_2_4_ac1_aqua_feeds_through_2021_and_viirs_from_2022():
    sat = np.array(["AQUA", "AQUA", "SNPP", "SNPP", "TERRA", "NOAA21", "NOAA20"], object)
    day = _d("2021-12-31", "2022-01-01", "2021-12-31", "2022-01-01", "2010-05-05", "2024-01-01", "2024-01-01")
    assert list(record.feeds_record(sat, day)) == [True, False, False, True, False, False, False]


def test_2_4_ac2_one_viirs_satellite_per_day_around_2_november_2026():
    sat = np.array(["SNPP", "SNPP", "NOAA20", "NOAA20", "NOAA21", "NOAA21"], object)
    day = _d("2026-11-02", "2026-11-03", "2026-11-02", "2026-11-03", "2026-11-02", "2026-11-03")
    assert list(record.feeds_record(sat, day)) == [True, False, False, True, False, False]
    assert list(record.validated_satellite(sat, day)) == [True, True, True, False, True, True]


def test_2_4_ac1_weights_one_c1_or_zero():
    sat = np.array(["AQUA", "AQUA", "SNPP", "SNPP", "TERRA", "SNPP", "AQUA"], object)
    day = _d("2015-01-01", "2023-01-01", "2023-01-01", "2015-01-01", "2015-01-01", "2023-01-01", "2015-01-01")
    excl = np.array(["none", "none", "none", "none", "none", "static", "offshore"], object)
    c1w = np.array([9.0, 9.0, 0.37, 9.0, 9.0, 9.0, 9.0])  # C1 weight given for every row; only feeding VIIRS uses it
    got = record.weights(sat, day, excl, c1w)
    assert list(got) == [1.0, 0.0, 0.37, 0.0, 0.0, 0.0, 0.0]


def test_2_4_ac1_viirs_weight_must_be_given_for_feeding_viirs_rows():
    with pytest.raises(ValueError, match="C1 weight"):
        record.weights(np.array(["SNPP"], object), _d("2023-01-01"), np.array(["none"], object), np.array([np.nan]))


def test_2_4_ac4_months_before_july_2002_are_null_and_july_2002_is_partial():
    assert record.month_state(2002, 6, data_through=date(2026, 11, 14)) == ("null", "outside_record")
    assert record.month_state(1999, 1, data_through=date(2026, 11, 14)) == ("null", "outside_record")
    assert record.month_state(2002, 7, data_through=date(2026, 11, 14)) == ("partial", "record_start")
    assert record.month_state(2002, 8, data_through=date(2026, 11, 14)) == ("complete", None)
    assert record.RECORD_START == date(2002, 7, 4)


def test_2_4_ac4_months_after_data_through_are_null_and_its_month_partial():
    assert record.month_state(2026, 11, data_through=date(2026, 11, 14)) == ("partial", "data_through")
    assert record.month_state(2026, 12, data_through=date(2026, 11, 14)) == ("null", "outside_record")
    assert record.month_state(2026, 10, data_through=date(2026, 10, 31)) == ("complete", None)


def test_2_6_ac2_now_comes_from_data_through():
    got = record.meta_dates(date(2026, 11, 13))
    assert got == {"current_month": "2026-11", "data_through_day": 13,
                   "reference_period": {"start_year": 2003, "end_year": 2025}}
    assert record.meta_dates(date(2026, 1, 1))["reference_period"] == {"start_year": 2003, "end_year": 2025}


def test_2_6_ac3_partial_reasons():
    dt = date(2026, 11, 13)
    assert record.partial_reasons(2002, 7, data_through=dt, missing_days=False, start=date(2002, 7, 1), end=dt) == ["record_start"]
    assert record.partial_reasons(2026, 11, data_through=dt, missing_days=False, start=date(2002, 7, 1), end=dt) == ["data_through"]
    assert record.partial_reasons(2024, 3, data_through=dt, missing_days=True, start=date(2024, 3, 5), end=dt) == ["missing_days", "range_cut"]
    assert record.partial_reasons(2024, 3, data_through=dt, missing_days=False, start=date(2024, 1, 1), end=date(2024, 3, 31)) == []
    assert record.partial_reasons(2001, 3, data_through=dt, missing_days=False, start=date(2001, 1, 1), end=dt) == []
