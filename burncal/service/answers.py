"""/meta, /calendar and /cells answers from a published version (Stories 2.6, 3.1).

Every number comes from core (record, stats, grids) unrounded; this module rounds once: counts to
1 decimal, ratios and percentages to 2. The current-month card is Story 3.2 and is null until then.
"""
from datetime import date

import numpy as np
import shapely

from burncal.core import aoi as core_aoi
from burncal.core import regions as core_regions
from burncal.core import grids, record, splice, stats, trend as core_trend
from burncal.service.store import SATELLITES, Version

CONTRACT_VERSION = "0.5.0"  # must equal info.version in contract/openapi.yaml (tested)
UNIT_LABEL = "hotspots, Aqua MODIS units"
EVIDENCE = ("tuned", "tested_unseen", "reported_only", "not_evaluated")


def r1(x):
    return None if x is None else round(float(x), 1) + 0.0  # + 0.0 turns -0.0 into 0.0


def meta(v: Version, regions: dict) -> dict:
    """regions: region_id -> (name, evidence_class, geometry)."""
    return {
        "contract_version": CONTRACT_VERSION,
        "record_version": v.record_version,
        "data_through": v.data_through.isoformat(),
        "placeholder": False,
        "unit_label": UNIT_LABEL,
        "record_start": f"{record.RECORD_START:%Y-%m}",
        "record_switch": {"aqua_through": f"{record.AQUA_LAST:%Y-%m}", "viirs_from": f"{record.VIIRS_FIRST:%Y-%m}"},
        "satellite_switch": {"snpp_through": record.SNPP_LAST.isoformat(), "noaa20_from": record.NOAA20_FIRST.isoformat()},
        **record.meta_dates(v.data_through),
        "reference_period_min_years": record.REFERENCE_MIN_YEARS,  # Story 8.3
        "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
        "coverage": {"global": False, "regions": [
            {"region_id": rid, "name": name, "evidence_class": ev,
             "status": "loaded" if v.covers(geom) else "not_loaded"}
            for rid, (name, ev, geom) in regions.items()]},
        "noaa20_check": _noaa20(v.noaa20_check),
    }


def _noaa20(h: dict | None) -> dict | None:
    """Story 2.10's headline figures, rounded once here: 1 decimal, as the contract states for bias_pct."""
    if h is None:
        return None
    fig = lambda f: {"mean_abs_difference": r1(f["mean_abs_difference"]), "bias_pct": r1(f["bias_pct"]),  # noqa: E731
                     "cell_months": int(f["cell_months"])}
    return {"reported_only": True, "validated_against_aqua": False,
            "period_start": h["period_start"], "period_end": h["period_end"], "pooled": fig(h["pooled"]),
            "regions": [{"region_id": r["region_id"], "name": r["name"], "figures": fig(r["figures"])} for r in h["regions"]]}


def _aoi(v: Version, geom, name, regions) -> tuple[dict, object]:
    cells = v.cells_1deg_of(geom)
    counts = {k: int((cells["evidence_class"] == k).sum()) for k in EVIDENCE}
    caveat = core_regions.region_caveat(geom, {rid: g for rid, (_, _, g) in regions.items()})
    return {"aoi_id": core_aoi.aoi_id(geom), "name": name, "area_km2": r1(core_aoi.area_km2(geom)),
            "evidence_class_counts": counts, "region_caveat": caveat}, cells


def r2(x):
    return None if x is None else round(float(x), 2) + 0.0


def _ym(t):
    return f"{t[0]:04d}-{t[1]:02d}"


def _series(v: Version, geom, start: date, end: date):
    """The sums, extent, uncovered months, record months, the unrounded counts by month and the months shown."""
    sums = v.count(geom)
    ext = v.extent_of(geom)
    uncovered = v.uncovered(ext)
    dt = v.data_through
    record_months = [(y, m) for y in range(2002, dt.year + 1) for m in range(1, 13)
                     if record.month_state(y, m, data_through=dt)[0] != "null"]
    series = {t: float(sums[(t[0] - 2002) * 12 + t[1] - 1, 0]) for t in record_months if t not in uncovered}
    shown = [(y, m) for y in range(start.year, end.year + 1) for m in range(1, 13)]
    return sums, ext, uncovered, record_months, series, shown


def _record_series(v: Version, geom):
    """(sums, series, complete, extent): the area's monthly sums, month -> unrounded count for months in the record, the complete months."""
    sums = v.count(geom)
    ext = v.extent_of(geom)
    missing, uncovered = v.missing(ext), v.uncovered(ext)
    dt = v.data_through
    record_months = [(y, m) for y in range(2002, dt.year + 1) for m in range(1, 13)
                     if record.month_state(y, m, data_through=dt)[0] != "null"]
    series = {t: float(sums[(t[0] - 2002) * 12 + t[1] - 1, 0]) for t in record_months if t not in uncovered}
    complete = {t for t in record_months if not any(
        r in ("record_start", "data_through", "missing_days") for r in record.partial_reasons(
            t[0], t[1], data_through=dt, missing_days=t in missing, start=date(t[0], t[1], 1), end=dt))}
    return sums, series, complete, ext


def shared_breaks(v: Version, geoms, start: date, end: date) -> list:
    """Story 8.7: one set of count classes for several areas, from their months pooled (core.stats.colour_breaks)."""
    pooled = []
    for g in geoms:
        series, shown = _series(v, g, start, end)[4:]
        pooled += [series.get(t) for t in shown]
    return stats.colour_breaks(pooled)


def calendar(v: Version, geom, name, start: date, end: date, regions: dict, colour_breaks=None,
             reference_period: dict | None = None) -> dict:
    """`colour_breaks`: Story 8.7, classes shared with another area; None gives this area's own.
    reference_period: Story 8.3, a checked {start_year, end_year}; None is the default (AD-16)."""
    aoi, cells = _aoi(v, geom, name, regions)
    sums, ext, uncovered, record_months, series, shown = _series(v, geom, start, end)
    flags = v.flag_counts(cells)
    inputs, missing = v.month_inputs(ext), v.missing(ext)
    dt = v.data_through
    complete = {t for t in record_months if not any(
        r in ("record_start", "data_through", "missing_days") for r in record.partial_reasons(
            t[0], t[1], data_through=dt, missing_days=t in missing, start=date(t[0], t[1], 1), end=dt))}
    in_range = {t for t in shown if (t[0], t[1]) >= (start.year, start.month) and (t[0], t[1]) <= (end.year, end.month)}
    ref_years = dict(reference_period) if reference_period else record.meta_dates(dt)["reference_period"]  # Story 8.3
    st = stats.summarize(series, complete, shown, in_range=in_range,
                         reference_years=(ref_years["start_year"], ref_years["end_year"]))
    breaks = st["colour_breaks"] if colour_breaks is None else list(colour_breaks)
    months = []
    for t in shown:
        year, month = t
        k = (year - 2002) * 12 + month - 1
        ins = inputs.get(t, [])
        reasons = record.partial_reasons(year, month, data_through=dt, missing_days=t in missing, start=start, end=end)
        in_record = t in series
        value = series.get(t)
        med, mean = st["reference"][month] if in_record else (None, None)
        cmp = stats.compare(value, med, mean)
        days = {i["satellite"]: i["days"] for i in ins}
        fl = flags.loc[t] if in_record and t in flags.index else None
        months.append({
            "month": _ym(t),
            "count": r1(value),
            "null_reason": None if in_record else ("outside_coverage" if t in uncovered else "outside_record"),
            "source": None if not in_record else ("aqua_real" if t <= (2021, 12) else "viirs_converted"),
            "inputs": ins,
            "raw": {s.lower(): (int(round(sums[k, j + 1])) if in_record and days.get(s, 0) > 0 else None)
                    for j, s in enumerate(SATELLITES)},
            "complete": t in complete,
            "partial_reasons": reasons,
            "validated_satellite": in_record and all(i["satellite"] in ("SNPP", "AQUA") for i in ins if i["feeds_record"]),
            "reference_year": bool(grids.reference_year(year)),
            "provisional": in_record and t not in complete,
            "median": r1(med), "reference_mean": r1(mean), "no_typical_activity": cmp["no_typical_activity"],
            "ratio_to_median": r2(cmp["ratio_to_median"]), "anomaly_count": r1(cmp["anomaly_count"]),
            "anomaly_pct": r2(cmp["anomaly_pct"]),
            "colour_class": stats.class_index(r1(value), breaks),
            "anomaly_class": stats.class_index(r2(cmp["anomaly_pct"]), stats.ANOMALY_BREAKS),
            # null outside the record (missing is not zero); 0 inside it when no cell is flagged
            "cells_flagged_strong": None if not in_record else int(fl["strong"]) if fl is not None else 0,
            "cells_flagged_marginal": None if not in_record else int(fl["marginal"]) if fl is not None else 0,
            "cells_total": len(cells),
            "rank": st["month_rank"].get(t),
        })
    return {
        "record_version": v.record_version, "data_through": dt.isoformat(),
        "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
        "unit_label": UNIT_LABEL, "aoi": aoi, "range": {"start": start.isoformat(), "end": end.isoformat()},
        "reference_period": ref_years,
        "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
        "months": months,
        "year_totals": [{"year": y["year"], "total": r1(y["total"]), "complete": y["complete"], "rank": y["rank"],
                         "share_of_max": r2(y["share_of_max"])} for y in st["year_totals"]],
        "calendar_month_medians": [{"calendar_month": m, "median": r1(c["median"]), "reference_mean": r1(c["reference_mean"]),
                                    "no_typical_activity": c["median"] == 0}
                                   for m, c in st["calendar_month_medians"].items()],
        "statistics": {
            "colour_breaks": breaks, "anomaly_breaks": st["anomaly_breaks"],
            "top_months": [{"month": _ym(x["month"]), "count": r1(x["count"]), "rank": x["rank"]} for x in st["top_months"]],
            "top_years": [{"year": x["year"], "total": r1(x["total"]), "rank": x["rank"]} for x in st["top_years"]],
            "busiest_calendar_months": [{"calendar_month": x["calendar_month"], "mean_count": r1(x["mean_count"]),
                                         "rank": x["rank"]} for x in st["busiest_calendar_months"]],
            "record_high": None if st["record_high"] is None else {
                "month": _ym(st["record_high"]["month"]), "count": r1(st["record_high"]["count"])},
        },
        "current_month": _card(v, geom, complete, ref_years, months),
        "trend": trend(st["year_totals"]),  # Story 8.5
    }


def trend(year_totals: list[dict]) -> dict:
    """Story 8.5: Mann-Kendall on the complete years in the range, Sen slope as the size. Rounded once here:
    p to 4 decimals, z, tau and the slope to 2 (a slope of whole hotspots a year needs no more)."""
    used, left = core_trend.annual_series(year_totals)
    years = [y for y, _ in used]
    res = core_trend.mann_kendall(years, [t for _, t in used])
    return {
        "status": "ok" if res else "too_few_years", "test": "mann_kendall", "min_years": core_trend.MIN_YEARS,
        "alpha": core_trend.ALPHA, "left_out": left,
        "years": {"start": years[0], "end": years[-1], "count": len(years)} if years else None,
        "record_switch_inside": bool(years) and years[0] <= 2021 and years[-1] >= 2022,
        "s": res["s"] if res else None, "z": round(res["z"], 2) + 0.0 if res else None,
        "p_value": round(res["p_value"], 4) + 0.0 if res else None,
        "tau": round(res["tau"], 2) + 0.0 if res else None,
        "sen_slope_per_year": r1(res["sen_slope"]) if res else None,
        "direction": res["direction"] if res else None,
    }


def _card(v: Version, geom, complete, ref_years, months) -> dict:
    """The current-month card (AD-15): days 1 to d against the same days of each complete reference year."""
    dt = v.data_through
    years = [y for y in range(ref_years["start_year"], ref_years["end_year"] + 1) if (y, dt.month) in complete]
    to_date, by_year = v.same_days(geom, dt.month, dt.day, years)
    cmp = stats.same_days(to_date, by_year)
    now = next((m for m in months if m["month"] == _ym((dt.year, dt.month))), None)
    ins = v.month_inputs(v.extent_of(geom)).get((dt.year, dt.month), [])
    flags = v.flag_counts(v.cells_1deg_of(geom))
    fl = flags.loc[(dt.year, dt.month)] if (dt.year, dt.month) in flags.index else None
    return {
        "month": _ym((dt.year, dt.month)), "day": dt.day,
        "count_to_date": r1(to_date),
        # The month holds only days 1 to d, so a month with missing input days is missing some of days 1 to d.
        "missing_days_to_date": (dt.year, dt.month) in v.missing(v.extent_of(geom)),
        "same_days_median": r1(cmp["same_days_median"]) if cmp["same_days_median"] is not None else 0.0,
        "no_typical_activity": cmp["no_typical_activity"],
        "ratio": r2(cmp["ratio"]),
        "difference": r1(cmp["difference"]) if cmp["difference"] is not None else r1(to_date),
        "reference_period": ref_years,
        "same_days_by_year": [{"year": y, "count": r1(c)} for y, c in zip(years, by_year)],
        "cells_flagged_strong": int(fl["strong"]) if fl is not None else 0,
        "cells_flagged_marginal": int(fl["marginal"]) if fl is not None else 0,
        "cells_total": now["cells_total"] if now else len(v.cells_1deg_of(geom)),
        "quality": "NRT" if any(i["quality"] == "NRT" and i["feeds_record"] for i in ins) else "SP",
        "validated_satellite": all(i["satellite"] in ("SNPP", "AQUA") for i in ins if i["feeds_record"]),
        "monthly_validation_only": True,
    }


def _cell_rows(v: Version, cs, year: int, month: int) -> list[dict]:
    """The served fields of each cell in `cs` for one month, from the published flags (Story 2.5's
    flag_state, count and threshold). The one implementation behind /cells and /world_cells."""
    f = v.flags[(v.flags["year"] == year) & (v.flags["month"] == month)]
    f = cs.merge(f, on=["sw_lon", "sw_lat"], how="left")
    ref = bool(grids.reference_year(year))
    return [{"sw_lon": int(r.sw_lon), "sw_lat": int(r.sw_lat), "size_deg": 1,
             "flag_state": r.flag_state if isinstance(r.flag_state, str) else "outside_record",
             "count": None if np.isnan(r.count) else r1(r.count),
             "threshold": None if np.isnan(r.threshold) or np.isnan(r.count) else r1(r.threshold),
             "evidence_class": r.evidence_class,
             "provisional": bool(r.provisional) if isinstance(r.provisional, (bool, np.bool_)) else False,
             "reference_year": ref} for r in f.itertuples()]


def cells(v: Version, geom, year: int, month: int) -> dict:
    """The area's whole 1-degree cells for one month, each with its own count, threshold and flag."""
    cs = v.cells_1deg_of(geom)
    boxes = shapely.box(cs["sw_lon"], cs["sw_lat"], cs["sw_lon"] + 1, cs["sw_lat"] + 1)
    partly = ~shapely.covers(geom, boxes)
    out = [row | {"partly_inside": bool(part)} for row, part in zip(_cell_rows(v, cs, year, month), partly)]
    return {"record_version": v.record_version, "data_through": v.data_through.isoformat(),
            "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
            "month": f"{year:04d}-{month:02d}",
            "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
            "cells": out}


def raw_splice(cal: dict) -> dict:
    """Story 7.1: the raw splice of a calendar answer. The counts are the calendar's own per-satellite raw
    counts, so the query and cleaning are the record's. The colour classes use the record's colour breaks,
    so the scale does not change when the values do."""
    breaks = cal["statistics"]["colour_breaks"]
    months = []
    for m in cal["months"]:
        year, month = int(m["month"][:4]), int(m["month"][5:])
        count = splice.splice_count(year, month, m["raw"]["aqua"], m["raw"]["snpp"])
        reason = None if count is not None else (m["null_reason"] or "outside_coverage")
        months.append({"month": m["month"], "count": None if count is None else r1(count), "null_reason": reason,
                       "source": None if count is None else splice.source(year, month),
                       "early_bad_scan": count is not None and splice.early_bad_scan(year, month),
                       "colour_class": stats.class_index(None if count is None else r1(count), breaks)})
    return {"record_version": cal["record_version"], "data_through": cal["data_through"],
            "cautions": cal["cautions"], "unit_label": cal["unit_label"], "aoi": cal["aoi"], "range": cal["range"],
            "splice_from": f"{splice.SPLICE_FIRST[0]:04d}-{splice.SPLICE_FIRST[1]:02d}",
            "early_bad_scan_through": f"{splice.EARLY_BAD_SCAN_LAST[0]:04d}-{splice.EARLY_BAD_SCAN_LAST[1]:02d}",
            "colour_breaks": breaks, "months": months}


def season_to_date(v: Version, geom, name, year: int, regions: dict) -> dict:
    """Story 7.5: the year's running total against the median and band of complete past years' running totals."""
    aoi, _ = _aoi(v, geom, name, regions)
    _, series, complete, _ = _record_series(v, geom)
    dt = v.data_through
    ref = record.meta_dates(dt)["reference_period"]
    st = stats.season_to_date(series, complete, year, reference_years=(ref["start_year"], ref["end_year"]))
    months = []
    for p in st["months"]:
        t = (year, p["month"])
        months.append({
            "month": _ym(t), "cumulative": r1(p["cumulative"]), "to_date": t == (dt.year, dt.month),
            "median": r1(p["median"]), "band_low": r1(p["band_low"]), "band_high": r1(p["band_high"])})
    return {
        "record_version": v.record_version, "data_through": dt.isoformat(),
        "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
        "unit_label": UNIT_LABEL, "aoi": aoi, "year": year, "start": 0.0,
        "resolution": "month",
        "band": {"lower_percentile": st["band"][0], "upper_percentile": st["band"][1]},
        "reference_period": ref, "past_years": st["past_years"],
        "months": months,
    }


def month_source(year: int, month: int, data_through: date) -> str | None:
    """Where a month's counts come from: real Aqua through the record switch, converted VIIRS after; null outside the record."""
    if record.month_state(year, month, data_through=data_through)[0] == "null":
        return None
    return "aqua_real" if (year, month) <= (record.AQUA_LAST.year, record.AQUA_LAST.month) else "viirs_converted"


def world_cells(v: Version, year: int, month: int, regions: dict) -> dict:
    """Story 8.9: every 1-degree cell the store holds, for one month. Cells outside the loaded extents
    are absent (not zero), and so are the cells of an extent whose month has no feeding day loaded.
    Until the world store exists this is the evaluated regions' extents; `coverage` says which."""
    cs = v.evidence
    keep = np.zeros(len(cs), bool)
    boxes = shapely.box(cs["sw_lon"], cs["sw_lat"], cs["sw_lon"] + 1, cs["sw_lat"] + 1)
    for name, box in v.extents.items():
        if (year, month) not in v.uncovered(name):
            keep |= shapely.covers(box, boxes)
    cs = cs[keep].reset_index(drop=True)
    src = month_source(year, month, v.data_through)
    return {"record_version": v.record_version, "data_through": v.data_through.isoformat(),
            "month": f"{year:04d}-{month:02d}", "source": src, "size_deg": 1,
            "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
            "coverage": meta(v, regions)["coverage"],
            "cells": [{k: x for k, x in c.items() if k != "size_deg"} | {"source": src} for c in _cell_rows(v, cs, year, month)]}
