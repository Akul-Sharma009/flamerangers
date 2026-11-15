"""Story 7.3: the seasonal profile. Criterion 3 (test plan): peak month = the month with the highest count;
season length = the months whose count is at least 10% of the annual count."""
from burncal.core import season, stats

REF = (2003, 2005)


def test_7_3_peak_and_season_length_follow_criterion_3():
    counts = [0, 0, 5, 40, 100, 30, 10, 5, 0, 0, 0, 10]  # annual 200; 10% = 20
    m = season.season_marks(counts)
    assert m["peak_month"] == 5
    assert m["season_months"] == [4, 5, 6]
    assert m["season_length"] == 3


def test_7_3_the_share_is_at_or_above_ten_percent():
    counts = [10, 90] + [0] * 10  # January holds exactly 10%
    assert season.season_marks(counts)["season_months"] == [1, 2]


def test_7_3_a_tie_for_the_peak_goes_to_the_earlier_month():
    assert season.season_marks([0, 7, 0, 7] + [0] * 8)["peak_month"] == 2


def test_7_3_no_activity_or_missing_months_give_no_peak():
    for counts in ([0] * 12, [None] + [1] * 11):
        assert season.season_marks(counts) == {"peak_month": None, "season_length": None, "season_months": []}


def _series():
    s = {}
    for y, bump in ((2002, 99), (2003, 1), (2004, 2), (2005, 3), (2006, 4)):
        for m in range(1, 13):
            s[(y, m)] = float(10 * bump if m == 9 else bump)
    return s


def test_7_3_median_and_range_use_the_complete_reference_months_only():
    s = _series()
    complete = set(s) - {(2004, 9)}
    p = season.profile(s, complete, REF, range(2002, 2007))["typical"]
    sep = p["months"][8]
    assert (sep["median"], sep["low"], sep["high"], sep["years_counted"]) == (20.0, 10.0, 30.0, 2)
    assert p["months"][0]["median"] == 2.0 and p["months"][0]["years_counted"] == 3
    assert p["peak_month"] == 9


def test_7_3_the_median_is_the_one_stats_computes():
    s = _series()
    complete = set(s)
    p = season.profile(s, complete, REF, range(2002, 2007))["typical"]
    ref = stats.reference(s, complete, REF)
    assert [m["median"] for m in p["months"]] == [ref[m][0] for m in range(1, 13)]


def test_7_3_a_year_outside_the_record_is_blank_not_zero_and_has_no_marks():
    s = {(2005, m): 1.0 for m in range(7, 13)}
    y = season.profile(s, set(s), REF, [2005])["years"][0]
    assert y["counts"][:6] == [None] * 6 and y["counts"][6] == 1.0
    assert y["peak_month"] is None and y["season_length"] is None and y["complete"] is False


def test_7_3_a_month_with_no_reference_data_has_no_median():
    p = season.profile({}, set(), REF, [2005])["typical"]
    assert p["months"][0] == {"calendar_month": 1, "median": None, "low": None, "high": None, "years_counted": 0}
    assert p["peak_month"] is None
