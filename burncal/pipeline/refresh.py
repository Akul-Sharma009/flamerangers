"""Story 2.9: the daily refresh. Re-downloads only the source-year files whose span changed, rebuilds only those
years, and publishes a new version of every region together.

    uv run python -m burncal.pipeline.refresh <store root> <prev raw root> <prev build root> <out root> \
        [--data-through=YYYY-MM-DD] [--noaa20-check=<headline.json>]

<prev raw root>/<region_id>/ holds the last build's raw files and coverage.json (e.g. store/staged);
<prev build root>/{clean,record}/<region_id>/ its outputs (e.g. store/build). Everything new is written under
<out root> ({raw,clean,record,grids}/<region_id>/); unchanged files are linked, never copied or overwritten.
The span of each file comes from FIRMS's availability: a day that gains standard data moves from the NRT file
to the standard file, so both files change and that year is rebuilt with standard data (AD-6).
"""
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

from burncal.pipeline import aggregate, build_extent, convert, download, firms, publish

REGION_IDS = ("sumatra", "australia_grassland", "amazon_forest", "southern_africa", "siberia", "punjab")
LAND = Path(__file__).resolve().parents[2] / "store" / "static" / "ne_10m_land_v5.1.1.geojson"


def spans_by_file(plan_: dict) -> dict:
    """(source, year) -> (first day, last day) the plan wants in that file."""
    return {(s, y): (a, b) for s, spans in plan_.items() for y, a, b in download.years(spans) if a <= b}


def covered_by_file(coverage: dict) -> dict:
    """(source, year) -> (first day, last day) a previous coverage.json says that file holds."""
    out = {}
    for s, rng in coverage["sources"].items():
        for a, b in rng:
            for y, a2, b2 in download.years([(date.fromisoformat(a), date.fromisoformat(b))]):
                out[(s, y)] = (a2, b2)
    return out


def _link(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.symlink(src.resolve(), dst)


def refresh_raw(prev_raw, new_raw, extent, plan_: dict, fetch=download.fetch_year) -> set:
    """Links each file whose span is unchanged and fetches the rest. Returns the years that changed.
    Raises if any file could not be fetched whole, so a partial year is never published."""
    prev_raw, new_raw = Path(prev_raw), Path(new_raw)
    new_raw.mkdir(parents=True, exist_ok=False)
    want = spans_by_file(plan_)
    had = covered_by_file(json.loads((prev_raw / "coverage.json").read_text(encoding="utf-8")))
    changed = {y for (s, y) in had if (s, y) not in want}  # files the plan no longer wants
    failed = []
    for (s, y), (a, b) in sorted(want.items()):
        name = f"{s}_{y}.csv"
        if had.get((s, y)) == (a, b) and (prev_raw / name).exists():
            _link(prev_raw / name, new_raw / name)
            continue
        changed.add(y)
        if missing := fetch(s, extent, a, b, new_raw):
            failed.append(f"{s}_{y} ({missing} windows)")
    if failed:
        raise RuntimeError(f"refresh incomplete, rerun to retry: {', '.join(failed)}")
    (new_raw / "coverage.json").write_text(json.dumps(download.coverage(new_raw, extent, plan_), indent=1))
    return changed


def _link_years(prev_dir: Path, new_dir: Path, changed: set) -> None:
    """Links the previous build's satellite-year parts of every year that did not change."""
    for p in sorted(Path(prev_dir).glob("[A-Z]*_[0-9]*.parquet")):
        if int(p.stem.rsplit("_", 1)[1]) not in changed:
            _link(p, Path(new_dir) / p.name)


def refresh_region(region_id, prev_raw, prev_build, out_root, *, data_through: date, sp_end: dict,
                   land=LAND, fetch=download.fetch_year) -> dict:
    out_root, prev_build = Path(out_root), Path(prev_build)
    extent = download.region_extent(region_id)
    d = {k: out_root / k / region_id for k in ("raw", "clean", "record", "grids")}
    changed = refresh_raw(Path(prev_raw) / region_id, d["raw"], extent,
                          download.plan(data_through=data_through, sp_end=sp_end), fetch)
    _link_years(prev_build / "clean" / region_id, d["clean"], changed)
    cleaned = build_extent.build(d["raw"], land, d["clean"], years=changed)
    _link_years(prev_build / "record" / region_id, d["record"], changed)
    converted = convert.build(d["clean"], d["record"], extent=extent, years=changed)
    grids = aggregate.build(d["record"], d["grids"], data_through)
    return {"years_rebuilt": sorted(changed), "clean": cleaned, "convert": converted, "grids": grids}


def main(argv) -> str:
    store_root, prev_raw, prev_build, out_root, *opts = argv
    opt = dict(o.lstrip("-").split("=", 1) for o in opts)
    avail = download.availability(firms.data_availability())
    # FIRMS's last NRT day is today and still filling, so the record runs to the day before.
    data_through = date.fromisoformat(opt["data-through"]) if "data-through" in opt else avail["nrt_end"] - timedelta(days=1)
    rev = publish.clean_code_revision()
    out_root = Path(out_root)
    for r in REGION_IDS:
        print(r, json.dumps(refresh_region(r, prev_raw, prev_build, out_root, data_through=data_through,
                                           sp_end=avail["sp_end"])["years_rebuilt"]), flush=True)
    builds = [(out_root / "record" / r, out_root / "grids" / r, out_root / "raw" / r) for r in REGION_IDS]
    return publish.publish_many(builds, store_root, data_through=data_through, code_revision=rev,
                                noaa20_check=opt.get("noaa20-check"))


if __name__ == "__main__":
    print(main(sys.argv[1:]))
