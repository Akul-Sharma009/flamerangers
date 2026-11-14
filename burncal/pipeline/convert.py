"""Story 2.4: the convert step. Cleaned rows in, harmonized record rows out (AD-2 to AD-5).

Run: uv run python -m burncal.pipeline.convert <clean dir> <out dir> <coverage.json>
The build extent comes from coverage.json and must be whole 5-degree season tiles (lead's call, 14 Nov).
Adds region_id, rules_region, in_season, feeds_record, validated_satellite and weight to every row.
No row is removed. Prints counts only.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from shapely.geometry import shape

from burncal.core import c1, record, regions
from burncal.pipeline import c1_params

REGIONS_FILE = Path(__file__).resolve().parents[2] / "contract" / "regions.geojson"
HISTORY_YEARS = (2003, 2011)
# Row order fixes the 1A anchor tie rule (equal FRP goes to the earlier row).
ROW_ORDER = ["satellite", "acq_datetime_utc", "latitude", "longitude"]


def load_regions(path=REGIONS_FILE) -> tuple[dict, dict]:
    """(geometry by region_id, evidence_class by region_id) from the contract's regions file."""
    gj = json.loads(Path(path).read_text(encoding="utf-8"))
    geoms = {f["properties"]["region_id"]: shape(f["geometry"]) for f in gj["features"]}
    classes = {f["properties"]["region_id"]: f["properties"]["evidence_class"] for f in gj["features"]}
    return geoms, classes


def _season_key(df, region_id) -> np.ndarray:
    """Where a row's season comes from outside the tuning regions: its evaluated region, else its 5-degree tile."""
    return np.where(region_id != "", "r:" + region_id.astype(str),
                    "t:" + regions.tile_id(df["longitude"], df["latitude"]).astype(str))


def season_history(aqua: pd.DataFrame, geoms: dict) -> pd.DataFrame:
    """Kept Aqua rows of 2003-2011, totalled per season key and calendar month (12 columns)."""
    t = aqua["acq_datetime_utc"]
    year, month = t.dt.year.to_numpy(), t.dt.month.to_numpy()
    hist = ((aqua["satellite"] == "AQUA").to_numpy() & (aqua["excluded_reason"] == "none").to_numpy()
            & (year >= HISTORY_YEARS[0]) & (year <= HISTORY_YEARS[1]))
    region_id = regions.region_of(aqua["longitude"].to_numpy(float), aqua["latitude"].to_numpy(float), geoms)
    key = _season_key(aqua, region_id)
    return pd.crosstab(key[hist], month[hist]).reindex(columns=range(1, 13), fill_value=0)


def _season(df, params, region_id, rules, totals) -> np.ndarray:
    """Per row: is its calendar month fire season where it lies?

    Tuning regions use C1's stored months. Other evaluated regions use their own 2003-2011 Aqua
    history; everywhere else the fixed 5-degree tile's history (AD-4; the tile rule is untested).
    """
    month = df["acq_datetime_utc"].dt.month.to_numpy()
    out = np.zeros(len(df), bool)
    tuned = rules != ""
    for r in set(rules[tuned].tolist()):
        m = rules == r
        out[m] = params["season"][r][month[m] - 1]
    key = _season_key(df, region_id)
    need = ~tuned
    for k in set(key[need].tolist()):
        h = totals.loc[k].to_numpy() if k in totals.index else np.zeros(12)
        m = need & (key == k)
        out[m] = c1.season_months(params, h)[month[m] - 1]
    return out


def convert(df: pd.DataFrame, params: dict, geoms: dict, history: pd.DataFrame | None = None) -> pd.DataFrame:
    """Add the record columns. Rows keep their order; nothing is dropped.

    history: season_history() of the whole extent; taken from df itself when not given.
    """
    out = df.copy()
    lon, lat = out["longitude"].to_numpy(float), out["latitude"].to_numpy(float)
    region_id = regions.region_of(lon, lat, geoms)
    rules = regions.rules_region(region_id)
    out["region_id"], out["rules_region"] = region_id, rules
    totals = season_history(out, geoms) if history is None else history
    out["in_season"] = _season(out, params, region_id, rules, totals)
    out["feeds_record"] = record.feeds_record(out["satellite"], out["utc_date"])
    out["validated_satellite"] = record.validated_satellite(out["satellite"], out["utc_date"])
    c1w = np.full(len(out), np.nan)
    viirs = out["feeds_record"].to_numpy() & out["satellite"].isin(record.VIIRS_FEEDING).to_numpy()
    for sat in record.VIIRS_FEEDING:
        idx = np.flatnonzero(viirs & (out["satellite"] == sat).to_numpy())
        if len(idx) == 0:
            continue
        idx = idx[np.lexsort([out[c].to_numpy()[idx] for c in reversed(ROW_ORDER)])]
        s = out.iloc[idx]
        c1w[idx] = c1.row_weights_mixed(
            params, rules[idx], out["in_season"].to_numpy()[idx],
            time_utc=s["acq_datetime_utc"].dt.tz_convert(None).to_numpy("datetime64[s]"),
            lat=s["latitude"].to_numpy(float), lon=s["longitude"].to_numpy(float),
            frp_mw=s["frp"].to_numpy(float), scan_km=s["scan"].to_numpy(float),
            track_km=s["track"].to_numpy(float), night=(s["daynight"] == "N").to_numpy(),
            include=(s["excluded_reason"] == "none").to_numpy())
    out["weight"] = record.weights(out["satellite"], out["utc_date"], out["excluded_reason"], c1w)
    return out


def evidence_cells(extent, geoms, classes) -> pd.DataFrame:
    """Every 1-degree cell of the build extent with its evidence_class."""
    x0, y0, x1, y1 = (int(round(v)) for v in extent)
    gx, gy = np.meshgrid(np.arange(x0, x1, dtype=float), np.arange(y0, y1, dtype=float), indexing="ij")
    sw_lon, sw_lat = gx.ravel(), gy.ravel()
    return pd.DataFrame({"sw_lon": sw_lon, "sw_lat": sw_lat,
                         "evidence_class": regions.evidence_class(sw_lon, sw_lat, geoms, classes)})


def build(clean_dir, out_dir, *, extent, regions_path=REGIONS_FILE, params=None) -> dict:
    """One satellite-year file at a time. extent: (west, south, east, north), whole 5-degree tiles.

    The season history is read once from the Aqua files of 2003-2011. Footprints are built within
    each satellite-year file; a pass crossing midnight on 31 December is split there.
    """
    if not regions.is_tile_extent(extent):
        raise ValueError(f"build extent {tuple(extent)} is not whole 5-degree tiles; use {regions.tile_extent(extent)}")
    params = params or c1_params.read_c1_params()
    geoms, classes = load_regions(regions_path)
    parts = sorted(Path(clean_dir).glob("[A-Z]*_[0-9]*.parquet"))
    lean = ["satellite", "acq_datetime_utc", "longitude", "latitude", "excluded_reason"]
    aqua = [p for p in parts if p.stem.startswith("AQUA_") and HISTORY_YEARS[0] <= int(p.stem[5:]) <= HISTORY_YEARS[1]]
    history = season_history(pd.concat([pd.read_parquet(p, columns=lean) for p in aqua], ignore_index=True)
                             if aqua else pd.DataFrame(columns=lean).astype({"acq_datetime_utc": "datetime64[ns, UTC]"}), geoms)
    x0, y0, x1, y1 = extent
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = feeding = 0
    weights, rules_n = {}, {}
    for p in parts:
        df = pd.read_parquet(p)
        if not (df["longitude"].between(x0, x1).all() and df["latitude"].between(y0, y1).all()):
            raise ValueError(f"{p.name}: rows fall outside the build extent")
        df = convert(df, params, geoms, history)
        df.to_parquet(out_dir / p.name, compression="zstd", index=False)
        f = df[df["feeds_record"] & (df["excluded_reason"] == "none")]
        rows, feeding = rows + len(df), feeding + len(f)
        for k, v in f.groupby("satellite")["weight"].sum().items():
            weights[k] = weights.get(k, 0.0) + float(v)
        for k, v in df["rules_region"].value_counts().items():
            rules_n[k or "pooled"] = rules_n.get(k or "pooled", 0) + int(v)
    evidence_cells(extent, geoms, classes).to_parquet(out_dir / "evidence_1deg.parquet", index=False)
    return {"rows": rows, "rows_feeding_and_counted": feeding,
            "weight_sum_by_satellite": {k: round(v, 1) for k, v in sorted(weights.items())},
            "rows_by_rules_region": rules_n}


if __name__ == "__main__":
    extent = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))["extent"]
    print(json.dumps(build(sys.argv[1], sys.argv[2], extent=extent), indent=1))
