"""AD-2 gate: C1 must reproduce the parity targets within 1e-6 before converted counts are published.

The case (Sumatra, September 2015) is derived from held-back inputs, so it is never in this repo.
BURNCAL_PARITY_CASE_DIR points at the planning record's exports/c1/out/intermediate folder.

Story 2.9: a machine without the case (the hosted daily refresh) publishes on a recorded pass instead
(RECORDED, written where the case is). The pass is keyed on the C1 params hash and a hash of the code the
check runs (burncal/core and its params folder), so any change to C1's code or numbers voids it.
"""
import hashlib
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

from burncal.core import c1
from burncal.pipeline import c1_params

PARITY = c1_params.PARAMS_DIR / "parity"
TOL = 1e-6
CORE = Path(__file__).resolve().parents[1] / "core"
RECORDED = Path(__file__).resolve().parent / "parity_pass.json"
YEAR_AXIS, MONTH_AXIS = 0, 8  # 2015, September
CASE_FILE = "rows_sumatra_201509.csv"


def check_case(case_dir=None) -> dict:
    """{"passed": bool, "misses": {"4A 1deg": max abs miss, ...}} or passed False with a reason."""
    case_dir = case_dir or os.environ.get("BURNCAL_PARITY_CASE_DIR")
    if not case_dir or not (Path(case_dir) / CASE_FILE).exists():
        return {"passed": False, "reason": "parity case not available (set BURNCAL_PARITY_CASE_DIR)", "misses": {}}
    params_sha256 = hashlib.sha256(c1_params.PARAMS_FILE.read_bytes()).hexdigest()
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
    return {"passed": all(m <= TOL for m in misses.values()), "misses": misses, "params_sha256": params_sha256}


def core_sha256(core=CORE) -> str:
    """sha256 over burncal/core's code (tests excluded) and every file of its params folder, path by path."""
    h = hashlib.sha256()
    for p in sorted(Path(core).rglob("*")):
        rel = p.relative_to(core).as_posix()
        if not p.is_file() or "__pycache__" in rel or p.name.startswith("test_") or p.name == "conftest.py":
            continue
        if p.suffix == ".py" or rel.startswith("params/"):
            h.update(rel.encode() + b"\0" + p.read_bytes() + b"\0")
    return h.hexdigest()


def record_pass(path=RECORDED, case_dir=None) -> dict:
    """Runs the case and, only if it passes, writes the recorded pass. Returns the case result."""
    result = check_case(case_dir)
    if result["passed"]:
        rec = {"passed": True, "misses": result["misses"], "params_sha256": result["params_sha256"],
               "core_sha256": core_sha256()}
        Path(path).write_text(json.dumps(rec, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    return result


def check_recorded(path=RECORDED) -> dict:
    """The recorded pass, if it was made on exactly this C1 code and params; else passed False with a reason."""
    if not Path(path).exists():
        return {"passed": False, "reason": "no recorded parity pass", "misses": {}}
    rec = json.loads(Path(path).read_text(encoding="utf-8"))
    params = hashlib.sha256(c1_params.PARAMS_FILE.read_bytes()).hexdigest()
    if rec.get("params_sha256") != params or rec.get("core_sha256") != core_sha256():
        return {"passed": False, "reason": "the recorded parity pass was made on other C1 code or params", "misses": {}}
    ok = rec.get("passed") is True and all(m <= TOL for m in rec["misses"].values())
    return {"passed": ok, "misses": rec["misses"], "params_sha256": params, "recorded_pass": rec["core_sha256"]}


def check() -> dict:
    """The case where it is available, else the recorded pass (Story 2.9)."""
    return check_case() if os.environ.get("BURNCAL_PARITY_CASE_DIR") else check_recorded()


if __name__ == "__main__":
    # parity --record: run the case (BURNCAL_PARITY_CASE_DIR) and write the recorded pass if it passes
    import sys
    r = record_pass() if sys.argv[1:] == ["--record"] else check()
    print(json.dumps({k: v for k, v in r.items() if k != "params_sha256"}, indent=1))
    sys.exit(0 if r["passed"] else 1)
