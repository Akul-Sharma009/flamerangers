import pytest

from burncal.core import trend

# Reference values from scipy.stats.kendalltau(year_index, values, method="asymptotic", variant="b")
# (scipy 1.x, run once outside the project; scipy has no continuity correction, so continuity=False here)
# and the median pairwise slope from numpy. S is counted by hand-free brute force in the same run.
CASES = {
    "rising": ([1, 3, 2, 5, 4, 7, 6, 9, 8, 11], 0.8222222222222221, 0.0009350263526396276, 37, 1.0),
    "ties": ([5, 5, 3, 3, 3, 8, 1, 1, 9, 2, 4, 4], -0.09534625892455922, 0.6759180119144397, -6, -0.045454545454545456),
    "falling": ([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], -0.9999999999999999, 5.699411623331836e-05, -45, -1.0),
    "flat_then_step": ([2, 2, 2, 2, 2, 2, 2, 2, 2, 3], 0.4472135954999579, 0.11718508719813799, 9, 0.0),
}


@pytest.mark.parametrize("name", CASES)
def test_matches_scipy_reference(name):
    values, tau, p, s, sen = CASES[name]
    r = trend.mann_kendall(list(range(2003, 2003 + len(values))), values, continuity=False)
    assert r["s"] == s
    assert r["tau"] == pytest.approx(tau, abs=1e-12)
    assert r["p_value"] == pytest.approx(p, rel=1e-9)
    assert r["sen_slope"] == pytest.approx(sen, abs=1e-12)


def test_continuity_correction_textbook_form():
    # z = (S - 1) / sqrt(var) for S > 0; n = 10, no ties: var = 10*9*25/18 = 125
    r = trend.mann_kendall(list(range(2003, 2013)), CASES["rising"][0])
    assert r["z"] == pytest.approx(36 / 125 ** 0.5, rel=1e-12)
    assert r["direction"] == "increasing"


def test_sen_slope_uses_the_real_year_gap():
    years = [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2013]  # 2012 left out
    values = [10, 12, 14, 16, 18, 20, 22, 24, 26, 30]
    r = trend.mann_kendall(years, values)
    assert r["sen_slope"] == pytest.approx(2.0)


def test_all_equal_is_no_trend_not_an_error():
    r = trend.mann_kendall(list(range(2003, 2013)), [4.0] * 10)
    assert (r["s"], r["z"], r["p_value"], r["direction"]) == (0, 0.0, 1.0, "none")


def test_refuses_below_the_minimum():
    assert trend.mann_kendall(list(range(2003, 2003 + trend.MIN_YEARS - 1)), [1.0] * (trend.MIN_YEARS - 1)) is None


def test_years_must_ascend():
    with pytest.raises(ValueError):
        trend.mann_kendall([2003, 2003] + list(range(2005, 2013)), list(range(10)))


def test_annual_series_leaves_out_record_start_and_part_years():
    totals = [{"year": 2002, "total": 5.0, "complete": False}, {"year": 2003, "total": 7.0, "complete": True},
              {"year": 2004, "total": None, "complete": False}, {"year": 2026, "total": 9.0, "complete": False}]
    used, left = trend.annual_series(totals)
    assert used == [(2003, 7.0)]
    assert left == [{"year": 2002, "reason": "record_start"}, {"year": 2004, "reason": "incomplete"},
                    {"year": 2026, "reason": "incomplete"}]
