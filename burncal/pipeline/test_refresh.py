"""Story 2.9: the daily refresh fetches only files whose span changed (no network in tests)."""
import json
from datetime import date

import pytest

from burncal.pipeline import download, refresh

EXTENT = (90.0, -10.0, 110.0, 10.0)
SP = {"MODIS": date(2026, 8, 31), "VIIRS": date(2026, 7, 31)}
AVAIL = """data_id,min_date,max_date
MODIS_NRT,2026-09-01,2026-11-15
MODIS_SP,2000-11-01,2026-08-31
VIIRS_NOAA20_NRT,2026-08-01,2026-11-15
VIIRS_NOAA20_SP,2018-04-01,2026-07-31
VIIRS_NOAA21_NRT,2024-01-17,2026-11-15
VIIRS_SNPP_NRT,2026-08-01,2026-11-02
VIIRS_SNPP_SP,2012-01-20,2026-07-31
"""


def _prev(tmp_path, data_through, sp_end):
    """A previous raw folder holding every file of the plan, with its coverage.json."""
    prev = tmp_path / "prev"
    prev.mkdir()
    plan = download.plan(data_through=data_through, sp_end=sp_end)
    for s, y in refresh.spans_by_file(plan):
        (prev / f"{s}_{y}.csv").write_text("latitude\n")
    (prev / "coverage.json").write_text(json.dumps(download.coverage(prev, EXTENT, plan)))
    return prev


def _fake_fetch(calls):
    def fetch(source, extent, a, b, raw_dir):
        calls.append((source, a, b))
        (raw_dir / f"{source}_{a.year}.csv").write_text("latitude\n")
        return 0
    return fetch


def test_2_9_ac1_availability_gives_standard_ends_and_last_full_nrt_day():
    a = download.availability(AVAIL)
    assert a["sp_end"] == {"MODIS": date(2026, 8, 31), "VIIRS": date(2026, 7, 31)}
    assert a["nrt_end"] == date(2026, 11, 15)


def test_2_9_ac1_refresh_fetches_only_the_files_whose_span_changed(tmp_path):
    prev = _prev(tmp_path, date(2026, 11, 13), SP)
    calls = []
    changed = refresh.refresh_raw(prev, tmp_path / "new", EXTENT,
                                  download.plan(data_through=date(2026, 11, 14), sp_end=SP), _fake_fetch(calls))
    # Only the two NRT files still growing; Suomi NPP NRT ended on 2 November and is linked.
    assert sorted(calls) == [("MODIS_NRT", date(2026, 9, 1), date(2026, 11, 14)),
                             ("VIIRS_NOAA20_NRT", date(2026, 8, 1), date(2026, 11, 14))]
    assert changed == {2026}
    new = tmp_path / "new"
    assert (new / "MODIS_SP_2010.csv").is_symlink() and (new / "VIIRS_SNPP_NRT_2026.csv").is_symlink()
    cov = json.loads((new / "coverage.json").read_text())
    assert cov["sources"]["VIIRS_NOAA20_NRT"] == [["2026-08-01", "2026-11-14"]]
    assert cov["sources"]["MODIS_NRT"] == [["2026-09-01", "2026-11-14"]]


def test_2_9_ac3_standard_days_replace_nrt_days_as_they_arrive(tmp_path):
    prev = _prev(tmp_path, date(2026, 11, 13), SP)
    calls = []
    later = {"MODIS": date(2026, 9, 30), "VIIRS": date(2026, 7, 31)}
    refresh.refresh_raw(prev, tmp_path / "new", EXTENT,
                        download.plan(data_through=date(2026, 11, 13), sp_end=later), _fake_fetch(calls))
    assert sorted(calls) == [("MODIS_NRT", date(2026, 10, 1), date(2026, 11, 13)),
                             ("MODIS_SP", date(2026, 1, 1), date(2026, 9, 30))]
    cov = json.loads((tmp_path / "new" / "coverage.json").read_text())
    assert cov["sources"]["MODIS_SP"] == [["2002-07-01", "2026-09-30"]]
    assert cov["sources"]["MODIS_NRT"] == [["2026-10-01", "2026-11-13"]]


def test_2_9_ac1_an_incomplete_fetch_stops_the_refresh(tmp_path):
    prev = _prev(tmp_path, date(2026, 11, 13), SP)
    with pytest.raises(RuntimeError, match="refresh incomplete"):
        refresh.refresh_raw(prev, tmp_path / "new", EXTENT, download.plan(data_through=date(2026, 11, 14), sp_end=SP),
                            lambda *a: 3)
    assert not (tmp_path / "new" / "coverage.json").exists()


def test_2_9_refresh_never_writes_into_an_existing_folder(tmp_path):
    prev = _prev(tmp_path, date(2026, 11, 13), SP)
    (tmp_path / "new").mkdir()
    with pytest.raises(FileExistsError):
        refresh.refresh_raw(prev, tmp_path / "new", EXTENT, download.plan(data_through=date(2026, 11, 13), sp_end=SP))


def test_2_9_link_years_links_every_unchanged_year_only(tmp_path):
    prev, new = tmp_path / "prev", tmp_path / "new"
    prev.mkdir()
    for n in ("AQUA_2025.parquet", "AQUA_2026.parquet", "NOAA20_2026.parquet", "evidence_1deg.parquet"):
        (prev / n).write_bytes(b"x")
    refresh._link_years(prev, new, {2026})
    assert sorted(p.name for p in new.iterdir()) == ["AQUA_2025.parquet"]
