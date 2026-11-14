"""Story 2.6: publish one immutable store version and switch the pointer (AD-11, AD-12).

Run: uv run python -m burncal.pipeline.publish <record dir> <grids dir> <raw dir> <store root> <data_through> [code revision]

The raw dir holds coverage.json: the build extent and, per FIRMS source, the date ranges downloaded
and available. A version is written whole under a temporary name, renamed, and only then named in
CURRENT.json, which keeps the previous version too.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from burncal.core import record
from burncal.pipeline import c1_params

SOURCE_SATELLITES = {"MODIS": ("AQUA", "TERRA"), "VIIRS_SNPP": ("SNPP",), "VIIRS_NOAA20": ("NOAA20",),
                     "VIIRS_NOAA21": ("NOAA21",)}
GRIDS = ("cells_1deg", "cells_025deg", "thresholds_1deg", "flags_1deg")
POINT_COLUMNS = ["longitude", "latitude", "acq_datetime_utc", "satellite", "feeds_record", "weight"]


def _days(ranges, data_through):
    out = set()
    for a, b in ranges:
        d, e = date.fromisoformat(a), min(date.fromisoformat(b), data_through)
        while d <= e:
            out.add(d)
            d += timedelta(days=1)
    return out


def coverage_tables(coverage: dict, *, data_through: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    """(days per satellite, quality and month with feeds_record; months of the record missing feeding days).

    Standard beats NRT per satellite-day (AD-6). Aqua's days start at the record start.
    """
    by_sat = {}
    for source, ranges in coverage["sources"].items():
        prefix, quality = source.rsplit("_", 1)
        for sat in SOURCE_SATELLITES[prefix]:
            by_sat.setdefault(sat, {}).setdefault(quality, set()).update(_days(ranges, data_through))
    rows, covered_feeding = [], set()
    for sat, q in by_sat.items():
        sp, nrt = q.get("SP", set()), q.get("NRT", set()) - q.get("SP", set())
        for quality, days in (("SP", sp), ("NRT", nrt)):
            if sat == "AQUA":
                days = {d for d in days if d >= record.RECORD_START}
            if not days:
                continue
            d = np.array(sorted(days), dtype="datetime64[D]")
            feeds = record.feeds_record(np.full(len(d), sat, dtype=object), d)
            covered_feeding.update(d[feeds].tolist())
            ym = d.astype("datetime64[M]")
            t = pd.DataFrame({"ym": ym, "feeds": feeds}).groupby("ym").agg(days=("feeds", "size"), feeds_record=("feeds", "any"))
            for m, r in t.iterrows():
                rows.append((sat, quality, m.year, m.month, int(r["days"]), bool(r["feeds_record"])))
    days = pd.DataFrame(rows, columns=["satellite", "quality", "year", "month", "days", "feeds_record"])
    all_days = np.arange(np.datetime64(record.RECORD_START, "D"), np.datetime64(data_through, "D") + np.timedelta64(1, "D"))
    gap = all_days[~np.isin(all_days, np.array(sorted(covered_feeding), dtype="datetime64[D]"))]
    gm = pd.DatetimeIndex(gap.astype("datetime64[ns]"))
    missing = pd.DataFrame({"year": gm.year, "month": gm.month}).drop_duplicates().reset_index(drop=True)
    return days, missing


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def input_manifest(raw_dir) -> dict:
    return {p.name: _sha256(p) for p in sorted(Path(raw_dir).iterdir()) if p.is_file()}


def record_version(raw_dir, data_through: date, code_revision: str) -> str:
    """YYYYMMDD-<8 hex>: the hash covers the input manifest, the parameter file and the code revision."""
    h = hashlib.sha256(json.dumps({"inputs": input_manifest(raw_dir), "params": _sha256(c1_params.PARAMS_FILE),
                                   "code": code_revision}, sort_keys=True).encode())
    return f"{data_through:%Y%m%d}-{h.hexdigest()[:8]}"


def _write_pointer(root: Path, version: str) -> None:
    pointer = root / "CURRENT.json"
    prev = json.loads(pointer.read_text())["record_version"] if pointer.exists() else None
    if prev == version:
        return
    tmp = root / "CURRENT.json.tmp"
    tmp.write_text(json.dumps({"record_version": version, "previous": prev}))
    os.replace(tmp, pointer)


def publish(record_dir, grids_dir, raw_dir, store_root, *, data_through: date, code_revision: str) -> str:
    record_dir, grids_dir, raw_dir, root = map(Path, (record_dir, grids_dir, raw_dir, store_root))
    coverage = json.loads((raw_dir / "coverage.json").read_text(encoding="utf-8"))
    version = record_version(raw_dir, data_through, code_revision)
    final = root / "versions" / version
    if not final.exists():
        tmp = root / "versions" / f".{version}.tmp"
        shutil.rmtree(tmp, ignore_errors=True)
        (tmp / "grids").mkdir(parents=True)
        shutil.copytree(record_dir, tmp / "records")
        for name in GRIDS:
            shutil.copy2(grids_dir / f"{name}.parquet", tmp / "grids" / f"{name}.parquet")
        days, missing = coverage_tables(coverage, data_through=data_through)
        days.to_parquet(tmp / "coverage_days.parquet", index=False)
        missing.to_parquet(tmp / "missing_days.parquet", index=False)
        parts = sorted(record_dir.glob("[A-Z]*_[0-9]*.parquet"))
        pts = pd.concat([pd.read_parquet(p, columns=POINT_COLUMNS + ["excluded_reason"]) for p in parts], ignore_index=True)
        pts = pts[pts["excluded_reason"] == "none"].drop(columns="excluded_reason")
        pts = pts[pts["acq_datetime_utc"].dt.date <= data_through]
        pts.to_parquet(tmp / "points.parquet", compression="zstd", index=False)
        manifest = {"record_version": version, "data_through": data_through.isoformat(),
                    "extent": coverage["extent"], "code_revision": code_revision,
                    "params_sha256": _sha256(c1_params.PARAMS_FILE), "inputs": input_manifest(raw_dir),
                    "rows_in_counts": int(len(pts))}
        (tmp / "manifest.json").write_text(json.dumps(manifest, indent=1))
        os.replace(tmp, final)
    _write_pointer(root, version)
    return version


if __name__ == "__main__":
    rev = sys.argv[6] if len(sys.argv) > 6 else subprocess.run(
        ["git", "rev-parse", "--short=12", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    print(publish(*sys.argv[1:5], data_through=date.fromisoformat(sys.argv[5]), code_revision=rev))
