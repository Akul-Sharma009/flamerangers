"""Story 2.3 (a): FIRMS ingest. Parse area-API CSV, tag quality, prefer standard over NRT, store per satellite-year.

Never logs URLs or the key; firms.area_csv scrubs its own errors.
"""
import time
from datetime import date, timedelta
from io import StringIO
from pathlib import Path

import pandas as pd

from burncal.pipeline import firms

# FIRMS writes several codes per satellite; anything else is an error.
SATELLITES = {
    "AQUA": "AQUA", "A": "AQUA",
    "TERRA": "TERRA", "T": "TERRA",
    "N": "SNPP",
    "N20": "NOAA20", "1": "NOAA20",
    "N21": "NOAA21", "2": "NOAA21",
}
STR_COLUMNS = {c: str for c in ("confidence", "satellite", "instrument", "acq_date", "acq_time", "version", "daynight")}
WINDOW_DAYS = 5
ATTEMPTS = 4


def _split_source(source: str) -> tuple[str, str]:
    """(instrument, quality) from a source name such as VIIRS_NOAA20_NRT."""
    parts = source.split("_")
    if len(parts) < 2 or parts[-1] not in ("SP", "NRT") or parts[0] not in ("MODIS", "VIIRS"):
        raise ValueError(f"unknown FIRMS source: {source!r}")
    return parts[0], parts[-1]


def normalize(csv_text: str, source: str) -> pd.DataFrame:
    """One FIRMS area CSV to a frame: all FIRMS columns kept, plus quality and UTC time fields.

    `satellite` and `instrument` are replaced by the contract values (the FIRMS spelling is not kept).
    """
    instrument, quality = _split_source(source)
    df = pd.read_csv(StringIO(csv_text), dtype=STR_COLUMNS)
    codes = df["satellite"].str.strip().str.upper()
    unknown = sorted(set(codes) - set(SATELLITES))
    if unknown:
        raise ValueError(f"unknown FIRMS satellite code(s): {unknown}")
    df["satellite_firms"] = df["satellite"]  # FIRMS's own code, kept as given
    df["satellite"] = codes.map(SATELLITES)
    df["instrument"] = instrument
    df["quality"] = quality
    df["type"] = pd.to_numeric(df["type"], errors="raise").astype("Int64") if "type" in df else pd.array([pd.NA] * len(df), dtype="Int64")
    stamp = df["acq_date"] + " " + df["acq_time"].str.zfill(4)
    df["acq_datetime_utc"] = pd.to_datetime(stamp, format="%Y-%m-%d %H%M", utc=True)
    df["utc_date"] = df["acq_datetime_utc"].dt.date
    return df


def prefer_standard(df: pd.DataFrame) -> pd.DataFrame:
    """Drop NRT rows of any (satellite, utc_date) that has SP rows. Nothing else is dropped."""
    keys = list(zip(df["satellite"], df["utc_date"]))
    sp_days = set(k for k, q in zip(keys, df["quality"]) if q == "SP")
    drop = [q == "NRT" and k in sp_days for k, q in zip(keys, df["quality"])]
    return df[~pd.Series(drop, index=df.index)].reset_index(drop=True)


def _source_of(path: Path, sources) -> str:
    """Source = filename prefix before the year, e.g. MODIS_SP_2015.csv -> MODIS_SP."""
    prefix = path.stem.rsplit("_", 1)[0]
    if prefix not in sources:
        raise ValueError(f"cannot tell the FIRMS source from file name {path.name!r}")
    return prefix


def ingest_csv_files(paths, sources=firms.SOURCES) -> pd.DataFrame:
    """Normalize already-downloaded CSVs; the source is each file name's prefix."""
    pairs = [(Path(p), _source_of(Path(p), sources)) for p in paths]
    frames = [normalize(p.read_text(encoding="utf-8"), src) for p, src in pairs]
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def fetch(source: str, bbox: tuple[float, float, float, float], start: str, end: str) -> pd.DataFrame:
    """Download start..end (ISO dates, inclusive) in sequential 5-day windows. Each window is tried
    4 times with a growing sleep, then raises."""
    day, last = date.fromisoformat(start), date.fromisoformat(end)
    frames = []
    while day <= last:
        days = min(WINDOW_DAYS, (last - day).days + 1)
        for attempt in range(1, ATTEMPTS + 1):
            try:
                text = firms.area_csv(source, bbox, day.isoformat(), days)
                break
            except Exception:  # noqa: BLE001
                if attempt == ATTEMPTS:
                    raise RuntimeError(f"FIRMS window {day.isoformat()} (+{days} d) failed after {ATTEMPTS} attempts") from None
                time.sleep(5 * attempt)
        frames.append(normalize(text, source))
        day += timedelta(days=days)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def write_partitions(df: pd.DataFrame, out_dir) -> list[Path]:
    """After prefer_standard, one zstd Parquet per satellite and UTC year (SATELLITE_YEAR.parquet), overwritten."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    df = prefer_standard(df)
    years = df["acq_datetime_utc"].dt.year
    written = []
    for (sat, year), part in df.groupby(["satellite", years]):
        path = out_dir / f"{sat}_{year}.parquet"
        part.reset_index(drop=True).to_parquet(path, compression="zstd", index=False)
        written.append(path)
    return written
