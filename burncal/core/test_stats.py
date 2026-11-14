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
