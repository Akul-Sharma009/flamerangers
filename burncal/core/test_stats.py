"""Story 3.1: statistics for the calendar (pure core). Values are unrounded; the service rounds."""
import pytest

from burncal.core import stats

REF = (2003, 2005)


def _series():
    # January: 10, 20, 30 in 2003-2005 and 2002 (outside reference); 2004-02 incomplete
    s = {(2002, 1): 99.0, (2003, 1): 10.0, (2004, 1): 20.0, (2005, 1): 30.0, (2006, 1): 40.0,
         (2003, 2): 0.0, (2004, 2): 5.0, (2005, 2): 0.0, (2006, 2): 7.0}
    complete = set(s) - {(2004, 2)}
    return s, complete


def test_3_1_ac1_reference_median_and_mean_over_complete_reference_years():
    s, complete = _series()
    ref = stats.reference(s, complete, REF)
    assert ref[1] == (20.0, 20.0)
    assert ref[2] == (0.0, 0.0)  # 2004-02 is not complete: left out
    assert ref[3] == (None, None)


def test_3_1_ac1_anomaly_count_and_percentage():
    got = stats.compare(40.0, 20.0, 25.0)
    assert got == {"ratio_to_median": 2.0, "anomaly_count": 15.0, "anomaly_pct": 60.0, "no_typical_activity": False}


def test_3_1_ac3_zero_median_gives_no_ratio_and_says_so():
    got = stats.compare(7.0, 0.0, 0.0)
    assert got["ratio_to_median"] is None and got["no_typical_activity"] is True and got["anomaly_pct"] is None
    assert got["anomaly_count"] == 7.0


def test_3_1_ac1_ranks_show_ties_as_ties():
    assert stats.competition_ranks([5.0, 9.0, 5.0, 1.0]) == [2, 1, 2, 4]
    # ties are judged on the shown value (1 decimal)
    assert stats.competition_ranks([5.04, 5.0, 4.96]) == [1, 1, 1]


def test_3_1_ac1_colour_breaks_and_classes():
    vals = [0.0] * 5 + [float(v) for v in range(1, 101)]
    b = stats.colour_breaks(vals)
    assert b[:2] == [0, 1] and b == sorted(set(b)) and len(b) == 7
    assert stats.class_index(0.0, b) == 0 and stats.class_index(0.4, b) == 0 and stats.class_index(1.0, b) == 1
    assert stats.class_index(1e9, b) == len(b) - 1 and stats.class_index(None, b) is None
    assert stats.colour_breaks([0.0, 0.0]) == [0, 1]
    assert stats.class_index(-60.0, stats.ANOMALY_BREAKS) == 0 and stats.class_index(0.0, stats.ANOMALY_BREAKS) == 2


def test_3_1_ac1_and_ac2_summary_ranks_tops_busiest_and_totals():
    months = [(y, m) for y in range(2003, 2007) for m in range(1, 13)]
    s = {t: float((t[0] - 2000) * t[1]) for t in months}
    s[(2005, 12)] = s[(2006, 12)]  # a tie
    complete = set(months) - {(2006, 12)}  # say, the current month
    out = stats.summarize(s, complete, months, in_range=set(months), reference_years=REF)
    ranks = out["month_rank"]
    assert (2006, 12) not in ranks  # not complete: not ranked
    assert ranks[(2005, 12)] == 1 and ranks[(2006, 11)] == 2
    assert [t["month"] for t in out["top_months"]][:2] == [(2005, 12), (2006, 11)]
    years = {y["year"]: y for y in out["year_totals"]}
    assert years[2006]["complete"] is False and years[2006]["rank"] is None
    assert years[2005]["rank"] == 1 and years[2003]["rank"] == 3
    assert years[2003]["total"] == pytest.approx(sum(3.0 * m for m in range(1, 13)))
    assert out["busiest_calendar_months"][0]["calendar_month"] == 12
    assert out["record_high"] == {"month": (2005, 12), "count": 72.0}
    assert out["calendar_month_medians"][1] == {"median": 4.0, "reference_mean": 4.0}


def test_3_1_ac1_top_months_keep_every_tie_at_rank_5():
    months = [(2003, m) for m in range(1, 8)]
    s = dict(zip(months, [9.0, 8.0, 7.0, 6.0, 5.0, 5.0, 1.0]))
    out = stats.summarize(s, set(months), months, in_range=set(months), reference_years=REF)
    assert [t["rank"] for t in out["top_months"]] == [1, 2, 3, 4, 5, 5]


def test_3_2_ac3_same_days_comparison():
    got = stats.same_days(30.0, [10.0, 20.0, 40.0])
    assert got == {"same_days_median": 20.0, "ratio": 1.5, "difference": 10.0, "no_typical_activity": False}
    zero = stats.same_days(5.0, [0.0, 0.0, 3.0])
    assert zero == {"same_days_median": 0.0, "ratio": None, "difference": 5.0, "no_typical_activity": True}


def test_review_share_of_max_uses_complete_years_only():
    months = [(y, m) for y in (2003, 2004) for m in range(1, 13)] + [(2005, 1)]
    s = {t: 10.0 for t in months}
    s[(2005, 1)] = 500.0  # a part-year with one huge month must not become the 100% bar
    out = stats.summarize(s, set(months), months + [(2005, m) for m in range(2, 13)],
                          in_range=set(months), reference_years=(2003, 2004))
    shares = {y["year"]: y["share_of_max"] for y in out["year_totals"]}
    assert shares[2003] == 1.0 and shares[2004] == 1.0 and shares[2005] == 500.0 / 120.0


def _years(totals, extra=None):
    """Each year has `totals[y]` hotspots in every month, all complete."""
    s = {(y, m): float(v) for y, v in totals.items() for m in range(1, 13)}
    return s, set(s) | set(extra or [])


def test_7_5_ac1_cumulative_series_and_median_and_band_of_complete_past_years():
    s, complete = _years({2003: 1, 2004: 2, 2005: 3})
    s.update({(2006, 1): 10.0, (2006, 2): 5.0})            # the selected year, to date
    complete -= {(2006, 1), (2006, 2)}
    got = stats.season_to_date(s, complete, 2006, reference_years=(2003, 2005))
    assert got["past_years"] == [2003, 2004, 2005]
    assert got["band"] == (10, 90) and got["start"] == 0.0
    m = got["months"]
    assert [p["cumulative"] for p in m[:3]] == [10.0, 15.0, None]   # null after the data: missing is not zero
    assert m[0]["median"] == 2.0 and m[11]["median"] == 24.0         # median of 12, 24, 36
    assert m[11]["band_low"] == pytest.approx(14.4) and m[11]["band_high"] == pytest.approx(33.6)


def test_7_5_a_past_year_that_is_not_complete_is_left_out_and_so_is_the_selected_part_year():
    s, complete = _years({2003: 1, 2004: 2})
    complete.discard((2004, 7))                               # a month with missing days
    s.update({(2002, m): 100.0 for m in range(7, 13)})        # 2002 starts in July
    complete |= {(2002, m) for m in range(7, 13)}
    got = stats.season_to_date(s, complete, 2005, reference_years=(2002, 2004))
    assert got["past_years"] == [2003]
    assert all(p["cumulative"] is None for p in got["months"])  # 2005 is not in the record at all


def test_7_5_a_year_starting_mid_year_has_no_curve_rather_than_one_starting_in_july():
    s, _ = _years({2003: 1})
    s.update({(2002, m): 100.0 for m in range(7, 13)})
    assert stats.running_total(s, 2002) == [None] * 12


def test_7_5_ac2_the_curve_starts_at_zero_and_nothing_is_counted_on_1_january():
    s, complete = _years({2003: 1})
    got = stats.season_to_date(s, complete, 2004, reference_years=(2003, 2003))
    assert got["start"] == 0.0 and got["months"][0]["cumulative"] is None


def test_7_5_no_past_year_gives_no_median_or_band():
    got = stats.season_to_date({(2026, 1): 4.0}, set(), 2026, reference_years=(2003, 2025))
    assert got["past_years"] == [] and got["months"][0] == {
        "month": 1, "cumulative": 4.0, "median": None, "band_low": None, "band_high": None}


def test_7_5_percentile_is_linear_between_values():
    assert stats.percentile([10, 20, 30, 40], 50) == 25.0
    assert stats.percentile([5], 90) == 5 and stats.percentile([], 50) is None
