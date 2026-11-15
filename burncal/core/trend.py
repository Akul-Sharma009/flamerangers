"""Story 8.5: the Mann-Kendall trend test on annual counts, with the Sen slope as the size.

Mann (1945), Kendall (1938, the tau statistic it builds on): the rank-based test of a monotonic trend, normal approximation with the
tie correction and a continuity correction (the usual form; Gilbert 1987 gives the same formulas).
Sen (1968): the slope is the median of the slopes between every pair of years.
No custom statistic. Pure: values in, unrounded numbers out (the service rounds once).
"""
import math
import statistics

MIN_YEARS = 10  # below this the normal approximation is not used; the test is refused
ALPHA = 0.05    # the conventional level; the direction is named only when p is below it


def mann_kendall(years: list[int], values: list[float], *, continuity: bool = True) -> dict | None:
    """The test on (year, value) pairs in ascending year order. None below MIN_YEARS pairs.

    S counts later-minus-earlier pairs by sign. z uses the variance with ties removed (the tie-corrected form in Kendall's book Rank Correlation Methods).
    tau is Kendall's tau-b. sen_slope is the median pairwise slope, in value units per year.
    """
    n = len(values)
    if n != len(years) or n < MIN_YEARS:
        return None
    if any(b <= a for a, b in zip(years, years[1:])):
        raise ValueError("years must be strictly ascending")
    s = sum((values[j] > values[i]) - (values[j] < values[i]) for i in range(n) for j in range(i + 1, n))
    ties = [list(values).count(v) for v in set(values)]
    n0 = n * (n - 1) / 2
    t1 = sum(t * (t - 1) / 2 for t in ties)
    var = (n * (n - 1) * (2 * n + 5) - sum(t * (t - 1) * (2 * t + 5) for t in ties)) / 18
    if var <= 0:  # every value equal: no trend can be seen
        z, p, tau = 0.0, 1.0, 0.0
    else:
        shift = 1 if continuity else 0
        z = 0.0 if s == 0 else (abs(s) - shift) / math.sqrt(var) * (1 if s > 0 else -1)
        z = 0.0 if abs(s) <= shift else z
        p = math.erfc(abs(z) / math.sqrt(2))
        tau = s / math.sqrt((n0 - t1) * n0)
    slopes = [(values[j] - values[i]) / (years[j] - years[i]) for i in range(n) for j in range(i + 1, n)]
    sen = statistics.median(slopes)
    direction = "none" if p >= ALPHA else ("increasing" if s > 0 else "decreasing")
    return {"n": n, "s": s, "z": z, "p_value": p, "tau": tau, "sen_slope": sen, "direction": direction}


def annual_series(year_totals: list[dict]) -> tuple[list[tuple[int, float]], list[dict]]:
    """Complete years with a total, and the years left out with the reason.

    2002 starts in July and the current year is a part-year: both arrive with complete false (stats),
    so a year is left out when it is not complete; 2002 is named as the record start.
    """
    used, left = [], []
    for y in year_totals:
        if y["complete"] and y["total"] is not None:
            used.append((y["year"], y["total"]))
        else:
            left.append({"year": y["year"], "reason": "record_start" if y["year"] == 2002 else "incomplete"})
    return used, left
