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
