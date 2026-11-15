"""Story 8.3: the reference period as a request option.

The check (limits from core.record) and, for fixture mode only, the fixture calendar restated over a
requested period. The store path does not use `restate`: answers.calendar takes the period and computes
from unrounded counts. `restate` works from the fixture's own (already rounded) counts with the same
core functions, so the web can be tried against the fixture; it computes no number of its own.
"""
from datetime import date

from burncal.core import record, stats

WHY = {
    "order": "the end year is before the start year",
    "outside": "years must be complete years of the record, {first} to {last}",
    "too_short": "the period must be at least {n} years long",
}


def problem_detail(span: dict, data_through: date) -> str | None:
    """The problem's detail for a period that can't be used, or None."""
    why = record.reference_period_problem(span["start_year"], span["end_year"], data_through=data_through)
    if why is None:
        return None
    last = record.meta_dates(data_through)["reference_period"]["end_year"]
    return "reference_period: " + WHY[why].format(first=record.REFERENCE_FIRST_YEAR, last=last,
                                                  n=record.REFERENCE_MIN_YEARS)


def _r1(x):
    return None if x is None else round(float(x), 1) + 0.0


def _r2(x):
    return None if x is None else round(float(x), 2) + 0.0


def restate(cal: dict, span: dict) -> dict:
    """Fixture mode: the fixture calendar with its median, mean, anomalies and card over `span`.

    Everything else (counts, flags, colour classes, rankings, flag_reference_years) is the fixture's.
    """
    years = (span["start_year"], span["end_year"])
    series, complete = {}, set()
    for m in cal["months"]:
        t = (int(m["month"][:4]), int(m["month"][5:]))
        if m["count"] is not None:
            series[t] = m["count"]
            if m["complete"]:
                complete.add(t)
    ref = stats.reference(series, complete, years)
    months = []
    for m in cal["months"]:
        t = (int(m["month"][:4]), int(m["month"][5:]))
        med, mean = ref[t[1]] if t in series else (None, None)
        cmp = stats.compare(series.get(t), med, mean)
        months.append({**m, "median": _r1(med), "reference_mean": _r1(mean),
                       "no_typical_activity": cmp["no_typical_activity"],
                       "ratio_to_median": _r2(cmp["ratio_to_median"]), "anomaly_count": _r1(cmp["anomaly_count"]),
                       "anomaly_pct": _r2(cmp["anomaly_pct"]),
                       "anomaly_class": stats.class_index(_r2(cmp["anomaly_pct"]), stats.ANOMALY_BREAKS)})
    medians = [{"calendar_month": mo, "median": _r1(ref[mo][0]), "reference_mean": _r1(ref[mo][1]),
                "no_typical_activity": ref[mo][0] == 0} for mo in range(1, 13)]
    card = cal["current_month"]
    by_year = [y for y in card["same_days_by_year"] if years[0] <= y["year"] <= years[1]]
    same = stats.same_days(card["count_to_date"], [y["count"] for y in by_year])
    card = {**card, "reference_period": dict(span), "same_days_by_year": by_year,
            "same_days_median": _r1(same["same_days_median"]) if same["same_days_median"] is not None else 0.0,
            "no_typical_activity": same["no_typical_activity"], "ratio": _r2(same["ratio"]),
            "difference": _r1(same["difference"]) if same["difference"] is not None else card["count_to_date"]}
    return {**cal, "reference_period": dict(span), "months": months, "calendar_month_medians": medians,
            "current_month": card}
