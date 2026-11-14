"""Story 2.3: ingest and clean one extent's FIRMS files into the cleaned store.

    uv run python -m burncal.pipeline.build_extent <raw dir> <land geojson> <out dir>

Every row is kept and marked; only NRT rows of a satellite-day that has
standard rows are left out (AD-6). Prints counts only.
"""
import json
import sys
from pathlib import Path

from burncal.core import clean as core_clean
from burncal.pipeline import clean, ingest


def _batches(paths):
    """Raw files grouped by (source without quality, year), e.g. VIIRS_SNPP_SP_2016 and VIIRS_SNPP_NRT_2016."""
    out = {}
    for p in paths:
        prefix, year = p.stem.rsplit("_", 1)
        out.setdefault((prefix.rsplit("_", 1)[0], int(year)), []).append(p)
    return dict(sorted(out.items(), key=lambda kv: (kv[0][1], kv[0][0])))


def build(raw_dir, land_path, out_dir) -> dict:
    """One satellite family and year at a time, so an extent never has to fit in memory at once.

    The static mask comes first, from the tuning-year MODIS and Suomi NPP files only. Each batch then
    holds the standard and NRT files of one satellite family and year, so standard still beats NRT per
    satellite-day (AD-6). The result equals cleaning the whole extent at once.
    """
    paths = sorted(Path(raw_dir).glob("*.csv"))
    land = clean.load_land(land_path)
    mask_paths = [p for p in paths if p.stem.startswith(("MODIS_", "VIIRS_SNPP_"))
                  and int(p.stem.rsplit("_", 1)[1]) in core_clean.STATIC_YEARS]
    mask_rows = ingest.ingest_csv_files(mask_paths)
    static = clean.static_from(ingest.prefer_standard(mask_rows), land) if len(mask_rows) else []
    del mask_rows
    n_in = n_out = 0
    by = {}
    for _, batch in _batches(paths).items():
        df = ingest.ingest_csv_files(batch)
        n_in += len(df)
        df = clean.clean(ingest.prefer_standard(df), land, static)
        n_out += len(df)
        ingest.write_partitions(df, out_dir)
        for k, v in df.groupby(["satellite", "quality", "excluded_reason"]).size().items():
            by[" ".join(k)] = by.get(" ".join(k), 0) + int(v)
    return {"rows_in": n_in, "nrt_rows_replaced_by_standard": n_in - n_out, "rows_stored": n_out,
            "by_satellite_quality_reason": dict(sorted(by.items()))}


if __name__ == "__main__":
    print(json.dumps(build(*sys.argv[1:4]), indent=1))
