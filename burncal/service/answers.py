"""/meta, /calendar and /cells answers from a published version (Stories 2.6, 3.1).

Every number comes from core (record, stats, grids) unrounded; this module rounds once: counts to
1 decimal, ratios and percentages to 2. The current-month card is Story 3.2 and is null until then.
"""
from datetime import date

import numpy as np
import shapely

from burncal.core import aoi as core_aoi
from burncal.core import regions as core_regions
from burncal.core import grids, record, stats
from burncal.service.store import SATELLITES, Version

CONTRACT_VERSION = "0.2.0"
UNIT_LABEL = "hotspots, Aqua MODIS units"
EVIDENCE = ("tuned", "tested_unseen", "reported_only", "not_evaluated")


def r1(x):
    return None if x is None else round(float(x), 1)


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
        "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
        "coverage": {"global": False, "regions": [
            {"region_id": rid, "name": name, "evidence_class": ev,
             "status": "loaded" if shapely.covers(v.extent, geom) else "not_loaded"}
            for rid, (name, ev, geom) in regions.items()]},
        "noaa20_check": None,
    }


def _aoi(v: Version, geom, name, regions) -> tuple[dict, object]:
    cells = v.cells_1deg_of(geom)
    counts = {k: int((cells["evidence_class"] == k).sum()) for k in EVIDENCE}
    caveat = core_regions.region_caveat(geom, {rid: g for rid, (_, _, g) in regions.items()})
    return {"aoi_id": core_aoi.aoi_id(geom), "name": name, "area_km2": r1(core_aoi.area_km2(geom)),
            "evidence_class_counts": counts, "region_caveat": caveat}, cells


def r2(x):
    return None if x is None else round(float(x), 2)


def _ym(t):
    return f"{t[0]:04d}-{t[1]:02d}"


def calendar(v: Version, geom, name, start: date, end: date, regions: dict) -> dict:
    aoi, cells = _aoi(v, geom, name, regions)
    sums = v.count(geom)
    flags = v.flag_counts(cells)
    inputs = v.month_inputs()
    dt = v.data_through
    record_months = [(y, m) for y in range(2002, dt.year + 1) for m in range(1, 13)
                     if record.month_state(y, m, data_through=dt)[0] != "null"]
    series = {t: float(sums[(t[0] - 2002) * 12 + t[1] - 1, 0]) for t in record_months}
    complete = {t for t in record_months if not any(
        r in ("record_start", "data_through", "missing_days") for r in record.partial_reasons(
            t[0], t[1], data_through=dt, missing_days=t in v.missing, start=date(t[0], t[1], 1), end=dt))}
    shown = [(y, m) for y in range(start.year, end.year + 1) for m in range(1, 13)]
    in_range = {t for t in shown if (t[0], t[1]) >= (start.year, start.month) and (t[0], t[1]) <= (end.year, end.month)}
    ref_years = record.meta_dates(dt)["reference_period"]
    st = stats.summarize(series, complete, shown, in_range=in_range,
                         reference_years=(ref_years["start_year"], ref_years["end_year"]))
    breaks = st["colour_breaks"]
    months = []
    for t in shown:
        year, month = t
        k = (year - 2002) * 12 + month - 1
        ins = inputs.get(t, [])
        reasons = record.partial_reasons(year, month, data_through=dt, missing_days=t in v.missing, start=start, end=end)
        in_record = t in series
        value = series.get(t)
        med, mean = st["reference"][month] if in_record else (None, None)
        cmp = stats.compare(value, med, mean)
        days = {i["satellite"]: i["days"] for i in ins}
        fl = flags.loc[t] if in_record and t in flags.index else None
        months.append({
            "month": _ym(t),
            "count": r1(value),
            "null_reason": None if in_record else "outside_record",
            "source": None if not in_record else ("aqua_real" if t <= (2021, 12) else "viirs_converted"),
            "inputs": ins,
            "raw": {s.lower(): (int(round(sums[k, j + 1])) if in_record and days.get(s, 0) > 0 else None)
                    for j, s in enumerate(SATELLITES)},
            "complete": t in complete,
            "partial_reasons": reasons,
            "validated_satellite": all(i["satellite"] in ("SNPP", "AQUA") for i in ins if i["feeds_record"]),
            "reference_year": bool(grids.reference_year(year)),
            "provisional": in_record and t not in complete,
            "median": r1(med), "reference_mean": r1(mean), "no_typical_activity": cmp["no_typical_activity"],
            "ratio_to_median": r2(cmp["ratio_to_median"]), "anomaly_count": r1(cmp["anomaly_count"]),
            "anomaly_pct": r2(cmp["anomaly_pct"]),
            "colour_class": stats.class_index(r1(value), breaks),
            "anomaly_class": stats.class_index(r2(cmp["anomaly_pct"]), stats.ANOMALY_BREAKS),
            "cells_flagged_strong": int(fl["strong"]) if fl is not None else 0,
            "cells_flagged_marginal": int(fl["marginal"]) if fl is not None else 0,
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
    }


def _card(v: Version, geom, complete, ref_years, months) -> dict:
    """The current-month card (AD-15): days 1 to d against the same days of each complete reference year."""
    dt = v.data_through
    years = [y for y in range(ref_years["start_year"], ref_years["end_year"] + 1) if (y, dt.month) in complete]
    to_date, by_year = v.same_days(geom, dt.month, dt.day, years)
    cmp = stats.same_days(to_date, by_year)
    now = next((m for m in months if m["month"] == _ym((dt.year, dt.month))), None)
    ins = v.month_inputs().get((dt.year, dt.month), [])
    flags = v.flag_counts(v.cells_1deg_of(geom))
    fl = flags.loc[(dt.year, dt.month)] if (dt.year, dt.month) in flags.index else None
    return {
        "month": _ym((dt.year, dt.month)), "day": dt.day,
        "count_to_date": r1(to_date),
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


def cells(v: Version, geom, year: int, month: int) -> dict:
    """The area's whole 1-degree cells for one month, each with its own count, threshold and flag."""
    cs = v.cells_1deg_of(geom)
    boxes = shapely.box(cs["sw_lon"], cs["sw_lat"], cs["sw_lon"] + 1, cs["sw_lat"] + 1)
    partly = ~shapely.covers(geom, boxes)
    f = v.flags[(v.flags["year"] == year) & (v.flags["month"] == month)]
    f = cs.merge(f, on=["sw_lon", "sw_lat"], how="left")
    out = []
    for r, part in zip(f.itertuples(), partly):
        out.append({"sw_lon": int(r.sw_lon), "sw_lat": int(r.sw_lat), "size_deg": 1,
                    "flag_state": r.flag_state if isinstance(r.flag_state, str) else "outside_record",
                    "count": None if np.isnan(r.count) else r1(r.count),
                    "threshold": None if np.isnan(r.threshold) else r1(r.threshold),
                    "partly_inside": bool(part), "evidence_class": r.evidence_class,
                    "provisional": bool(r.provisional) if isinstance(r.provisional, (bool, np.bool_)) else False,
                    "reference_year": bool(grids.reference_year(year))})
    return {"record_version": v.record_version, "data_through": v.data_through.isoformat(),
            "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
            "month": f"{year:04d}-{month:02d}",
            "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
            "cells": out}
