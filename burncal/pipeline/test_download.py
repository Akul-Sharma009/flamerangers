"""Story 6.2: the download plan for one region (no network in tests)."""
import json
from datetime import date

from burncal.pipeline import download


def test_6_2_plan_years_and_windows():
    plan = download.plan(data_through=date(2026, 11, 13))
    years = dict((s, [y for y, _, _ in download.years(spans)]) for s, spans in plan.items())
    assert years["MODIS_SP"][0] == 2002 and years["MODIS_SP"][-1] == 2026
    assert years["VIIRS_SNPP_SP"][:4] == [2014, 2016, 2017, 2020]  # the static-mask years
    assert years["VIIRS_NOAA20_SP"][0] == 2022
    assert [n for _, n in download.windows(date(2024, 1, 1), date(2024, 1, 12))] == [5, 5, 2]


def test_6_2_coverage_names_only_the_years_present(tmp_path):
    plan = {"MODIS_SP": [(date(2002, 7, 1), date(2004, 12, 31))]}
    for y in (2002, 2004):
        (tmp_path / f"MODIS_SP_{y}.csv").write_text("latitude\n")
    cov = download.coverage(tmp_path, (90.0, -10.0, 110.0, 10.0), plan)
    assert cov["extent"] == [90.0, -10.0, 110.0, 10.0]
    assert cov["sources"]["MODIS_SP"] == [["2002-07-01", "2002-12-31"], ["2004-01-01", "2004-12-31"]]
    json.dumps(cov)


def test_6_2_region_extent_is_whole_tiles():
    assert download.region_extent("sumatra") == (90.0, -10.0, 110.0, 10.0)


def test_6_2_download_keeps_good_windows_and_retries_only_failed_ones(tmp_path, monkeypatch):
    calls, fail_once = [], {"2024-01-06"}
    HEADER = "latitude,longitude,acq_date\n"

    def fake(source, extent, start, days):
        calls.append(start)
        if start in fail_once:
            fail_once.discard(start)
            raise RuntimeError("FIRMS request failed (HTTPError); URL withheld")
        return HEADER + f"1.0,2.0,{start}\n"

    monkeypatch.setattr(download.firms, "area_csv", fake)
    monkeypatch.setattr(download, "ATTEMPTS", 1)
    monkeypatch.setattr(download.time, "sleep", lambda s: None)
    plan = {"MODIS_SP": [(date(2024, 1, 1), date(2024, 1, 12))]}
    first = download.download_plan(plan, (90.0, -10.0, 110.0, 10.0), tmp_path)
    assert first["failed_rerun_to_retry"] == ["MODIS_SP_2024 (1 of 3 windows)"]
    assert not (tmp_path / "MODIS_SP_2024.csv").exists()
    calls.clear()
    second = download.download_plan(plan, (90.0, -10.0, 110.0, 10.0), tmp_path)
    assert calls == ["2024-01-06"]  # only the window that failed is fetched again
    assert second["downloaded"] == ["MODIS_SP_2024"]
    text = (tmp_path / "MODIS_SP_2024.csv").read_text()
    assert text.splitlines()[0] == HEADER.strip() and len(text.splitlines()) == 4
    assert not (tmp_path / ".parts").exists() or not any((tmp_path / ".parts").iterdir())
