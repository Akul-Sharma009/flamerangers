"""Story 2.3: ingest and clean one extent's FIRMS files into the cleaned store.

    uv run python -m burncal.pipeline.build_extent <raw dir> <land geojson> <out dir>

Every row is kept and marked; only NRT rows of a satellite-day that has
standard rows are left out (AD-6). Prints counts only.
"""
import json
import sys
from pathlib import Path

from burncal.pipeline import clean, ingest


def build(raw_dir, land_path, out_dir) -> dict:
    df = ingest.ingest_csv_files(sorted(Path(raw_dir).glob("*.csv")))
    n_in = len(df)
    df = ingest.prefer_standard(df)
    land = clean.load_land(land_path)
    df = clean.clean(df, land, clean.static_from(df, land))
    ingest.write_partitions(df, out_dir)
    by = df.groupby(["satellite", "quality", "excluded_reason"]).size()
    return {"rows_in": n_in, "nrt_rows_replaced_by_standard": n_in - len(df), "rows_stored": len(df),
            "by_satellite_quality_reason": {" ".join(k): int(v) for k, v in by.items()}}


if __name__ == "__main__":
    print(json.dumps(build(*sys.argv[1:4]), indent=1))
