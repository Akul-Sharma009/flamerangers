"""Story 2.3: ingest + clean + store for one extent, end to end on canned files."""
import json

import pandas as pd

from burncal.pipeline import build_extent

MODIS = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type\n"
VIIRS = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type\n"


def _files(tmp_path):
    raw = tmp_path / "raw"; raw.mkdir()
    (raw / "MODIS_SP_2024.csv").write_text(MODIS + "1.0,1.0,320,1,1,2024-07-01,0600,Aqua,MODIS,80,6.1,300,10,D,0\n"
                                           "20.0,20.0,320,1,1,2024-07-01,0600,Terra,MODIS,80,6.1,300,10,D,0\n")
    (raw / "VIIRS_NOAA21_SP_2024.csv").write_text(VIIRS + "1.0,1.0,330,0.4,0.4,2024-07-02,1800,N21,VIIRS,n,2,290,3,N,0\n")
    (raw / "VIIRS_NOAA21_NRT_2024.csv").write_text(VIIRS + "1.0,1.0,330,0.4,0.4,2024-07-02,1801,N21,VIIRS,n,2.0NRT,290,3,N,\n"
                                                   "1.0,1.0,330,0.4,0.4,2024-07-03,1800,N21,VIIRS,n,2.0NRT,290,3,N,\n")
    land = tmp_path / "land.geojson"
    land.write_text(json.dumps({"type": "Polygon", "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]}))
    return raw, land


def test_2_3_ac1_every_row_kept_with_quality_daynight_and_reason(tmp_path):
    raw, land = _files(tmp_path)
    summary = build_extent.build(raw, land, tmp_path / "out")
    df = pd.concat(pd.read_parquet(p) for p in sorted((tmp_path / "out").glob("*.parquet")))
    assert len(df) == 4  # 5 rows in, 1 NRT row dropped because its satellite-day has SP rows
    assert {"quality", "daynight", "daynight_file", "excluded_reason", "satellite_firms", "frp"} <= set(df.columns)
    assert set(df["excluded_reason"]) <= {"none", "offshore", "static"}
    assert (df.loc[df.longitude == 20.0, "excluded_reason"] == "offshore").all()  # marked, not deleted
    assert summary["nrt_rows_replaced_by_standard"] == 1


def test_2_3_ac3_standard_wins_per_satellite_day(tmp_path):
    raw, land = _files(tmp_path)
    build_extent.build(raw, land, tmp_path / "out")
    df = pd.concat(pd.read_parquet(p) for p in sorted((tmp_path / "out").glob("*.parquet")))
    n21 = df[df.satellite == "NOAA21"]
    days = n21.groupby(n21.acq_datetime_utc.dt.date)["quality"].apply(set).to_dict()
    assert all(len(q) == 1 for q in days.values())  # never both qualities for one satellite-day
    assert sorted(n21["quality"]) == ["NRT", "SP"]  # 2 July standard, 3 July NRT only
