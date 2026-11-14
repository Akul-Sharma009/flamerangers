"""Full C1 parity check (Story 2.2), for the lead to run where the selection-year inputs live.

Converts the harness's cleaned Suomi NPP records for 2015 and 2018 with burncal.core.c1
and compares every cell-month with the scored predictions in burncal/core/params/parity/,
for 4A, 1A and C1 at 1 and 0.25 degrees. Imports nothing from the planning repo's harness.

    uv run python tools/parity_full.py --snpp-dir <planning repo>/data/heldout/inputs/processed/snpp

--snpp-dir holds snpp_<region>_<year>.parquet as the harness wrote them. Exit code 0 when
every miss is within the tolerance. Prints aggregate misses only, never rows.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from burncal.core import c1  # noqa: E402
from burncal.pipeline.c1_params import read_c1_params  # noqa: E402

PARITY = ROOT / "burncal" / "core" / "params" / "parity"
REGIONS = ("sumatra", "australia_grassland", "amazon_forest")
YEARS = (2015, 2018)  # axis 1 of the parity arrays
SCALES = {"1deg": ("1deg", 1.0), "025deg": ("0.25deg", 0.25)}
METHODS = ("4A", "1A", "C1")
TOL = 1e-6


def load_rows(snpp_dir: Path, region: str) -> pd.DataFrame:
    """The harness view: the 2015 file then the 2018 file, file order, index reset."""
    frames = [pd.read_parquet(snpp_dir / f"snpp_{region}_{y}.parquet") for y in YEARS]
    return pd.concat(frames, ignore_index=True)


def cell_index(region: str, scale: str, lon, lat) -> np.ndarray:
    name, step = SCALES[scale]
    cells = pd.read_csv(PARITY / f"cells_{name}_{region}.csv")
    key = {(int(round(x / step)), int(round(y / step))): i for i, (x, y) in enumerate(zip(cells.lon, cells.lat))}
    ix = np.floor(np.asarray(lon, float) / step + 1e-9).astype(np.int64)
    iy = np.floor(np.asarray(lat, float) / step + 1e-9).astype(np.int64)
    return np.array([key.get((a, b), -1) for a, b in zip(ix, iy)]), len(cells)


def gridded(weights, cell, n_cells, year_ix, month_ix) -> np.ndarray:
    out = np.zeros((n_cells, len(YEARS), 12))
    np.add.at(out, (cell, year_ix, month_ix), weights)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--snpp-dir", type=Path, required=True)
    ap.add_argument("--regions", nargs="+", default=list(REGIONS))
    ap.add_argument("--only", help="YYYY-MM: compare one month only (plumbing check)")
    args = ap.parse_args(argv)

    params = read_c1_params()
    targets = {m: np.load(PARITY / f"{m}_selection_main.npz", allow_pickle=False) for m in METHODS}
    report, ok = {}, True
    for region in args.regions:
        v = load_rows(args.snpp_dir, region)
        x = dict(time_utc=pd.to_datetime(v["acq_datetime"]).to_numpy("datetime64[s]"),
                 lat=v["latitude"].to_numpy(float), lon=v["longitude"].to_numpy(float),
                 frp_mw=v["frp"].to_numpy(float), scan_km=v["scan"].to_numpy(float),
                 track_km=v["track"].to_numpy(float), night=(v["daynight"] == "N").to_numpy())
        if not np.isin(v["year"].to_numpy(int), YEARS).all():
            raise SystemExit(f"{region}: rows from years other than {YEARS}")
        year_ix = np.searchsorted(YEARS, v["year"].to_numpy(int))
        month_ix = v["month"].to_numpy(int) - 1
        report[region] = {"rows": int(len(v))}
        cells = {scale: cell_index(region, scale, x["lon"], x["lat"]) for scale in SCALES}
        for scale, (cell, _) in cells.items():
            if (cell < 0).any():
                raise SystemExit(f"{region} {scale}: {int((cell < 0).sum())} rows outside the land cells")
        for method in METHODS:
            w = c1.row_weights(params, region, **x, method=method)
            for scale in SCALES:
                cell, n = cells[scale]
                got = gridded(w, cell, n, year_ix, month_ix)
                want = targets[method][f"count_{scale}|{region}"]
                if args.only:
                    y, m = map(int, args.only.split("-"))
                    got, want = got[:, YEARS.index(y), m - 1], want[:, YEARS.index(y), m - 1]
                miss = float(np.abs(got - want).max())
                ok &= miss <= TOL
                report[region][f"{method}_{scale}_max_abs_miss"] = miss
                report[region][f"{method}_{scale}_total"] = round(float(want.sum()), 3)
    print(json.dumps(report, indent=1))
    print("PASS" if ok else "FAIL", f"(tolerance {TOL})")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
