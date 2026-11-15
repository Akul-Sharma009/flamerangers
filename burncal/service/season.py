"""Story 7.3: the /season answer. Every number comes from burncal.core.season; this rounds once (counts to 1 decimal)."""
from datetime import date

from burncal.core import aoi as core_aoi
from burncal.core import season as core_season
from burncal.core import grids, record
from burncal.service import answers
from burncal.service.store import Version

SHARE = core_season.SEASON_SHARE


def _count_series(v: Version, geom):
    """The month -> count series and the complete months, built as in answers.calendar."""
    sums, ext, dt = v.count(geom), v.extent_of(geom), v.data_through
    missing, uncovered = v.missing(ext), v.uncovered(ext)
    months = [(y, m) for y in range(2002, dt.year + 1) for m in range(1, 13)
              if record.month_state(y, m, data_through=dt)[0] != "null"]
    series = {t: float(sums[(t[0] - 2002) * 12 + t[1] - 1, 0]) for t in months if t not in uncovered}
    complete = {t for t in months if not any(
        r in ("record_start", "data_through", "missing_days") for r in record.partial_reasons(
            t[0], t[1], data_through=dt, missing_days=t in missing, start=date(t[0], t[1], 1), end=dt))}
    return series, complete


def shape(p: dict, rd=answers.r1) -> dict:
    """Round a core.season.profile answer for the wire."""
    t = p["typical"]
    return {
        "season_share": SHARE,
        "typical": {"months": [{"calendar_month": m["calendar_month"], "median": rd(m["median"]), "low": rd(m["low"]),
                                "high": rd(m["high"]), "years_counted": m["years_counted"]} for m in t["months"]],
                    "peak_month": t["peak_month"], "season_length": t["season_length"],
                    "season_months": t["season_months"]},
        "years": [{"year": y["year"], "counts": [rd(c) for c in y["counts"]], "complete": y["complete"],
                   "peak_month": y["peak_month"], "season_length": y["season_length"],
                   "season_months": y["season_months"]} for y in p["years"]],
    }


def season(v: Version, geom, name, regions: dict) -> dict:
    aoi, _ = answers._aoi(v, geom, name, regions)
    series, complete = _count_series(v, geom)
    ref = record.meta_dates(v.data_through)["reference_period"]
    prof = core_season.profile(series, complete, (ref["start_year"], ref["end_year"]),
                               range(2002, v.data_through.year + 1))
    return {"record_version": v.record_version, "data_through": v.data_through.isoformat(),
            "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
            "unit_label": answers.UNIT_LABEL, "aoi": aoi, "reference_period": ref, **shape(prof)}


def from_calendar(cal: dict) -> dict:
    """The same answer from a /calendar answer (the fixture), through the same core function."""
    series = {(int(m["month"][:4]), int(m["month"][5:])): m["count"] for m in cal["months"] if m["count"] is not None}
    complete = {(int(m["month"][:4]), int(m["month"][5:])) for m in cal["months"] if m["complete"]}
    ref = cal["reference_period"]
    years = sorted({int(m["month"][:4]) for m in cal["months"] if m["count"] is not None})
    prof = core_season.profile(series, complete, (ref["start_year"], ref["end_year"]), years)
    return {"record_version": cal["record_version"], "data_through": cal["data_through"], "cautions": cal["cautions"],
            "unit_label": cal["unit_label"], "aoi": cal["aoi"], "reference_period": ref, **shape(prof)}
