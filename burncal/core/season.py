"""Story 7.3: the seasonal profile (AD-8, AD-17). Pure. Takes unrounded counts; the service rounds.

Peak month and season length are the test plan's criterion 3 definition (Giglio et al. 2006, section 3.2):
the peak month is the calendar month with the highest count, and the season length is the number of
months whose count is at least 10% of the annual count (the sum of the twelve months). Applied here to
the typical year (the twelve per-calendar-month medians) and, for the overlay, to a single calendar year.
Ties for the peak go to the earlier month. Months are (year, month) tuples.
"""
from burncal.core import stats

SEASON_SHARE = 0.10  # a season month holds at least this share of the annual count


def season_marks(counts) -> dict:
    """Criterion 3 for twelve counts, January to December. None entries (or all zeros) give no peak and no season."""
    counts = list(counts)
    if len(counts) != 12 or any(c is None for c in counts) or sum(counts) <= 0:
        return {"peak_month": None, "season_length": None, "season_months": []}
    annual = sum(counts)
    peak = max(range(12), key=lambda i: (counts[i], -i)) + 1
    months = [i + 1 for i, c in enumerate(counts) if c >= SEASON_SHARE * annual]
    return {"peak_month": peak, "season_length": len(months), "season_months": months}


def profile(series: dict, complete, reference_years, record_years) -> dict:
    """The typical year and each recorded year.

    typical: per calendar month the median and the range (lowest, highest) over the complete months of the
    reference years, then criterion 3 on the medians. years: for each year in record_years, its twelve
    counts (None outside the record) and criterion 3 when all twelve are in the record.
    """
    complete = set(complete)
    vals = stats.reference_values(series, complete, reference_years)
    ref = stats.reference(series, complete, reference_years)  # the one implementation of the median
    med = [ref[m][0] for m in range(1, 13)]
    typical = {
        "months": [{"calendar_month": m, "median": med[m - 1],
                    "low": min(vals[m]) if vals[m] else None, "high": max(vals[m]) if vals[m] else None,
                    "years_counted": len(vals[m])} for m in range(1, 13)],
        **season_marks(med),
    }
    years = []
    for y in record_years:
        counts = [series.get((y, m)) for m in range(1, 13)]
        years.append({"year": y, "counts": counts, "complete": all((y, m) in complete and (y, m) in series
                                                                     for m in range(1, 13)),
                      **{k: v for k, v in season_marks(counts).items()}})
    return {"typical": typical, "years": years}

