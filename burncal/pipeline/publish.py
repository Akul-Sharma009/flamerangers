"""Story 2.6: publish one immutable store version and switch the pointer (AD-11, AD-12).

Run: uv run python -m burncal.pipeline.publish <store root> <data_through> <record dir>,<grids dir>,<raw dir> [...]

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

import duckdb
import numpy as np
import pandas as pd
import shapely

from burncal.core import record
from burncal.pipeline import aggregate, c1_params, parity

SOURCE_SATELLITES = {"MODIS": ("AQUA", "TERRA"), "VIIRS_SNPP": ("SNPP",), "VIIRS_NOAA20": ("NOAA20",),
                     "VIIRS_NOAA21": ("NOAA21",)}
GRIDS = ("cells_1deg", "cells_025deg", "thresholds_1deg", "flags_1deg")
FINE = 0.25  # the fine grid the service reads points by
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
    gaps = pd.DataFrame({"year": gm.year, "month": gm.month}).groupby(["year", "month"]).size()
    rec = pd.DatetimeIndex(all_days.astype("datetime64[ns]"))
    in_record = pd.DataFrame({"year": rec.year, "month": rec.month}).groupby(["year", "month"]).size()
    missing = gaps.rename("gap_days").reset_index()
    # uncovered: no feeding day of the month (inside the record) was loaded, so its count is null, not 0
    missing["uncovered"] = np.array([g == in_record[(y, m)] for y, m, g in zip(missing["year"], missing["month"], missing["gap_days"])], dtype=bool)
    return days, missing.drop(columns="gap_days")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def input_manifest(raw_dir) -> dict:
    return {p.name: _sha256(p) for p in sorted(Path(raw_dir).iterdir()) if p.is_file()}


def record_version(raw_dirs, data_through: date, code_revision: str) -> str:
    """YYYYMMDD-<8 hex>: the hash covers the input manifests, the parameter file and the code revision."""
    raw_dirs = [raw_dirs] if isinstance(raw_dirs, (str, Path)) else list(raw_dirs)
    inputs = {Path(d).name: input_manifest(d) for d in raw_dirs}
    if len(raw_dirs) == 1:
        inputs = next(iter(inputs.values()))
    h = hashlib.sha256(json.dumps({"inputs": inputs, "params": _sha256(c1_params.PARAMS_FILE),
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


def publish(record_dir, grids_dir, raw_dir, store_root, *, data_through: date, code_revision: str,
            parity_check=None) -> str:
    """One extent: see publish_many."""
    return publish_many([(record_dir, grids_dir, raw_dir)], store_root, data_through=data_through,
                        code_revision=code_revision, parity_check=parity_check)


def write_points(record_files, out: Path, data_through: date) -> int:
    """The rows in any count (excluded_reason none, up to data_through), sorted by 0.25-degree cell key,
    with the key, month index and day stored, so the service reads only the cells a request needs.
    DuckDB sorts out of core, so this works for extents larger than memory."""
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    if not record_files:
        pd.DataFrame(columns=["key", "k", "day"] + POINT_COLUMNS).to_parquet(out, index=False)
        return 0
    files = ", ".join(f"'{Path(f).as_posix()}'" for f in record_files)
    q = f"""SELECT (floor(longitude / {FINE} + 1e-9)::BIGINT + 1000) * 10000 + (floor(latitude / {FINE} + 1e-9)::BIGINT + 1000) AS key,
                   ((year(acq_datetime_utc) - 2002) * 12 + month(acq_datetime_utc) - 1)::INTEGER AS k,
                   day(acq_datetime_utc)::TINYINT AS day, {", ".join(POINT_COLUMNS)}
            FROM read_parquet([{files}], union_by_name = true)
            WHERE excluded_reason = 'none' AND acq_datetime_utc::DATE <= DATE '{data_through.isoformat()}'
            ORDER BY key, k"""
    con.execute(f"COPY ({q}) TO '{out.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)")
    return int(con.execute(f"SELECT count(*) FROM read_parquet('{out.as_posix()}')").fetchone()[0])


def params_sha256() -> str:
    return _sha256(c1_params.PARAMS_FILE)


def clean_code_revision(run=subprocess.run) -> str:
    """The commit the version is built from. Refuses when burncal/ has uncommitted changes, so the
    revision in the manifest names the exact code that passed the parity check (Codex review, 14 Nov)."""
    dirty = run(["git", "status", "--porcelain", "--", "burncal"], capture_output=True, text=True, check=True).stdout
    if dirty.strip():
        raise RuntimeError("burncal/ has uncommitted changes; commit them before publishing:\n" + dirty)
    return run(["git", "rev-parse", "--short=12", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()


def _parity_gate(data_through: date, parity_check, code_revision: str) -> dict:
    """AD-2: a version holding converted counts (any month from January 2022) needs a passing parity check,
    run on the params file this version is published with and recorded with the code revision."""
    if data_through < record.VIIRS_FIRST:
        return {"required": False}
    result = (parity_check or parity.check_case)()
    if not result.get("passed"):
        raise RuntimeError(f"AD-2: parity check did not pass, so converted counts are not published: "
                           f"{result.get('reason') or result.get('misses')}")
    if result.get("params_sha256") != params_sha256():
        raise RuntimeError("AD-2: the parity pass was not run on this version's C1 params file")
    return {"required": True, "passed": True, "misses": result["misses"],
            "params_sha256": result["params_sha256"], "code_revision": code_revision}


def _load_check(vdir: Path) -> None:
    """Load the version once, as the service does at start-up, before the pointer names it (AD-11)."""
    from burncal.service.store import Version
    try:
        Version(vdir)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"the new version does not load, so the pointer is not switched: {type(exc).__name__}: {exc}") from exc


def publish_many(builds, store_root, *, data_through: date, code_revision: str, parity_check=None) -> str:
    """Several extents in one version. builds: (record dir, grids dir, raw dir) per extent; the extent's
    name is its raw dir's name. Extents must not overlap. Each keeps its own coverage tables, and its
    record rows under records/<name>/; grids, evidence and points are joined."""
    builds = [tuple(map(Path, b)) for b in builds]
    gate = _parity_gate(data_through, parity_check, code_revision)
    root = Path(store_root)
    version = record_version([raw for _, _, raw in builds], data_through, code_revision)
    final = root / "versions" / version
    if not final.exists():
        tmp = root / "versions" / f".{version}.tmp"
        shutil.rmtree(tmp, ignore_errors=True)
        (tmp / "grids").mkdir(parents=True)
        extents, days_all, missing_all, ev_all, pts_all, grids_all, inputs = [], [], [], [], [], {g: [] for g in GRIDS}, {}
        for record_dir, grids_dir, raw_dir in builds:
            name = raw_dir.name
            if any(e["name"] == name for e in extents):
                raise ValueError(f"two extents are both named {name!r}")
            coverage = json.loads((raw_dir / "coverage.json").read_text(encoding="utf-8"))
            box = shapely.box(*coverage["extent"])
            if any(shapely.area(shapely.intersection(box, shapely.box(*e["bbox"]))) > 0 for e in extents):
                raise ValueError(f"extent {name} overlaps another extent")
            extents.append({"name": name, "bbox": coverage["extent"]})
            parts = sorted(record_dir.glob("[A-Z]*_[0-9]*.parquet"))
            (tmp / "records" / name).mkdir(parents=True)
            for part in parts:
                shutil.copy2(part, tmp / "records" / name / part.name)
            ev_all.append(pd.read_parquet(record_dir / "evidence_1deg.parquet"))
            days, missing = coverage_tables(coverage, data_through=data_through)
            uncovered = set(zip(missing["year"][missing["uncovered"]], missing["month"][missing["uncovered"]]))
            for g in GRIDS:
                t = pd.read_parquet(grids_dir / f"{g}.parquet")
                grids_all[g].append(aggregate.null_uncovered(t, uncovered) if g == "flags_1deg" else t)
            days_all.append(days.assign(extent=name))
            missing_all.append(missing.assign(extent=name))
            pts_all += [tmp / "records" / name / part.name for part in parts]
            inputs[name] = input_manifest(raw_dir)
        for g in GRIDS:
            pd.concat(grids_all[g], ignore_index=True).to_parquet(tmp / "grids" / f"{g}.parquet", compression="zstd", index=False)
        pd.concat(ev_all, ignore_index=True).to_parquet(tmp / "records" / "evidence_1deg.parquet", index=False)
        pd.concat(days_all, ignore_index=True).to_parquet(tmp / "coverage_days.parquet", index=False)
        pd.concat(missing_all, ignore_index=True).to_parquet(tmp / "missing_days.parquet", index=False)
        n_points = write_points(pts_all, tmp / "points.parquet", data_through)
        manifest = {"record_version": version, "data_through": data_through.isoformat(), "extents": extents,
                    "code_revision": code_revision, "params_sha256": params_sha256(),
                    "inputs": inputs, "rows_in_counts": n_points, "parity": gate}
        (tmp / "manifest.json").write_text(json.dumps(manifest, indent=1))
        _load_check(tmp)
        os.replace(tmp, final)
    else:
        _load_check(final)
    _write_pointer(root, version)
    return version


if __name__ == "__main__":
    # publish <store root> <data_through> <record dir>,<grids dir>,<raw dir> [more extents ...]
    rev = clean_code_revision()
    builds = [tuple(arg.split(",")) for arg in sys.argv[3:]]
    print(publish_many(builds, sys.argv[1], data_through=date.fromisoformat(sys.argv[2]), code_revision=rev))
