"""Story 8.5: the trend answer on synthetic annual totals."""
from burncal.service import answers


def totals(values, first=2003, complete=True):
    return [{"year": first + i, "total": v, "complete": complete, "rank": None, "share_of_max": None}
            for i, v in enumerate(values)]


def test_rising_series_names_direction_and_switch():
    rows = [{"year": 2002, "total": 9.0, "complete": False, "rank": None, "share_of_max": None}] + totals(
        [float(10 * i) for i in range(24)])
    rows.append({"year": 2027, "total": 3.0, "complete": False, "rank": None, "share_of_max": None})
    t = answers.trend(rows)
    assert t["status"] == "ok" and t["test"] == "mann_kendall" and t["direction"] == "increasing"
    assert t["years"] == {"start": 2003, "end": 2026, "count": 24}
    assert t["sen_slope_per_year"] == 10.0 and t["tau"] == 1.0 and t["p_value"] == 0.0
    assert t["record_switch_inside"] is True
    assert t["left_out"] == [{"year": 2002, "reason": "record_start"}, {"year": 2027, "reason": "incomplete"}]


def test_too_few_years_is_refused_with_null_figures_not_zeros():
    t = answers.trend(totals([1.0] * 9))
    assert t["status"] == "too_few_years" and t["min_years"] == 10
    assert all(t[k] is None for k in ("s", "z", "p_value", "tau", "sen_slope_per_year", "direction"))


def test_range_before_the_switch_has_no_switch_inside():
    assert answers.trend(totals([float(i) for i in range(12)], first=2003))["record_switch_inside"] is False


def test_empty_range():
    t = answers.trend([])
    assert t["status"] == "too_few_years" and t["years"] is None and t["record_switch_inside"] is False
