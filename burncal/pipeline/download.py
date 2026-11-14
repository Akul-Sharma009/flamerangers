"""Story 6.2: download one region's FIRMS area-API files on whole 5-degree tiles. Resumable.

    uv run python -m burncal.pipeline.download <region_id> <raw dir> <data_through YYYY-MM-DD>

Needs FIRMS_MAP_KEY (environment or .env). One CSV per source and year; a year whose windows keep
failing is left out and reported, and rerunning fetches only what is missing. Writes coverage.json
from the files present, so a missing year shows as not loaded, never as zero. The plan is the record's
needs plus NOAA-20 from 2022 (the "middle" scope, DECISIONS.md, Story 2.8).
"""
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

from shapely.geometry import shape

from burncal.core import clean as core_clean
from burncal.core import regions
from burncal.pipeline import firms

REGIONS = Path(__file__).resolve().parents[2] / "contract" / "regions.geojson"
SP_END = {"MODIS": date(2026, 8, 31), "VIIRS": date(2026, 7, 31)}  # last standard-processing day in FIRMS (14 Nov)
SNPP_LAST = date(2026, 11, 2)
WINDOW_DAYS, WORKERS, ATTEMPTS = 5, 4, 5


def region_extent(region_id: str) -> tuple:
    gj = json.loads(REGIONS.read_text(encoding="utf-8"))
    f = next(f for f in gj["features"] if f["properties"]["region_id"] == region_id)
    return regions.tile_extent(shape(f["geometry"]).bounds)


def plan(*, data_through: date) -> dict:
    """source -> spans of dates to download."""
    D = date
    return {
        "MODIS_SP": [(D(2002, 7, 1), SP_END["MODIS"])],
        "MODIS_NRT": [(SP_END["MODIS"] + timedelta(days=1), data_through)],
        "VIIRS_SNPP_SP": [(D(y, 1, 1), D(y, 12, 31)) for y in core_clean.STATIC_YEARS] + [(D(2022, 1, 1), SP_END["VIIRS"])],
        "VIIRS_SNPP_NRT": [(SP_END["VIIRS"] + timedelta(days=1), min(SNPP_LAST, data_through))],
        "VIIRS_NOAA20_SP": [(D(2022, 1, 1), SP_END["VIIRS"])],
        "VIIRS_NOAA20_NRT": [(SP_END["VIIRS"] + timedelta(days=1), data_through)],
    }


def years(spans):
    for a, b in spans:
        for y in range(a.year, b.year + 1):
            yield y, max(a, date(y, 1, 1)), min(b, date(y, 12, 31))


def windows(a: date, b: date):
    while a <= b:
        n = min(WINDOW_DAYS, (b - a).days + 1)
        yield a, n
        a += timedelta(days=n)


def _fetch(args):
    extent, source, start, days = args
    for attempt in range(ATTEMPTS):
        try:
            return firms.area_csv(source, extent, start.isoformat(), days)
        except RuntimeError:
            time.sleep(10 * (attempt + 1))
    return None


def coverage(raw_dir, extent, plan_: dict) -> dict:
    """The extent and, per source, the date spans whose year files are present."""
    raw_dir, out = Path(raw_dir), {"extent": list(extent), "sources": {}}
    for source, spans in plan_.items():
        rng = []
        for y, a, b in years(spans):
            if (raw_dir / f"{source}_{y}.csv").exists():
                if rng and date.fromisoformat(rng[-1][1]) + timedelta(days=1) == a:
                    rng[-1][1] = b.isoformat()
                else:
                    rng.append([a.isoformat(), b.isoformat()])
        out["sources"][source] = rng
    return out


def download(region_id: str, raw_dir, data_through: date) -> dict:
    extent, raw_dir = region_extent(region_id), Path(raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    p, done, failed = plan(data_through=data_through), [], []
    for source, spans in p.items():
        for y, a, b in years(spans):
            path = raw_dir / f"{source}_{y}.csv"
            if path.exists() or a > b:
                continue
            with ThreadPoolExecutor(WORKERS) as ex:
                texts = list(ex.map(_fetch, [(extent, source, s, n) for s, n in windows(a, b)]))
            if any(t is None or not t.lower().startswith("latitude") for t in texts):
                failed.append(f"{source}_{y}")
                continue
            rows = [line for t in texts for line in t.splitlines()[1:] if line]
            path.write_text("\n".join([texts[0].splitlines()[0]] + rows) + "\n")
            done.append(f"{source}_{y}")
    (raw_dir / "coverage.json").write_text(json.dumps(coverage(raw_dir, extent, p), indent=1))
    return {"extent": extent, "downloaded": done, "failed_rerun_to_retry": failed}


if __name__ == "__main__":
    print(json.dumps(download(sys.argv[1], sys.argv[2], date.fromisoformat(sys.argv[3])), indent=1))
