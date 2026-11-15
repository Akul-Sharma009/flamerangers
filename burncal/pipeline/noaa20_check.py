"""Story 2.10: converted NOAA-20 counts against converted Suomi NPP counts, reported only.

Run: uv run python -m burncal.pipeline.noaa20_check <land.geojson> <out.json> <region_id>,<clean dir> [...]

C1 is applied unchanged to each satellite's cleaned rows, January 2022 to October 2026, when both
flew. The test plan's error (mean absolute difference per 1-degree land cell-month) and bias
((NOAA-20 total - Suomi NPP total) / Suomi NPP total) are computed per region, at 1 degree and whole
region. Nothing is fitted or adjusted from the result, and no final-set data is read. This is not a
validation against Aqua.
"""
import hashlib
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from shapely.geometry import shape

from burncal.core import compare
from burncal.pipeline import c1_params, convert

PERIOD = (date(2022, 1, 1), date(2026, 10, 31))
TEST, REFERENCE = "NOAA20", "SNPP"
LABEL = ("Reported only, not a validation against Aqua: converted NOAA-20 counts against converted "
         "Suomi NPP counts, January 2022 to October 2026, C1 unchanged.")
KEY = ["sw_lon", "sw_lat", "year", "month"]


def _annotated_weights(df, params, geoms, history):
    out = convert.annotate(df, params, geoms, history)
    w = convert.c1_weights(out, params, np.ones(len(out), bool))
    return out, np.where(out["excluded_reason"].to_numpy() == "none", np.nan_to_num(w), 0.0)


def weights(df: pd.DataFrame, params: dict, geoms: dict, history: pd.DataFrame) -> np.ndarray:
    """C1 weight of every row (0 for excluded rows), whichever VIIRS satellite it comes from."""
    return _annotated_weights(df, params, geoms, history)[1]


def cell_month_counts(df, params, geoms, history, region_id) -> pd.DataFrame:
    """Converted count per 1-degree cell-month of rows inside the region and the period."""
    d = df["acq_datetime_utc"].dt.tz_convert(None).dt.date
    df = df[(d >= PERIOD[0]) & (d <= PERIOD[1])]
    if df.empty:
        return pd.DataFrame(columns=KEY + ["count"]).astype({"count": float})
    out, w = _annotated_weights(df, params, geoms, history)
    inside = out["region_id"].to_numpy() == region_id
    t = df["acq_datetime_utc"]
    tab = pd.DataFrame({"sw_lon": np.floor(df["longitude"].to_numpy(float)),
                        "sw_lat": np.floor(df["latitude"].to_numpy(float)),
                        "year": t.dt.year.to_numpy(), "month": t.dt.month.to_numpy(), "count": w})[inside]
    return tab.groupby(KEY, as_index=False)["count"].sum()


def land_cells(geom, land) -> list:
    """1-degree cells (south-west corners) whose box meets the region on land."""
    area = shapely.intersection(geom, land)
    x0, y0, x1, y1 = (int(np.floor(v)) for v in geom.bounds)
    return [(float(x), float(y)) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)
            if shapely.intersects(shapely.box(x, y, x + 1, y + 1), area)
            and shapely.area(shapely.intersection(shapely.box(x, y, x + 1, y + 1), area)) > 0]


def _months():
    m = pd.period_range(PERIOD[0], PERIOD[1], freq="M")
    return list(zip(m.year, m.month))


def _satellite(clean_dir, sat, params, geoms, history, region_id) -> pd.DataFrame:
    parts = [p for p in sorted(Path(clean_dir).glob(f"{sat}_*.parquet"))
             if PERIOD[0].year <= int(p.stem.split("_")[-1]) <= PERIOD[1].year]
    tabs = [cell_month_counts(pd.read_parquet(p), params, geoms, history, region_id) for p in parts]
    tabs = [t for t in tabs if not t.empty]
    return (pd.concat(tabs).groupby(KEY, as_index=False)["count"].sum() if tabs
            else pd.DataFrame(columns=KEY + ["count"]).astype({"count": float}))


def _history(clean_dir, geoms):
    lean = ["satellite", "acq_datetime_utc", "longitude", "latitude", "excluded_reason"]
    aqua = [p for p in sorted(Path(clean_dir).glob("AQUA_*.parquet"))
            if convert.HISTORY_YEARS[0] <= int(p.stem[5:]) <= convert.HISTORY_YEARS[1]]
    if not aqua:
        return convert.season_history(pd.DataFrame(columns=lean).astype({"acq_datetime_utc": "datetime64[ns, UTC]"}), geoms)
    return convert.season_history(pd.concat([pd.read_parquet(p, columns=lean) for p in aqua], ignore_index=True), geoms)


def region_tables(region_id, clean_dir, land, params, geoms) -> pd.DataFrame:
    """Every land cell-month of the region and the period, with both converted counts (0 where none)."""
    history = _history(clean_dir, geoms)
    test = _satellite(clean_dir, TEST, params, geoms, history, region_id).rename(columns={"count": "test"})
    ref = _satellite(clean_dir, REFERENCE, params, geoms, history, region_id).rename(columns={"count": "reference"})
    cells = set(land_cells(geoms[region_id], land))
    cells |= set(map(tuple, pd.concat([test, ref])[["sw_lon", "sw_lat"]].to_numpy().tolist()))
    grid = pd.DataFrame([(x, y, yr, mo) for x, y in sorted(cells) for yr, mo in _months()], columns=KEY)
    grid = grid.merge(test, on=KEY, how="left").merge(ref, on=KEY, how="left")
    return grid.fillna({"test": 0.0, "reference": 0.0})


def _figures(t: pd.DataFrame) -> dict:
    return {"1deg": compare.difference_figures(t["test"], t["reference"]),
            "region": compare.difference_figures(*(t.groupby(["year", "month"])[c].sum() for c in ("test", "reference")))}


def run(builds, land, *, params=None, geoms=None, names=None, code_revision=None) -> dict:
    params = params or c1_params.read_c1_params()
    if geoms is None or names is None:
        g, _ = convert.load_regions()
        gj = json.loads(convert.REGIONS_FILE.read_text(encoding="utf-8"))
        geoms = geoms or g
        names = names or {f["properties"]["region_id"]: f["properties"]["name"] for f in gj["features"]}
    tables, regions_out = [], {}
    for region_id, clean_dir in builds:
        t = region_tables(region_id, clean_dir, land, params, geoms)
        tables.append(t)
        regions_out[region_id] = {"name": names[region_id], **_figures(t)}
    pooled = pd.concat(tables, ignore_index=True)
    return {
        "label": LABEL,
        "test_satellite": "NOAA-20", "reference_satellite": "Suomi NPP",
        "period_start": f"{PERIOD[0]:%Y-%m}", "period_end": f"{PERIOD[1]:%Y-%m}",
        "error": "mean absolute difference per 1-degree land cell-month (whole region: per month)",
        "bias": "(NOAA-20 total minus Suomi NPP total) over Suomi NPP total, percent",
        "pooled": {"1deg": compare.difference_figures(pooled["test"], pooled["reference"])},
        "regions": regions_out,
        "params_sha256": hashlib.sha256(c1_params.PARAMS_FILE.read_bytes()).hexdigest(),
        "code_revision": code_revision,
    }


def headline(report: dict) -> dict:
    """The /meta figures (contract Noaa20Check), unrounded: pooled and per region at 1 degree."""
    pick = lambda f: {k: f[k] for k in ("mean_abs_difference", "bias_pct", "cell_months")}  # noqa: E731
    return {"reported_only": True, "validated_against_aqua": False,
            "period_start": report["period_start"], "period_end": report["period_end"],
            "pooled": pick(report["pooled"]["1deg"]),
            "regions": [{"region_id": r, "name": v["name"], "figures": pick(v["1deg"])}
                        for r, v in report["regions"].items()]}


if __name__ == "__main__":
    land = shapely.union_all([shape(f["geometry"]) for f in json.loads(Path(sys.argv[1]).read_text())["features"]])
    rev = subprocess.run(["git", "rev-parse", "--short=12", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    builds = [tuple(a.split(",")) for a in sys.argv[3:]]
    rep = run(builds, land, code_revision=rev)
    Path(sys.argv[2]).write_text(json.dumps(rep, indent=1))
    print(json.dumps({r: {s: {k: (round(v, 2) if isinstance(v, float) else v) for k, v in f.items()}
                          for s, f in x.items() if s != "name"} for r, x in rep["regions"].items()}, indent=1))
