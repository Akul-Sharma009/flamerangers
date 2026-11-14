"""Story 2.3 AC4 helpers for the tuning-year comparison (synthetic data)."""
import numpy as np
import pandas as pd

from burncal.pipeline import compare_tuning as ct


def _rows(lon, lat, when):
    return pd.DataFrame({"longitude": lon, "latitude": lat,
                         "acq_datetime_utc": pd.to_datetime(when, utc=True)})


def test_2_3_ac4_cell_and_month_follow_the_harness_rule():
    df = _rows([95.0, 95.9999, 96.0, -0.5], [2.0, 2.5, 2.0, -0.0000000001],
               ["2014-01-31 23:59", "2014-02-01 00:00", "2014-02-01 12:00", "2014-02-01 12:00"])
    c = ct.monthly_counts(df)
    got = {(r.lon_sw, r.lat_sw, r.year, r.month): r["count"] for _, r in c.iterrows()}
    assert got[(95.0, 2.0, 2014, 1)] == 1 and got[(95.0, 2.0, 2014, 2)] == 1
    assert got[(96.0, 2.0, 2014, 2)] == 1
    assert got[(-1.0, 0.0, 2014, 2)] == 1  # lat -1e-10 floors to 0 because of the + 1e-9


def test_2_3_ac4_missing_cell_months_count_as_zero_on_both_sides():
    ours = pd.DataFrame({"lon_sw": [1.0, 2.0], "lat_sw": [0.0, 0.0], "year": [2014] * 2, "month": [1, 1], "count": [3, 4]})
    target = pd.DataFrame({"lon_sw": [1.0, 3.0], "lat_sw": [0.0, 0.0], "year": [2014] * 2, "month": [1, 1], "aqua_count": [3.0, 5.0]})
    c = ct.compare_counts(ours, target)
    assert len(c) == 3
    assert dict(zip(c["lon_sw"], c["diff"])) == {1.0: 0, 2.0: 4, 3.0: -5}
    s = ct.summarize(c)
    assert (s["cell_months_differ"], s["total_abs_diff"], s["net_diff"]) == (2, 9, -1)
    assert s["largest"].iloc[0]["lon_sw"] == 3.0


def test_2_3_ac4_identical_counts_report_no_difference():
    t = pd.DataFrame({"lon_sw": [1.0], "lat_sw": [1.0], "year": [2016], "month": [5], "aqua_count": [7.0]})
    o = pd.DataFrame({"lon_sw": [1.0], "lat_sw": [1.0], "year": [2016], "month": [5], "count": [7]})
    s = ct.summarize(ct.compare_counts(o, t))
    assert s["cell_months_differ"] == 0 and len(s["largest"]) == 0


def test_2_3_ac4_cause_of_names_the_static_mask_difference():
    in_reg = [True, True, True, False, True]
    ex_h = ["none", "none", "static", "none", "none"]
    ex_p = ["static", "none", "none", "static", "none"]
    got = ct.cause_of(in_reg, ex_h, ex_p)
    assert list(got) == ["static_p_only", "same", "static_h_only", "same", "same"]


def test_2_3_ac4_cause_table_lists_rows_per_cause_and_leftover():
    rows = _rows([95.5, 95.5, 96.5], [2.5, 2.5, 2.5], ["2014-01-05 05:00"] * 3)
    cause = np.array(["static_p_only", "same", "static_h_only"], dtype=object)
    key = {"lon_sw": [95.0, 96.0], "lat_sw": [2.0, 2.0], "year": [2014, 2014], "month": [1, 1]}
    cmp_p = pd.DataFrame({**key, "ours": [1, 1], "target": [2, 0], "diff": [-1, 1]})
    cmp_h = pd.DataFrame({**key, "ours": [2, 0], "target": [2, 0], "diff": [0, 0]})
    t = ct.cause_table(cmp_p, rows, cause, cmp_h)
    assert list(t["static_p_only"]) == [1, 0] and list(t["static_h_only"]) == [0, 1]
    assert list(t["h_diff"]) == [0, 0]


def test_2_3_ac4_static_years_and_reason():
    days = pd.date_range("2015-01-01", periods=50, tz="UTC")
    df = _rows([100.0] * 50, [1.0] * 50, days)
    cell = int(ct.core.static_cell_id([100.0], [1.0])[0])
    assert ct.static_years(df, [cell]) == {cell: [2015]}
    assert ct.static_years(df.iloc[:49], [cell]) == {cell: []}
    assert "outside the tuning years" in ct.why_static_in_p([2015], [2015])
    assert "NOAA-20" in ct.why_static_in_p([2015], [])
    assert "NOAA-20" in ct.why_static_in_p([2014], [])
    assert ct.why_static_in_p([], []) == "other"


def test_2_3_ac4_counted_keeps_only_in_region_none_rows():
    df = _rows([1.0, 2.0, 3.0], [1.0] * 3, ["2014-01-01"] * 3)
    got = ct.counted(df, [True, True, False], ["none", "static", "none"])
    assert list(got["longitude"]) == [1.0]
