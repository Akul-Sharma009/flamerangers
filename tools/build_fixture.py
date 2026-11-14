"""Builds the placeholder fixtures in contract/fixture/.

Every count here is INVENTED. The fixtures exist so the web and the service stub
can be built before the real record is published; /meta carries
`placeholder: true` for that reason. This is not product code: the real
statistics live in burncal/core.

Run: uv run python tools/build_fixture.py
"""

import calendar
import hashlib
import json
import math
import statistics
from pathlib import Path

from shapely.geometry import Polygon, box

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "contract" / "fixture"

RECORD_VERSION = "20261114-1a2b3c4d"
DATA_THROUGH = "2026-11-13"
CURRENT = (2026, 11)
DAY = 13
UNIT = "hotspots, Aqua MODIS units"
REFERENCE = {"start_year": 2003, "end_year": 2025}
FLAG_YEARS = {"start_year": 2003, "end_year": 2011}
ANOMALY_BREAKS = [-100, -50, -20, 20, 50, 100]

SUMATRA = [
    (94.8, 6.3), (97.5, 6.3), (99.4, 4.4), (100.7, 3.0), (101.9, 2.2), (103.3, 1.15),
    (104.0, 0.5), (105.0, -0.9), (107.0, -1.5), (107.0, -3.4), (106.1, -5.5),
    (105.87, -5.9), (105.4, -6.25), (103.5, -6.6), (98.0, -3.5), (94.8, 1.5),
]


def noise(*key):
    """A repeatable number in [0, 1) from any key."""
    digest = hashlib.sha256(repr(key).encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def r1(x):
    return None if x is None else round(x + 0.0, 1)


def r2(x):
    return None if x is None else round(x + 0.0, 2)


def ym(y, m):
    return f"{y}-{m:02d}"


def area_km2(ring):
    """Spherical polygon area; good enough for a placeholder."""
    total = 0.0
    pts = ring + [ring[0]]
    for (lon1, lat1), (lon2, lat2) in zip(pts, pts[1:]):
        total += math.radians(lon2 - lon1) * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return round(abs(total) * 6371.0088**2 / 2, 1)


def cells_of(ring):
    """South-west corners of the 1 degree cells a polygon overlaps, and whether each is only partly inside."""
    poly = Polygon(ring)
    minx, miny, maxx, maxy = poly.bounds
    out = []
    for lon in range(math.floor(minx), math.ceil(maxx)):
        for lat in range(math.floor(miny), math.ceil(maxy)):
            cell = box(lon, lat, lon + 1, lat + 1)
            part = poly.intersection(cell).area
            if part > 0:
                out.append((lon, lat, part < cell.area - 1e-9))
    return out


def competition_ranks(values):
    """Rank 1 = highest; equal values share a rank."""
    ordered = sorted(values, reverse=True)
    return [ordered.index(v) + 1 for v in values]


def colour_class(value, breaks):
    idx = 0
    for i, b in enumerate(breaks):
        if value >= b:
            idx = i
    return idx


def raw_and_inputs(y, m, base, days_missing):
    """Invented raw counts and the inputs list, following the real satellite dates."""
    n = calendar.monthrange(y, m)[1]
    t = (y, m)
    nrt = t >= (2026, 9)  # standard MODIS and VIIRS data ran to 31 Aug 2026
    quality = "NRT" if nrt else "SP"
    raw = {"aqua": None, "terra": None, "snpp": None, "noaa20": None, "noaa21": None}
    inputs = []

    def add(sat, key, factor, days, feeds):
        raw[key] = int(round(base * factor * (0.9 + 0.2 * noise(sat, y, m))))
        inputs.append({"satellite": sat, "quality": quality, "days": days, "feeds_record": feeds})

    span = DAY if t == CURRENT else n
    if t == (2002, 7):
        span = 28  # Aqua's record starts on 4 July 2002
    add("AQUA", "aqua", 1.0, span - days_missing, t <= (2021, 12))
    add("TERRA", "terra", 0.8, span, False)
    if (2012, 2) <= t <= (2026, 10):
        add("SNPP", "snpp", 4.6, span - (days_missing if t >= (2022, 1) else 0), t >= (2022, 1))
    if t == CURRENT:
        add("SNPP", "snpp", 4.6 * 2 / DAY, 2, True)  # Suomi NPP fed 1 and 2 November 2026
    if t >= (2018, 1):
        days = DAY - 2 if t == CURRENT else span
        add("NOAA20", "noaa20", 4.5, days, t == CURRENT)
    if t >= (2023, 3):
        add("NOAA21", "noaa21", 4.4, span, False)
    return raw, inputs


def build_calendar(name, ring, start, end, profile, year_factor, scale, *, cautions=(), caveat="none",
                   evidence="tuned", missing=(), not_loaded_before=None, forced_cells=None):
    y0, y1 = int(start[:4]), int(end[:4])
    cells = cells_of(ring)
    cells_total = len(cells)

    def value(y, m):
        v = scale * profile[m - 1] * year_factor(y) * (0.55 + 0.9 * noise(name, y, m))
        return 0.0 if v < 0.5 else v

    # Unrounded whole-record series, used for the reference statistics.
    series = {}
    for y in range(2002, CURRENT[0] + 1):
        for m in range(1, 13):
            t = (y, m)
            if t < (2002, 7) or t > CURRENT:
                continue
            v = value(y, m)
            if t <= (2021, 12):
                v = float(round(v))  # real Aqua counts are whole numbers
            if t == CURRENT:
                v *= DAY / 30
            series[t] = v

    def complete(t):
        return t in series and t not in ((2002, 7), CURRENT) and t not in missing

    ref = {m: [series[(y, m)] for y in range(REFERENCE["start_year"], REFERENCE["end_year"] + 1) if complete((y, m))]
           for m in range(1, 13)}
    med = {m: statistics.median(ref[m]) for m in range(1, 13)}
    mean = {m: statistics.fmean(ref[m]) for m in range(1, 13)}

    shown = [(y, m) for y in range(y0, y1 + 1) for m in range(1, 13)]
    in_range = lambda t: ym(*t) >= start[:7] and ym(*t) <= end[:7]
    loaded = lambda t: not_loaded_before is None or t >= not_loaded_before
    rankable = [t for t in shown if complete(t) and in_range(t) and loaded(t)]
    month_rank = dict(zip(rankable, competition_ranks([r1(series[t]) for t in rankable])))
    positive = sorted(r1(series[t]) for t in shown if t in series and series[t] > 0)
    if positive:
        q = lambda p: positive[min(len(positive) - 1, int(p * len(positive)))]
        breaks = sorted({0, 1, math.floor(q(0.3)), math.floor(q(0.55)), math.floor(q(0.75)), math.floor(q(0.9)), math.floor(q(0.97))})
    else:
        breaks = [0, 1]

    months = []
    for t in shown:
        y, m = t
        base = {"month": ym(y, m)}
        if t not in series or not loaded(t):
            reason = "outside_coverage" if t in series else "outside_record"
            months.append({**base, "count": None, "null_reason": reason, "source": None, "inputs": [],
                           "raw": {"aqua": None, "terra": None, "snpp": None, "noaa20": None, "noaa21": None},
                           "complete": False, "partial_reasons": [], "validated_satellite": False,
                           "reference_year": False, "provisional": False,
                           "median": None, "reference_mean": None, "no_typical_activity": False,
                           "ratio_to_median": None, "anomaly_count": None, "anomaly_pct": None,
                           "colour_class": None, "anomaly_class": None,
                           "cells_flagged_strong": 0, "cells_flagged_marginal": 0, "cells_total": cells_total, "rank": None})
            continue
        v = series[t]
        reasons = []
        if t == (2002, 7):
            reasons.append("record_start")
        if t == CURRENT:
            reasons.append("data_through")
        if t in missing:
            reasons.append("missing_days")
        if not (start <= f"{ym(y, m)}-01" and f"{ym(y, m)}-{calendar.monthrange(y, m)[1]:02d}" <= end):
            if in_range(t):
                reasons.append("range_cut")
        raw, inputs = raw_and_inputs(y, m, max(v, 0.0), 3 if t in missing else 0)
        if t <= (2021, 12):
            raw["aqua"] = int(v)
        ratio = None if med[m] == 0 else v / med[m]
        anomaly = v - mean[m]
        pct = None if mean[m] == 0 else 100 * anomaly / mean[m]
        if forced_cells and t in forced_cells:
            strong, marginal = forced_cells[t]
        elif v >= 10 * cells_total / 4 and ratio is not None and ratio > 1.4:
            strong = min(cells_total, int(cells_total * min(0.5, (ratio - 1.4) / 6)))
            marginal = min(cells_total - strong, 1 + int(cells_total * min(0.3, (ratio - 1.0) / 10)))
        else:
            strong, marginal = 0, 0
        months.append({
            **base, "count": r1(v), "null_reason": None,
            "source": "aqua_real" if t <= (2021, 12) else "viirs_converted",
            "inputs": inputs, "raw": raw,
            "complete": complete(t), "partial_reasons": reasons,
            "validated_satellite": t != CURRENT,
            "reference_year": FLAG_YEARS["start_year"] <= y <= FLAG_YEARS["end_year"],
            "provisional": not complete(t),
            "median": r1(med[m]), "reference_mean": r1(mean[m]), "no_typical_activity": med[m] == 0,
            "ratio_to_median": r2(ratio), "anomaly_count": r1(anomaly), "anomaly_pct": r2(pct),
            "colour_class": colour_class(r1(v), breaks),
            "anomaly_class": None if pct is None else colour_class(pct, ANOMALY_BREAKS),
            "cells_flagged_strong": strong, "cells_flagged_marginal": marginal, "cells_total": cells_total,
            "rank": month_rank.get(t),
        })

    totals = {}
    for y in range(y0, y1 + 1):
        vals = [series[(y, m)] for m in range(1, 13) if (y, m) in series and loaded((y, m))]
        totals[y] = (sum(vals) if vals else None, all(complete((y, m)) and loaded((y, m)) for m in range(1, 13)))
    rank_years = [y for y, (tot, ok) in totals.items() if ok and in_range((y, 1)) and in_range((y, 12))]
    year_rank = dict(zip(rank_years, competition_ranks([r1(totals[y][0]) for y in rank_years])))
    biggest = max([tot for tot, _ in totals.values() if tot is not None], default=None)
    year_totals = [{"year": y, "total": r1(tot), "complete": ok, "rank": year_rank.get(y),
                    "share_of_max": None if tot is None or not biggest else r2(tot / biggest)}
                   for y, (tot, ok) in totals.items()]

    by_cal = {m: [series[t] for t in rankable if t[1] == m] for m in range(1, 13)}
    cal_means = [(m, statistics.fmean(v)) for m, v in by_cal.items() if v]
    cal_ranks = competition_ranks([r1(v) for _, v in cal_means])
    busiest = sorted(({"calendar_month": m, "mean_count": r1(v), "rank": rk} for (m, v), rk in zip(cal_means, cal_ranks)),
                     key=lambda d: (d["rank"], d["calendar_month"]))
    all_complete = [t for t in series if complete(t) and loaded(t)]
    high = max(all_complete, key=lambda t: series[t], default=None)

    current = None
    if loaded(CURRENT) and y1 == CURRENT[0]:
        m = CURRENT[1]
        same = [{"year": y, "count": r1(series[(y, m)] * DAY / 30 * (0.8 + 0.4 * noise(name, "same", y)))}
                for y in range(REFERENCE["start_year"], REFERENCE["end_year"] + 1)]
        same_med = statistics.median(d["count"] for d in same)
        to_date = series[CURRENT]
        now = months[-2] if months[-1]["month"] != ym(*CURRENT) else months[-1]
        current = {
            "month": ym(*CURRENT), "day": DAY, "count_to_date": r1(to_date), "same_days_median": r1(same_med),
            "no_typical_activity": same_med == 0, "ratio": None if same_med == 0 else r2(to_date / same_med),
            "difference": r1(to_date - same_med), "reference_period": REFERENCE, "same_days_by_year": same,
            "cells_flagged_strong": now["cells_flagged_strong"], "cells_flagged_marginal": now["cells_flagged_marginal"],
            "cells_total": cells_total, "quality": "NRT",
            "validated_satellite": False, "monthly_validation_only": True,
        }

    counts = {"tuned": 0, "tested_unseen": 0, "reported_only": 0, "not_evaluated": 0}
    counts[evidence] = cells_total
    return {
        "record_version": RECORD_VERSION, "data_through": DATA_THROUGH,
        "cautions": [{"code": c} for c in cautions], "unit_label": UNIT,
        "aoi": {"aoi_id": hashlib.sha256(json.dumps(ring).encode()).hexdigest()[:16], "name": name,
                "area_km2": area_km2(ring), "evidence_class_counts": counts, "region_caveat": caveat},
        "range": {"start": start, "end": end},
        "reference_period": REFERENCE, "flag_reference_years": FLAG_YEARS,
        "months": months, "year_totals": year_totals,
        "calendar_month_medians": [{"calendar_month": m, "median": r1(med[m]), "reference_mean": r1(mean[m]),
                                    "no_typical_activity": med[m] == 0} for m in range(1, 13)],
        "statistics": {
            "colour_breaks": breaks, "anomaly_breaks": ANOMALY_BREAKS,
            "top_months": sorted(({"month": ym(*t), "count": r1(series[t]), "rank": rk}
                                  for t, rk in month_rank.items() if rk <= 5), key=lambda d: (d["rank"], d["month"])),
            "top_years": sorted(({"year": y, "total": r1(totals[y][0]), "rank": rk}
                                 for y, rk in year_rank.items() if rk <= 5), key=lambda d: (d["rank"], d["year"])),
            "busiest_calendar_months": busiest,
            "record_high": None if high is None else {"month": ym(*high), "count": r1(series[high])},
        },
        "current_month": current,
    }


def build_cells(ring, month, strong_n, marginal_n, evidence="tuned", provisional=False):
    """Sumatra cells for one month, with flag counts that match the calendar's."""
    out = []
    cells = cells_of(ring)
    order = sorted(range(len(cells)), key=lambda i: noise("cell", month, i))
    for position, i in enumerate(order):
        lon, lat, partly = cells[i]
        threshold = r1(6 + 60 * noise("thr", lon, lat))
        if position < strong_n:
            state, count = "strong", r1(max(10, threshold) * (1.6 + noise("c", lon, lat)))
        elif position < strong_n + marginal_n:
            state, count = "marginal", r1(max(10.1, threshold * 1.2))
        elif noise("low", lon, lat, month) < 0.35:
            state, count = "not_flaggable", r1(9 * noise("c", lon, lat))
        else:
            state, count = "none", r1(max(10, threshold * (0.3 + 0.6 * noise("c", lon, lat))))
            if count > threshold:
                count = threshold
        out.append({"sw_lon": lon, "sw_lat": lat, "size_deg": 1, "flag_state": state, "count": count,
                    "threshold": threshold, "partly_inside": partly, "evidence_class": evidence,
                    "provisional": provisional, "reference_year": False})
    out.sort(key=lambda c: (c["sw_lat"], c["sw_lon"]))
    return {"record_version": RECORD_VERSION, "data_through": DATA_THROUGH, "cautions": [],
            "month": month, "flag_reference_years": FLAG_YEARS, "cells": out}


def encode(obj, depth=0):
    """JSON with each item of a list of objects on one line, so files stay short and diffs readable."""
    pad = "  " * depth
    if isinstance(obj, dict) and obj:
        body = ",\n".join(f'{pad}  {json.dumps(k)}: {encode(v, depth + 1)}' for k, v in obj.items())
        return "{\n" + body + "\n" + pad + "}"
    if isinstance(obj, list) and obj and all(isinstance(i, dict) for i in obj):
        body = ",\n".join(pad + "  " + json.dumps(i, ensure_ascii=False) for i in obj)
        return "[\n" + body + "\n" + pad + "]"
    return json.dumps(obj, ensure_ascii=False)


def dump(path, doc, _unused=()):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(encode(doc) + "\n", encoding="utf-8")


def problem(code, status, title, **extra):
    return {"type": f"https://burncal.invalid/problems/{code}", "title": title, "status": status, "code": code,
            "record_version": RECORD_VERSION, "data_through": DATA_THROUGH, **extra}


def main():
    sumatra_profile = [0.35, 0.75, 0.7, 0.3, 0.35, 0.7, 1.0, 1.6, 2.4, 1.7, 0.45, 0.25]
    big_years = {2002: 1.5, 2004: 1.4, 2006: 2.1, 2009: 1.5, 2012: 1.3, 2014: 1.9, 2015: 3.2, 2019: 2.4, 2023: 1.4}
    forced = {(2015, 9): (19, 9)}
    sumatra = build_calendar("Sumatra", SUMATRA, "2002-07-01", DATA_THROUGH, sumatra_profile,
                             lambda y: big_years.get(y, 0.8), 2600, missing={(2022, 8)}, forced_cells=forced)
    lists = ("months", "year_totals", "calendar_month_medians", "statistics.top_months", "statistics.top_years",
             "statistics.busiest_calendar_months")
    dump(OUT / "calendar.json", sumatra, lists + ("current_month.same_days_by_year",))
    dump(OUT / "cells.json", build_cells(SUMATRA, "2015-09", *forced[(2015, 9)]), ("cells",))

    # Examples of states Sumatra cannot show. They assume a store with wider coverage than the Sumatra fixture.
    small = [(27.4, -13.6), (27.6, -13.6), (27.6, -13.4), (27.4, -13.4)]
    quiet = [0, 0, 0, 0, 0.4, 1.2, 2.5, 3.0, 2.2, 0.6, 0, 0]
    dump(OUT / "examples" / "calendar_small_savanna_area.json",
         build_calendar(None, small, "2025-01-15", DATA_THROUGH, quiet, lambda y: 1.0, 6,
                        cautions=("scale_below_1deg", "scale_below_025deg"), caveat="southern_africa",
                        evidence="tested_unseen"), lists + ("current_month.same_days_by_year",))
    borneo = [(113.2, -2.9), (114.7, -2.9), (114.7, -1.4), (113.2, -1.4)]
    dump(OUT / "examples" / "calendar_untuned_area.json",
         build_calendar("Central Kalimantan box", borneo, "2025-01-01", DATA_THROUGH, sumatra_profile,
                        lambda y: big_years.get(y, 0.8), 500, caveat="untuned_region", evidence="not_evaluated",
                        not_loaded_before=(2025, 4)), lists + ("current_month.same_days_by_year",))

    def cell(lon, lat, state, count, threshold, evidence, **kw):
        return {"sw_lon": lon, "sw_lat": lat, "size_deg": 1, "flag_state": state, "count": count, "threshold": threshold,
                "partly_inside": kw.get("partly", False), "evidence_class": evidence,
                "provisional": kw.get("provisional", False), "reference_year": kw.get("reference_year", False)}

    dump(OUT / "examples" / "cells_every_state.json", {
        "record_version": RECORD_VERSION, "data_through": DATA_THROUGH, "cautions": [{"code": "scale_below_1deg"}],
        "month": "2026-11", "flag_reference_years": FLAG_YEARS,
        "cells": [
            cell(101, 0, "strong", 31.5, 18.0, "tuned", provisional=True),
            cell(27, -14, "marginal", 24.0, 21.5, "tested_unseen", provisional=True, partly=True),
            cell(75, 30, "none", 12.0, 40.2, "reported_only", provisional=True),
            cell(114, -2, "not_flaggable", 3.0, 7.5, "not_evaluated", provisional=True),
            cell(-170, 65, "outside_record", None, None, "not_evaluated"),
        ]}, ("cells",))
    dump(OUT / "examples" / "cells_reference_year.json", {
        "record_version": RECORD_VERSION, "data_through": DATA_THROUGH, "cautions": [],
        "month": "2006-10", "flag_reference_years": FLAG_YEARS,
        "cells": [cell(102, -1, "none", 96.0, 96.0, "tuned", reference_year=True)]}, ("cells",))

    regions = [("sumatra", "Sumatra", "loaded", "tuned"), ("australia_grassland", "Australian grassland", "not_loaded", "tuned"),
               ("amazon_forest", "Amazon forest", "not_loaded", "tuned"),
               ("southern_africa", "Southern African savanna", "not_loaded", "tested_unseen"),
               ("siberia", "Siberian boreal forest", "not_loaded", "tested_unseen"),
               ("punjab", "Punjab cropland", "not_loaded", "reported_only")]
    meta = {
        "contract_version": "0.2.0", "record_version": RECORD_VERSION, "data_through": DATA_THROUGH,
        "placeholder": True, "unit_label": UNIT, "record_start": "2002-07",
        "record_switch": {"aqua_through": "2021-12", "viirs_from": "2022-01"},
        "satellite_switch": {"snpp_through": "2026-11-02", "noaa20_from": "2026-11-03"},
        "current_month": ym(*CURRENT), "data_through_day": DAY,
        "reference_period": REFERENCE, "flag_reference_years": FLAG_YEARS,
        "coverage": {"global": False, "regions": [dict(zip(("region_id", "name", "status", "evidence_class"), r)) for r in regions]},
        "noaa20_check": None,
    }
    dump(OUT / "meta.json", meta)
    figures = lambda k: {"mean_abs_difference": r1(1.5 + 6 * noise("n20", k)), "bias_pct": r1(-6 + 12 * noise("n20b", k)),
                         "cell_months": 1000 + int(4000 * noise("n20c", k))}
    dump(OUT / "examples" / "meta_after_noaa20_check.json", {**meta, "noaa20_check": {
        "reported_only": True, "validated_against_aqua": False, "period_start": "2022-01", "period_end": "2026-10",
        "pooled": figures("pooled"),
        "regions": [{"region_id": r[0], "name": r[1], "figures": figures(r[0])} for r in regions]}})

    dump(OUT / "hotspot_rows.json", {"rows": [
        {"latitude": 0.5213, "longitude": 101.3127, "acq_datetime_utc": "2015-09-14T06:12:00Z", "satellite": "AQUA",
         "instrument": "MODIS", "confidence": "85", "frp": 42.4, "daynight": "D", "type": 0, "quality": "SP",
         "feeds_record": True, "excluded_reason": "none", "weight": 1.0},
        {"latitude": 0.5302, "longitude": 101.3251, "acq_datetime_utc": "2015-09-14T03:31:00Z", "satellite": "TERRA",
         "instrument": "MODIS", "confidence": "71", "frp": 18.9, "daynight": "D", "type": 0, "quality": "SP",
         "feeds_record": False, "excluded_reason": "none", "weight": 0.0},
        {"latitude": -2.9871, "longitude": 104.7533, "acq_datetime_utc": "2023-09-02T06:48:00Z", "satellite": "SNPP",
         "instrument": "VIIRS", "confidence": "n", "frp": 6.3, "daynight": "D", "type": 0, "quality": "SP",
         "feeds_record": True, "excluded_reason": "none", "weight": 0.2714},
        {"latitude": 1.6644, "longitude": 101.4409, "acq_datetime_utc": "2023-09-02T18:21:00Z", "satellite": "SNPP",
         "instrument": "VIIRS", "confidence": "h", "frp": 3.1, "daynight": "N", "type": 2, "quality": "SP",
         "feeds_record": True, "excluded_reason": "static", "weight": 0.0},
        {"latitude": 3.9105, "longitude": 98.9902, "acq_datetime_utc": "2026-11-05T06:02:00Z", "satellite": "NOAA20",
         "instrument": "VIIRS", "confidence": "l", "frp": 1.4, "daynight": "D", "type": None, "quality": "NRT",
         "feeds_record": True, "excluded_reason": "offshore", "weight": 0.0},
        {"latitude": -0.4418, "longitude": 102.3376, "acq_datetime_utc": "2026-11-05T06:51:00Z", "satellite": "NOAA21",
         "instrument": "VIIRS", "confidence": "n", "frp": 4.8, "daynight": "D", "type": None, "quality": "NRT",
         "feeds_record": False, "excluded_reason": "none", "weight": 0.0},
    ]}, ("rows",))

    p = OUT / "problems"
    dump(p / "invalid_aoi.json", problem("invalid_aoi", 400, "The area is not valid",
                                         detail="The polygon is not closed: its last point differs from its first."))
    dump(p / "no_land.json", problem("no_land", 422, "No land in this area"))
    dump(p / "outside_coverage.json", problem("outside_coverage", 404, "This area is not loaded yet"))
    dump(p / "too_large_for_sync.json", problem("too_large_for_sync", 413, "This download is large",
                                                estimated_rows=4200000, estimated_megabytes=610.0,
                                                years=list(range(2002, 2027))))
    dump(p / "version_superseded.json", {**problem("version_superseded", 410, "A newer record version is available"),
                                         "record_version": "20261101-aaaaaaaa", "data_through": "2026-11-01",
                                         "current_record_version": RECORD_VERSION})
    dump(p / "rate_limited.json", problem("rate_limited", 429, "Too many requests", retry_after_seconds=30))


if __name__ == "__main__":
    main()
