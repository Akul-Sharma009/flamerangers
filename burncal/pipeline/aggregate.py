"""Story 2.5: the aggregate step. Record rows in, cell-month grids, thresholds and flags out.

Run: uv run python -m burncal.pipeline.aggregate <record dir> <out dir> [data_through YYYY-MM-DD]
Writes cells_1deg, cells_025deg, thresholds_1deg and flags_1deg (Parquet). Prints counts only.
"""
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from burncal.core import grids, record, regions
from burncal.pipeline import convert

PARAMS_DIR = Path(__file__).resolve().parents[1] / "core" / "params"
SATELLITES = ("AQUA", "TERRA", "SNPP", "NOAA20", "NOAA21")
KEY = ["sw_lon", "sw_lat", "year", "month"]
COLUMNS = ["satellite", "acq_datetime_utc", "utc_date", "longitude", "latitude", "excluded_reason", "feeds_record", "weight"]


def read_record(record_dir) -> pd.DataFrame:
    paths = sorted(Path(record_dir).glob("[A-Z]*_[0-9]*.parquet"))
    return pd.concat([pd.read_parquet(p, columns=COLUMNS) for p in paths], ignore_index=True)


def cell_months(df: pd.DataFrame, step: float) -> pd.DataFrame:
    """Per cell-month with any row: harmonized count (sum of weights of feeding, kept rows) and
    raw row counts per satellite (kept rows). Excluded rows are in no count."""
    kept = (df["excluded_reason"] == "none").to_numpy()
    d = pd.DataFrame({
        "sw_lon": grids.sw_corner(df["longitude"], step)[kept],
        "sw_lat": grids.sw_corner(df["latitude"], step)[kept],
        "year": df["acq_datetime_utc"].dt.year.to_numpy()[kept],
        "month": df["acq_datetime_utc"].dt.month.to_numpy()[kept],
        "count": np.where(df["feeds_record"].to_numpy(), df["weight"].to_numpy(float), 0.0)[kept],
    })
    sat = df["satellite"].to_numpy()[kept]
    for s in SATELLITES:
        d[f"raw_{s.lower()}"] = (sat == s).astype(np.int64)
    return d.groupby(KEY, as_index=False).sum()


def _history(g1: pd.DataFrame, cells: pd.DataFrame) -> np.ndarray:
    """[n_cells, 9, 12] whole-cell counts for 2003-2011, zero where a cell-month has no row."""
    y0, y1 = grids.HISTORY_YEARS
    h = g1[(g1["year"] >= y0) & (g1["year"] <= y1)]
    idx = pd.MultiIndex.from_frame(cells[["sw_lon", "sw_lat"]])
    full = pd.MultiIndex.from_product([range(len(cells)), range(y0, y1 + 1), range(1, 13)])
    pos = pd.Series(np.arange(len(cells)), index=idx)
    h = h[pd.MultiIndex.from_frame(h[["sw_lon", "sw_lat"]]).isin(idx)]
    s = pd.Series(h["count"].to_numpy(), index=pd.MultiIndex.from_arrays(
        [pos.loc[list(zip(h["sw_lon"], h["sw_lat"]))].to_numpy(), h["year"], h["month"]]))
    return s.reindex(full, fill_value=0.0).to_numpy().reshape(len(cells), y1 - y0 + 1, 12)


def thresholds_1deg(g1: pd.DataFrame, cells: pd.DataFrame) -> pd.DataFrame:
    thr = grids.thresholds(_history(g1, cells))
    return pd.DataFrame({"sw_lon": np.repeat(cells["sw_lon"].to_numpy(), 12),
                         "sw_lat": np.repeat(cells["sw_lat"].to_numpy(), 12),
                         "month": np.tile(np.arange(1, 13), len(cells)),
                         "threshold": thr.ravel()})


def flags_1deg(g1, thr, cells, *, data_through: date) -> pd.DataFrame:
    """Every cell of the extent and every month from January 2002 to December of data_through's year."""
    years = np.arange(2002, data_through.year + 1)
    grid = pd.MultiIndex.from_product([cells["sw_lon"], years, range(1, 13)]).to_frame(index=False)
    grid.columns = ["sw_lon", "year", "month"]
    grid["sw_lat"] = np.repeat(cells["sw_lat"].to_numpy(), len(years) * 12)
    out = grid[KEY].merge(g1[KEY + ["count"]], on=KEY, how="left").fillna({"count": 0.0})
    out = out.merge(thr, on=["sw_lon", "sw_lat", "month"], how="left")
    state = {(y, m): record.month_state(int(y), int(m), data_through=data_through)
             for y in years for m in range(1, 13)}
    st = [state[(y, m)] for y, m in zip(out["year"], out["month"])]
    in_record = np.array([s[0] != "null" for s in st])
    out["flag_state"] = grids.flag_state(out["count"], out["threshold"], in_record)
    out["provisional"] = np.array([s[0] == "partial" for s in st])
    out["reference_year"] = grids.reference_year(out["year"])
    out.loc[~in_record, "count"] = np.nan  # missing is not zero (AD-12)
    return out


def tuning_thresholds_parity(region: str, record_dir) -> dict:
    """Thresholds from the region-clipped cells (the harness's input) against the frozen targets."""
    geoms, _ = convert.load_regions()
    df = read_record(record_dir)
    inside = regions.region_of(df["longitude"], df["latitude"], {region: geoms[region]}) == region
    g1 = cell_months(df[inside], 1.0)
    target = pd.read_csv(PARAMS_DIR / "thresholds_1deg.csv")
    target = target[target["region"] == region]
    cells = target[["lon_sw", "lat_sw"]].drop_duplicates().rename(columns={"lon_sw": "sw_lon", "lat_sw": "sw_lat"})
    got = thresholds_1deg(g1, cells.reset_index(drop=True))
    m = got.merge(target.rename(columns={"lon_sw": "sw_lon", "lat_sw": "sw_lat", "calendar_month": "month"}),
                  on=["sw_lon", "sw_lat", "month"])
    diff = (m["threshold"] - m["threshold_p90_aqua_2003_2011"]).abs()
    miss = m[diff > 1e-6]
    return {"cells": len(cells), "cell_months": len(m), "max_abs_diff": float(diff.max()),
            "misses": [(float(r.sw_lon), float(r.sw_lat), int(r.month), round(float(r.threshold), 6),
                        round(float(r.threshold_p90_aqua_2003_2011), 6)) for r in miss.itertuples()]}


def build(record_dir, out_dir, data_through: date | None = None) -> dict:
    df = read_record(record_dir)
    data_through = data_through or df["utc_date"].max()
    cells = pd.read_parquet(Path(record_dir) / "evidence_1deg.parquet")[["sw_lon", "sw_lat"]]
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    g1, g025 = cell_months(df, 1.0), cell_months(df, 0.25)
    thr = thresholds_1deg(g1, cells)
    flags = flags_1deg(g1, thr, cells, data_through=data_through)
    for name, t in (("cells_1deg", g1), ("cells_025deg", g025), ("thresholds_1deg", thr), ("flags_1deg", flags)):
        t.to_parquet(out_dir / f"{name}.parquet", compression="zstd", index=False)
    return {"data_through": str(data_through), "cells_1deg": len(cells), "cell_months_1deg": len(g1),
            "cell_months_025deg": len(g025), "flag_states": flags["flag_state"].value_counts().to_dict()}


if __name__ == "__main__":
    dt = date.fromisoformat(sys.argv[3]) if len(sys.argv) > 3 else None
    print(json.dumps(build(sys.argv[1], sys.argv[2], dt), indent=1))
