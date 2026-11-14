"""AD-2 gate: C1 must reproduce the parity targets within 1e-6 before converted counts are published.

The case (Sumatra, September 2015) is derived from held-back inputs, so it is never in this repo.
BURNCAL_PARITY_CASE_DIR points at the planning record's exports/c1/out/intermediate folder.
"""
import os
from pathlib import Path

import numpy as np
import pandas as pd

from burncal.core import c1
from burncal.pipeline import c1_params

PARITY = c1_params.PARAMS_DIR / "parity"
TOL = 1e-6
YEAR_AXIS, MONTH_AXIS = 0, 8  # 2015, September
CASE_FILE = "rows_sumatra_201509.csv"


def check_case(case_dir=None) -> dict:
    """{"passed": bool, "misses": {"4A 1deg": max abs miss, ...}} or passed False with a reason."""
    case_dir = case_dir or os.environ.get("BURNCAL_PARITY_CASE_DIR")
    if not case_dir or not (Path(case_dir) / CASE_FILE).exists():
        return {"passed": False, "reason": "parity case not available (set BURNCAL_PARITY_CASE_DIR)", "misses": {}}
    params = c1_params.read_c1_params()
    df = pd.read_csv(Path(case_dir) / CASE_FILE)
    x = dict(time_utc=pd.to_datetime(df["acq_datetime_utc"]).to_numpy("datetime64[s]"),
             lat=df["latitude"].to_numpy(float), lon=df["longitude"].to_numpy(float),
             frp_mw=df["frp_mw"].to_numpy(float), scan_km=df["scan_km"].to_numpy(float),
             track_km=df["track_km"].to_numpy(float), night=(df["daynight_used"] == "N").to_numpy())
    misses = {}
    for method in ("4A", "1A", "C1"):
        w = c1.row_weights(params, "sumatra", **x, method=method)
        target = np.load(PARITY / f"{method}_selection_main.npz", allow_pickle=False)
        for scale, col, cells in (("1deg", "cell1_index", "cells_1deg_sumatra.csv"),
                                  ("025deg", "cell025_index", "cells_0.25deg_sumatra.csv")):
            n = len(pd.read_csv(PARITY / cells))
            got = np.bincount(df[col].to_numpy(), weights=w, minlength=n)
            want = target[f"count_{scale}|sumatra"][:, YEAR_AXIS, MONTH_AXIS]
            misses[f"{method} {scale}"] = float(np.abs(got - want).max())
    return {"passed": all(m <= TOL for m in misses.values()), "misses": misses}
