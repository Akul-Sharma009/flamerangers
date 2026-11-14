"""Story 2.6: /meta and /calendar answers from a published version. The service rounds once here.

Statistics (medians, means, anomalies, classes, rankings) and the current-month card are Stories 3.1
and 3.2; until then those fields are null or empty, as the contract allows.
"""
from datetime import date

import numpy as np
import shapely

from burncal.core import aoi as core_aoi
from burncal.core import regions as core_regions
from burncal.core import grids, record
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


def calendar(v: Version, geom, name, start: date, end: date, regions: dict) -> dict:
    aoi, cells = _aoi(v, geom, name, regions)
    sums = v.count(geom)
    flags = v.flag_counts(cells)
    inputs = v.month_inputs()
    months, year_totals = [], []
    for year in range(start.year, end.year + 1):
        ycounts, ycomplete = [], True
        for month in range(1, 13):
            k = (year - 2002) * 12 + month - 1
            state, _ = record.month_state(year, month, data_through=v.data_through)
            ins = inputs.get((year, month), [])
            reasons = record.partial_reasons(year, month, data_through=v.data_through,
                                             missing_days=(year, month) in v.missing, start=start, end=end)
            complete = not any(r in ("record_start", "data_through", "missing_days") for r in reasons)
            ycomplete &= complete and state != "null"
            in_record = state != "null"
            days = {i["satellite"]: i["days"] for i in ins}
            count = r1(sums[k, 0]) if in_record and 0 <= k < len(sums) else None
            ycounts.append(sums[k, 0] if count is not None else None)
            fl = flags.loc[(year, month)] if (year, month) in flags.index else None
            months.append({
                "month": f"{year:04d}-{month:02d}",
                "count": count,
                "null_reason": None if count is not None else "outside_record",
                "source": None if count is None else ("aqua_real" if (year, month) <= (2021, 12) else "viirs_converted"),
                "inputs": ins,
                "raw": {s.lower(): (int(round(sums[k, j + 1])) if in_record and days.get(s, 0) > 0 else None)
                        for j, s in enumerate(SATELLITES)},
                "complete": complete,
                "partial_reasons": reasons,
                "validated_satellite": all(i["satellite"] in ("SNPP", "AQUA") for i in ins if i["feeds_record"]),
                "reference_year": bool(grids.reference_year(year)),
                "provisional": not complete,
                "median": None, "reference_mean": None, "no_typical_activity": False, "ratio_to_median": None,
                "anomaly_count": None, "anomaly_pct": None,
                "colour_class": None, "anomaly_class": None,
                "cells_flagged_strong": int(fl["strong"]) if fl is not None and in_record else 0,
                "cells_flagged_marginal": int(fl["marginal"]) if fl is not None and in_record else 0,
                "cells_total": len(cells),
                "rank": None,
            })
        vals = [c for c in ycounts if c is not None]
        year_totals.append({"year": year, "total": r1(sum(vals)) if vals else None, "complete": ycomplete,
                            "rank": None, "share_of_max": None})
    top = max((t["total"] for t in year_totals if t["total"] is not None), default=None)
    for t in year_totals:
        t["share_of_max"] = round(t["total"] / top, 2) if top and t["total"] is not None else None
    return {
        "record_version": v.record_version, "data_through": v.data_through.isoformat(),
        "cautions": [{"code": c} for c in core_aoi.scale_cautions(geom)],
        "unit_label": UNIT_LABEL, "aoi": aoi, "range": {"start": start.isoformat(), "end": end.isoformat()},
        "reference_period": record.meta_dates(v.data_through)["reference_period"],
        "flag_reference_years": {"start_year": grids.HISTORY_YEARS[0], "end_year": grids.HISTORY_YEARS[1]},
        "months": months, "year_totals": year_totals,
        "calendar_month_medians": [{"calendar_month": m, "median": None, "reference_mean": None,
                                    "no_typical_activity": False} for m in range(1, 13)],
        "statistics": {"colour_breaks": [], "anomaly_breaks": [], "top_months": [], "top_years": [],
                       "busiest_calendar_months": [], "record_high": None},
        "current_month": None,
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
