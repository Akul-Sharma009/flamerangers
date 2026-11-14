"""Story 2.6: publish writes a whole version and switches one pointer file."""
import json
from datetime import date

import pandas as pd
import pytest

from burncal.pipeline import publish

COVERAGE = {"extent": [100.0, -2.0, 102.0, 0.0], "sources": {
    "MODIS_SP": [["2002-07-01", "2021-12-31"]],
    "VIIRS_SNPP_SP": [["2012-01-20", "2024-02-10"], ["2024-02-16", "2026-07-31"]],
    "VIIRS_SNPP_NRT": [["2026-08-01", "2026-11-02"]],
    "VIIRS_NOAA20_NRT": [["2026-08-01", "2026-11-13"]],
}}
PARITY_OK = lambda: {"passed": True, "misses": {}}  # noqa: E731  stand-in for the AD-2 case check


def test_2_6_ac1_coverage_days_per_satellite_quality_month():
    days, missing = publish.coverage_tables(COVERAGE, data_through=date(2026, 11, 13))
    d = days.set_index(["satellite", "quality", "year", "month"])
    assert d.loc[("AQUA", "SP", 2002, 7), "days"] == 28  # Aqua starts 4 July 2002
    assert d.loc[("TERRA", "SP", 2002, 7), "days"] == 31
    assert d.loc[("SNPP", "SP", 2024, 2), "days"] == 29 - 5
    assert d.loc[("SNPP", "NRT", 2026, 11), "days"] == 2 and bool(d.loc[("SNPP", "NRT", 2026, 11), "feeds_record"])
    assert d.loc[("NOAA20", "NRT", 2026, 11), "days"] == 13 and bool(d.loc[("NOAA20", "NRT", 2026, 11), "feeds_record"])
    assert not bool(d.loc[("NOAA20", "NRT", 2026, 10), "feeds_record"])
    assert not bool(d.loc[("SNPP", "SP", 2015, 1), "feeds_record"])
    m = set(map(tuple, missing[["year", "month"]].to_numpy()))
    assert (2024, 2) in m and (2024, 3) not in m and (2026, 11) not in m and (2002, 7) not in m


def test_2_6_ac1_standard_wins_over_nrt_per_day():
    cov = {"extent": [0, 0, 1, 1], "sources": {"MODIS_SP": [["2026-08-01", "2026-08-31"]],
                                                "MODIS_NRT": [["2026-08-20", "2026-09-05"]]}}
    days, _ = publish.coverage_tables(cov, data_through=date(2026, 9, 5))
    d = days[days.satellite == "AQUA"].set_index(["quality", "year", "month"])["days"]
    assert d[("SP", 2026, 8)] == 31 and ("NRT", 2026, 8) not in d.index and d[("NRT", 2026, 9)] == 5


def _inputs(tmp_path):
    rec, grids, raw = tmp_path / "record", tmp_path / "grids", tmp_path / "raw"
    for d in (rec, grids, raw):
        d.mkdir()
    rows = pd.DataFrame({"latitude": [-1.0, -1.5], "longitude": [101.0, 101.5], "satellite": ["AQUA", "AQUA"],
                         "acq_datetime_utc": pd.to_datetime(["2015-01-01 06:00", "2015-01-02 06:00"], utc=True),
                         "excluded_reason": ["none", "static"], "feeds_record": [True, True], "weight": [1.0, 0.0]})
    rows.to_parquet(rec / "AQUA_2015.parquet")
    pd.DataFrame({"sw_lon": [101.0], "sw_lat": [-2.0], "evidence_class": ["tuned"]}).to_parquet(rec / "evidence_1deg.parquet")
    for name in ("cells_1deg", "cells_025deg", "thresholds_1deg", "flags_1deg"):
        pd.DataFrame({"x": [1]}).to_parquet(grids / f"{name}.parquet")
    (raw / "MODIS_SP_2015.csv").write_text("latitude\n")
    (raw / "coverage.json").write_text(json.dumps(COVERAGE))
    return rec, grids, raw


def test_2_6_ac1_publish_writes_a_version_and_switches_the_pointer(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    root = tmp_path / "store"
    v1 = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="abc", parity_check=PARITY_OK)
    assert v1.startswith("20261113-") and len(v1) == 17
    vdir = root / "versions" / v1
    man = json.loads((vdir / "manifest.json").read_text())
    assert man["record_version"] == v1 and man["data_through"] == "2026-11-13"
    assert man["extents"] == [{"name": "raw", "bbox": COVERAGE["extent"]}]
    assert {"coverage_days.parquet", "missing_days.parquet", "points.parquet", "grids", "records"} <= {p.name for p in vdir.iterdir()}
    assert len(pd.read_parquet(vdir / "points.parquet")) == 1  # only rows that are in a count
    assert (vdir / "records" / "raw" / "AQUA_2015.parquet").exists() and (vdir / "records" / "evidence_1deg.parquet").exists()
    assert json.loads((root / "CURRENT.json").read_text()) == {"record_version": v1, "previous": None}
    # a new code revision is a new version; the previous one stays on disk and is named in the pointer
    v2 = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="def", parity_check=PARITY_OK)
    assert v2 != v1 and (root / "versions" / v1).exists()
    assert json.loads((root / "CURRENT.json").read_text()) == {"record_version": v2, "previous": v1}
    # the same inputs give the same version
    assert publish.record_version(raw, date(2026, 11, 13), "def") == v2



def test_2_8_one_version_holds_several_extents(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    other = tmp_path / "other"
    for d in ("record", "grids", "southern"):
        (other / d).mkdir(parents=True)
    rows = pd.read_parquet(rec / "AQUA_2015.parquet").assign(longitude=[25.0, 25.5], latitude=[-10.0, -10.5])
    rows.to_parquet(other / "record" / "AQUA_2015.parquet")
    pd.DataFrame({"sw_lon": [25.0], "sw_lat": [-11.0], "evidence_class": ["tested_unseen"]}).to_parquet(other / "record" / "evidence_1deg.parquet")
    for name in ("cells_1deg", "cells_025deg", "thresholds_1deg", "flags_1deg"):
        pd.DataFrame({"x": [2]}).to_parquet(other / "grids" / f"{name}.parquet")
    (other / "southern" / "MODIS_SP_2015.csv").write_text("latitude\n")
    cov = {"extent": [20.0, -20.0, 35.0, -5.0], "sources": {"MODIS_SP": [["2002-07-01", "2015-12-31"]]}}
    (other / "southern" / "coverage.json").write_text(json.dumps(cov))
    root = tmp_path / "store"
    v = publish.publish_many([(rec, grids, raw), (other / "record", other / "grids", other / "southern")], root,
                             data_through=date(2026, 11, 13), code_revision="x", parity_check=PARITY_OK)
    vdir = root / "versions" / v
    man = json.loads((vdir / "manifest.json").read_text())
    assert [e["name"] for e in man["extents"]] == ["raw", "southern"]
    assert (vdir / "records" / "southern" / "AQUA_2015.parquet").exists()
    assert len(pd.read_parquet(vdir / "points.parquet")) == 2
    assert len(pd.read_parquet(vdir / "records" / "evidence_1deg.parquet")) == 2
    days = pd.read_parquet(vdir / "coverage_days.parquet")
    assert set(days["extent"]) == {"raw", "southern"}
    with pytest.raises(ValueError, match="both named"):
        publish.publish_many([(rec, grids, raw), (rec, grids, raw)], tmp_path / "s2", data_through=date(2026, 11, 13), code_revision="y", parity_check=PARITY_OK)


def test_2_6_ad2_publish_refuses_converted_counts_without_parity(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    failing = lambda: {"passed": False, "reason": "parity case not available", "misses": {}}  # noqa: E731
    with pytest.raises(RuntimeError, match="AD-2"):
        publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2026, 11, 13), code_revision="a",
                        parity_check=failing)
    assert not (tmp_path / "store" / "CURRENT.json").exists()
    # a record that ends before 2022 holds no converted count: no gate
    v = publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2021, 12, 31), code_revision="a",
                        parity_check=failing)
    man = json.loads((tmp_path / "store" / "versions" / v / "manifest.json").read_text())
    assert man["parity"] == {"required": False}


def test_2_6_ad2_publish_records_the_parity_result(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    ok = lambda: {"passed": True, "misses": {"C1 1deg": 1.5e-10}}  # noqa: E731
    v = publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2026, 11, 13), code_revision="a",
                        parity_check=ok)
    man = json.loads((tmp_path / "store" / "versions" / v / "manifest.json").read_text())
    assert man["parity"] == {"required": True, "passed": True, "misses": {"C1 1deg": 1.5e-10}}


@pytest.mark.skipif(not __import__("os").environ.get("BURNCAL_PARITY_CASE_DIR"), reason="BURNCAL_PARITY_CASE_DIR not set")
def test_2_6_ad2_the_real_parity_case_passes():
    from burncal.pipeline import parity
    got = parity.check_case()
    assert got["passed"] and len(got["misses"]) == 6, got



def test_2_6_null_is_not_zero_a_month_with_no_feeding_day_is_uncovered():
    cov = {"extent": [0, 0, 5, 5], "sources": {"MODIS_SP": [["2002-07-01", "2021-12-31"]],
                                                "VIIRS_SNPP_SP": [["2022-01-01", "2023-04-30"], ["2023-06-01", "2026-07-31"]]}}
    _, missing = publish.coverage_tables(cov, data_through=date(2026, 7, 31))
    m = missing.set_index(["year", "month"])["uncovered"]
    assert bool(m[(2023, 5)]) is True
    assert (2023, 4) not in m.index and (2023, 6) not in m.index
