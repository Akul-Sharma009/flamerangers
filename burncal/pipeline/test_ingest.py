"""Story 2.3 (a): FIRMS ingest. Canned CSV text only, never the network."""
import pandas as pd
import pytest

from burncal.pipeline import firms, ingest

MODIS_HEAD = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type"
VIIRS_HEAD = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type"
NRT_VIIRS_HEAD = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight"

MODIS_CSV = f"""{MODIS_HEAD}
1.1195,98.9519,310.8,3.1,1.7,2015-01-02,322,Terra,MODIS,27,6.03,286.5,28.5,D,0
-6.1389,106.2873,314.5,1.5,1.2,2015-01-02,617,Aqua,MODIS,61,6.03,293.1,12,D,2
"""
SNPP_CSV = f"""{VIIRS_HEAD}
5.43346,105.21691,298.1,0.38,0.36,2015-01-01,1833,N,VIIRS,n,2,267.61,1.42,N,3
5.58621,104.47377,307.97,0.39,0.36,2015-01-01,0,N,VIIRS,h,2,270.72,1.66,N,3
"""


def viirs_csv(code, rows=1, date="2024-03-05", time="1234", head=NRT_VIIRS_HEAD):
    line = f"1.0,100.0,300.0,0.4,0.4,{date},{time},{code},VIIRS,n,2.0NRT,270.0,1.0,D"
    if head == VIIRS_HEAD:
        line += ",0"
    return head + "\n" + "\n".join([line] * rows) + "\n"


def test_2_3_ac1_keeps_every_row_and_firms_columns_with_quality():
    df = ingest.normalize(MODIS_CSV, "MODIS_SP")
    assert len(df) == 2
    for col in ("latitude", "longitude", "brightness", "scan", "track", "acq_date", "acq_time",
                "satellite", "instrument", "confidence", "version", "bright_t31", "frp", "daynight", "type"):
        assert col in df.columns
    assert (df["quality"] == "SP").all()
    assert df["confidence"].tolist() == ["27", "61"]  # strings, as given
    assert df["satellite"].tolist() == ["TERRA", "AQUA"]
    assert (df["instrument"] == "MODIS").all()


def test_2_3_ac1_viirs_confidence_letters_and_snpp_code():
    df = ingest.normalize(SNPP_CSV, "VIIRS_SNPP_SP")
    assert df["confidence"].tolist() == ["n", "h"]
    assert (df["satellite"] == "SNPP").all() and (df["instrument"] == "VIIRS").all()
    # acq_time zero-padded: 0 -> 00:00, 1833 -> 18:33; tz-aware UTC
    assert df["acq_datetime_utc"].iloc[0] == pd.Timestamp("2015-01-01 18:33", tz="UTC")
    assert df["acq_datetime_utc"].iloc[1] == pd.Timestamp("2015-01-01 00:00", tz="UTC")
    assert df["utc_date"].iloc[0] == pd.Timestamp("2015-01-01").date()
    assert df["bright_ti4"].iloc[0] == pytest.approx(298.1)


@pytest.mark.parametrize("source,code,expected", [
    ("MODIS_SP", "Aqua", "AQUA"), ("MODIS_SP", "A", "AQUA"),
    ("MODIS_SP", "Terra", "TERRA"), ("MODIS_SP", "T", "TERRA"),
    ("VIIRS_SNPP_SP", "N", "SNPP"),
    ("VIIRS_NOAA20_NRT", "N20", "NOAA20"), ("VIIRS_NOAA20_NRT", "1", "NOAA20"),
    ("VIIRS_NOAA21_NRT", "N21", "NOAA21"), ("VIIRS_NOAA21_NRT", "2", "NOAA21"),
])
def test_2_3_ac1_satellite_codes_map_to_contract_enum(source, code, expected):
    head = MODIS_HEAD if source.startswith("MODIS") else VIIRS_HEAD
    row = f"1,100,300,1,1,2020-01-01,100,{code},X,50,1,280,1,D,0"
    df = ingest.normalize(head + "\n" + row + "\n", source)
    assert df["satellite"].iloc[0] == expected


def test_2_3_ac1_unknown_satellite_or_source_raises():
    with pytest.raises(ValueError):
        ingest.normalize(viirs_csv("Z9"), "VIIRS_NOAA20_NRT")
    with pytest.raises(ValueError):
        ingest.normalize(viirs_csv("N20"), "VIIRS_NOAA20_XXX")


def test_2_3_ac1_nrt_without_type_gives_nullable_integer_and_nrt_quality():
    df = ingest.normalize(viirs_csv("N20", rows=2), "VIIRS_NOAA20_NRT")
    assert (df["quality"] == "NRT").all()
    assert str(df["type"].dtype) == "Int64" and df["type"].isna().all()
    sp = ingest.normalize(MODIS_CSV, "MODIS_SP")
    assert str(sp["type"].dtype) == "Int64" and sp["type"].tolist() == [0, 2]


def test_2_3_ac1_ingest_csv_files_uses_filename_prefix_as_source(tmp_path):
    (tmp_path / "MODIS_SP_2015.csv").write_text(MODIS_CSV)
    (tmp_path / "VIIRS_SNPP_SP_2015.csv").write_text(SNPP_CSV)
    paths = sorted(tmp_path.glob("*.csv"))
    df = ingest.ingest_csv_files(paths, firms.SOURCES)
    assert len(df) == 4
    assert set(df["satellite"]) == {"AQUA", "TERRA", "SNPP"}
    with pytest.raises(ValueError):
        ingest.ingest_csv_files([tmp_path / "bogus_2015.csv"], firms.SOURCES)


def test_2_3_ac1_noaa21_sources_registered():
    assert "VIIRS_NOAA21_NRT" in firms.SOURCES and "VIIRS_NOAA21_SP" in firms.SOURCES


def test_2_3_ac3_standard_replaces_nrt_for_same_satellite_day_only():
    sp = ingest.normalize(viirs_csv("N20", rows=2, date="2024-03-05"), "VIIRS_NOAA20_SP")
    nrt = pd.concat([
        ingest.normalize(viirs_csv("N20", rows=3, date="2024-03-05"), "VIIRS_NOAA20_NRT"),  # dropped
        ingest.normalize(viirs_csv("N20", rows=1, date="2024-03-06"), "VIIRS_NOAA20_NRT"),  # other day: kept
        ingest.normalize(viirs_csv("N21", rows=1, date="2024-03-05"), "VIIRS_NOAA21_NRT"),  # other satellite: kept
    ], ignore_index=True)
    out = ingest.prefer_standard(pd.concat([sp, nrt], ignore_index=True))
    assert len(out) == 2 + 1 + 1
    day5 = out[(out["satellite"] == "NOAA20") & (out["utc_date"] == pd.Timestamp("2024-03-05").date())]
    assert (day5["quality"] == "SP").all() and len(day5) == 2
    assert (out["quality"] == "NRT").sum() == 2


def test_2_3_ac3_partitions_one_file_per_satellite_and_year_after_preference(tmp_path):
    a = ingest.normalize(MODIS_CSV, "MODIS_SP")
    nrt = ingest.normalize(MODIS_CSV.replace("2015-01-02", "2015-01-03"), "MODIS_NRT")
    nrt_dup = ingest.normalize(MODIS_CSV, "MODIS_NRT")  # same satellite-days as SP: dropped
    ingest.write_partitions(pd.concat([a, nrt, nrt_dup], ignore_index=True), tmp_path)
    assert sorted(p.name for p in tmp_path.glob("*.parquet")) == ["AQUA_2015.parquet", "TERRA_2015.parquet"]
    aqua = pd.read_parquet(tmp_path / "AQUA_2015.parquet")
    assert len(aqua) == 2 and set(aqua["quality"]) == {"SP", "NRT"}  # Jan 2 SP, Jan 3 NRT
    ingest.write_partitions(a, tmp_path)  # overwrite
    assert len(pd.read_parquet(tmp_path / "AQUA_2015.parquet")) == 1


def test_2_3_ac1_fetch_windows_of_five_days_with_retry(monkeypatch):
    calls, sleeps = [], []
    def fake(source, bbox, date, days):
        calls.append((date, days))
        if len(calls) == 1:
            raise RuntimeError("boom")
        return viirs_csv("N20", date=date)
    monkeypatch.setattr(firms, "area_csv", fake)
    monkeypatch.setattr(ingest.time, "sleep", sleeps.append)
    df = ingest.fetch("VIIRS_NOAA20_NRT", (95, -6, 106, 6), "2024-03-01", "2024-03-12")
    assert calls == [("2024-03-01", 5), ("2024-03-01", 5), ("2024-03-06", 5), ("2024-03-11", 2)]
    assert len(sleeps) == 1 and len(df) == 3


def test_2_3_ac1_fetch_raises_after_four_failed_attempts(monkeypatch):
    n = []
    monkeypatch.setattr(firms, "area_csv", lambda *a: n.append(1) or (_ for _ in ()).throw(RuntimeError("x")))
    monkeypatch.setattr(ingest.time, "sleep", lambda s: None)
    with pytest.raises(RuntimeError):
        ingest.fetch("MODIS_NRT", (0, 0, 1, 1), "2024-03-01", "2024-03-05")
    assert len(n) == 4


def test_2_3_ac1_firms_satellite_code_is_kept():
    from burncal.pipeline import ingest
    text = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type\n0.5,101.3,320.1,1.0,1.0,2015-09-14,0612,Aqua,MODIS,85,6.1,300.2,42.4,D,0\n"
    df = ingest.normalize(text, "MODIS_SP")
    assert df["satellite"].tolist() == ["AQUA"] and df["satellite_firms"].tolist() == ["Aqua"]
