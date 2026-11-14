"""Story 3.1: statistics for the calendar (AD-8, AD-17). Pure. Takes unrounded counts; the service rounds.

Months are (year, month) tuples. `complete` holds the months whose partial_reasons have none of
record_start, data_through or missing_days; only those enter reference statistics and rankings.
"""
import math
import statistics

ANOMALY_BREAKS = [-100, -50, -20, 20, 50, 100]   # anomaly_pct class lower bounds; the class holding 0 is neutral
COLOUR_QUANTILES = (0.3, 0.55, 0.75, 0.9, 0.97)  # count classes: 0, then from 1, then these quantiles of positive months
TOP_N = 5
RANK_DECIMALS = 1                                # ties are judged on the value as shown


def competition_ranks(values) -> list[int]:
    """Rank 1 = highest; values equal at the shown precision share a rank."""
    shown = [round(v, RANK_DECIMALS) for v in values]
    return [1 + sum(o > v for o in shown) for v in shown]


def colour_breaks(values) -> list[int]:
    """Lower bounds of the count classes for this area: 0, 1, then floored quantiles of the positive months."""
    pos = sorted(v for v in values if v is not None and v > 0)
    if not pos:
        return [0, 1]
    q = lambda p: pos[min(len(pos) - 1, int(p * len(pos)))]  # noqa: E731
    return sorted({0, 1, *(math.floor(q(p)) for p in COLOUR_QUANTILES)})


def class_index(value, breaks):
    """Index of the last break at or below value; None when there is no value."""
    if value is None:
        return None
    idx = 0
    for i, b in enumerate(breaks):
        if value >= b:
            idx = i
    return idx


def reference(series: dict, complete, years) -> dict:
    """Per calendar month: (median, mean) over the complete months of the reference years, or (None, None)."""
    out = {}
    for m in range(1, 13):
        vals = [series[(y, m)] for y in range(years[0], years[1] + 1) if (y, m) in complete and (y, m) in series]
        out[m] = (statistics.median(vals), statistics.fmean(vals)) if vals else (None, None)
    return out


def compare(value, median, mean) -> dict:
    """The month against its calendar month: ratio to the median, anomaly from the mean as a count and a percentage."""
    if value is None:
        return {"ratio_to_median": None, "anomaly_count": None, "anomaly_pct": None, "no_typical_activity": False}
    return {
        "ratio_to_median": None if not median else value / median,
        "anomaly_count": None if mean is None else value - mean,
        "anomaly_pct": None if not mean else 100.0 * (value - mean) / mean,
        "no_typical_activity": median == 0,
    }


def summarize(series: dict, complete, shown, *, in_range, reference_years) -> dict:
    """Everything /calendar needs beyond each month's count.

    series: month -> count for months in the record. shown: every month of the years the range touches.
    in_range: months the range touches.
    """
    complete = set(complete)
    ref = reference(series, complete, reference_years)
    rankable = [t for t in shown if t in series and t in complete and t in in_range]
    month_rank = dict(zip(rankable, competition_ranks([series[t] for t in rankable])))
    years = sorted({t[0] for t in shown})
    totals = {}
    for y in years:
        vals = [series[(y, m)] for m in range(1, 13) if (y, m) in series]
        totals[y] = (sum(vals) if vals else None, all((y, m) in complete and (y, m) in series for m in range(1, 13)))
    rank_years = [y for y in years if totals[y][1] and (y, 1) in in_range and (y, 12) in in_range]
    year_rank = dict(zip(rank_years, competition_ranks([totals[y][0] for y in rank_years])))
    # the 100% bar is the largest complete year, so a part-year never sets it (lead's review, 15 Nov)
    biggest = max((tot for tot, ok in totals.values() if tot is not None and ok), default=None) or \
        max((tot for tot, _ in totals.values() if tot is not None), default=None)
    by_cal = {m: [series[t] for t in rankable if t[1] == m] for m in range(1, 13)}
    cal_means = [(m, statistics.fmean(v)) for m, v in by_cal.items() if v]
    cal_ranks = competition_ranks([v for _, v in cal_means])
    high = max((t for t in series if t in complete), key=lambda t: series[t], default=None)
    return {
        "reference": ref,
        "calendar_month_medians": {m: {"median": ref[m][0], "reference_mean": ref[m][1]} for m in range(1, 13)},
        "colour_breaks": colour_breaks([series.get(t) for t in shown]),
        "anomaly_breaks": ANOMALY_BREAKS,
        "month_rank": month_rank,
        "year_totals": [{"year": y, "total": tot, "complete": ok, "rank": year_rank.get(y),
                         "share_of_max": None if tot is None or not biggest else tot / biggest}
                        for y, (tot, ok) in totals.items()],
        "top_months": sorted(({"month": t, "count": series[t], "rank": r} for t, r in month_rank.items() if r <= TOP_N),
                             key=lambda d: (d["rank"], d["month"])),
        "top_years": sorted(({"year": y, "total": totals[y][0], "rank": r} for y, r in year_rank.items() if r <= TOP_N),
                            key=lambda d: (d["rank"], d["year"])),
        "busiest_calendar_months": sorted(({"calendar_month": m, "mean_count": v, "rank": r}
                                           for (m, v), r in zip(cal_means, cal_ranks)),
                                          key=lambda d: (d["rank"], d["calendar_month"])),
        "record_high": None if high is None else {"month": high, "count": series[high]},
    }


def same_days(to_date: float, by_year) -> dict:
    """AD-15: days 1 to d of the current month against the median of the same days in each reference year."""
    med = statistics.median(by_year) if len(by_year) else None
    return {"same_days_median": med,
            "ratio": None if not med else to_date / med,
            "difference": None if med is None else to_date - med,
            "no_typical_activity": med == 0}
