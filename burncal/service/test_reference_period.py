"""Story 8.3: the reference period as a request option on /calendar and /analytics.csv.

With no option every answer is exactly what it was; with one the medians, means, anomalies and the
current-month card use it, while the flags keep 2003-2011 and the rankings keep following the range.
"""
import json
import statistics
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from burncal.service import answers
from burncal.service.app import _regions, create_app
from burncal.service.store import Store
from burncal.service.test_service import assert_valid as valid
from burncal.service.test_store_service import AMAZON, _body, client, store_root, versions  # noqa: F401

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "contract" / "fixture"
FLAGS = {"start_year": 2003, "end_year": 2011}
SPAN = {"start_year": 2003, "end_year": 2011}
LATE = {"start_year": 2016, "end_year": 2025}
STAT_KEYS = ("median", "reference_mean", "ratio_to_median", "anomaly_count", "anomaly_pct", "anomaly_class",
             "no_typical_activity")


def fixture(name):
    return json.loads((FIXTURE / name).read_text(encoding="utf-8"))


@pytest.fixture
def fixture_client(monkeypatch, tmp_path):
    monkeypatch.setenv("BURNCAL_STORE_ROOT", str(tmp_path))  # no published store: fixture mode
    return TestClient(create_app())


def _fixture_body(**extra):
    meta = fixture("meta.json")
    return {"record_version": meta["record_version"],
            "aoi": {"name": "Sumatra", "geometry": {"type": "Polygon", "coordinates": [[[95, -6], [106, -6], [106, 6], [95, 6], [95, -6]]]}},
            "start": "2002-07-01", "end": "2026-11-13", **extra}


# ---- no option: nothing changes -------------------------------------------------------------
def test_8_3_no_option_fixture_answer_is_byte_identical(fixture_client):
    r = fixture_client.post("/calendar", json=_fixture_body())
    assert r.json() == fixture("calendar.json")
    # The bytes are the fixture's, as served before the option existed.
    assert r.content == json.dumps(fixture("calendar.json"), ensure_ascii=False, allow_nan=False,
                                   separators=(",", ":")).encode()


def test_8_3_no_option_store_answer_is_byte_identical(client, versions, store_root):  # noqa: F811
    body = _body(versions[0], AMAZON, name=None)
    plain = client.post("/calendar", json=body)
    # answers.calendar called as before the option existed (no reference_period argument)
    v = Store(store_root).get(versions[0])
    direct = answers.calendar(v, shape(AMAZON), None, date(2002, 7, 1), date(2026, 11, 13), _regions())
    assert plain.json() == direct
    # and the default period sent explicitly gives the same bytes, on /calendar and /analytics.csv
    explicit = {**body, "reference_period": {"start_year": 2003, "end_year": 2025}}
    assert plain.content == client.post("/calendar", json=explicit).content
    assert client.post("/analytics.csv", json=body).text == client.post("/analytics.csv", json=explicit).text


# ---- a period: medians, means, anomalies and card follow it; flags and rankings do not -------
def test_8_3_ac1_store_statistics_use_the_period_and_flags_keep_2003_2011(client, versions, store_root):  # noqa: F811
    body = _body(versions[0], AMAZON, name=None)
    full = client.post("/calendar", json=body).json()
    cut = client.post("/calendar", json={**body, "reference_period": SPAN}).json()
    valid(cut, "Calendar")
    assert cut["reference_period"] == SPAN and cut["current_month"]["reference_period"] == SPAN
    assert cut["flag_reference_years"] == full["flag_reference_years"] == FLAGS
    # the median and mean are over the complete Septembers of 2003-2011 only, from unrounded counts
    v = Store(store_root).latest()
    sums = v.count_points(shape(AMAZON))[:, 0]
    months = {m["month"]: m for m in cut["months"]}
    sep = [sums[(y - 2002) * 12 + 8] for y in range(2003, 2012) if months[f"{y}-09"]["complete"]]
    m = months["2015-09"]
    assert m["median"] == round(statistics.median(sep), 1)
    assert m["reference_mean"] == round(statistics.fmean(sep), 1)
    assert m["anomaly_count"] == round(sums[(2015 - 2002) * 12 + 8] - statistics.fmean(sep), 1)
    assert cut["calendar_month_medians"][8]["median"] == m["median"]
    assert cut["calendar_month_medians"] != full["calendar_month_medians"]
    # counts, flags, colours and rankings are untouched
    fm = {x["month"]: x for x in full["months"]}
    for x in cut["months"]:
        for k in set(x) - set(STAT_KEYS):
            assert x[k] == fm[x["month"]][k], (x["month"], k)
    assert cut["statistics"] == full["statistics"] and cut["year_totals"] == full["year_totals"]
    # the card's usual is the median of the same days in each complete year of the period
    card = cut["current_month"]
    years = [y["year"] for y in card["same_days_by_year"]]
    assert years == list(range(2003, 2012))
    to_date, by_year = v.same_days(shape(AMAZON), 11, 13, years)
    assert card["same_days_median"] == round(statistics.median(by_year), 1)
    assert card["count_to_date"] == full["current_month"]["count_to_date"]
    assert card["cells_flagged_strong"] == full["current_month"]["cells_flagged_strong"]


def test_8_3_ac1_analytics_csv_states_both_periods(client, versions):  # noqa: F811
    body = {**_body(versions[0], AMAZON, name=None), "reference_period": LATE}
    text = client.post("/analytics.csv", json=body).text
    assert "# reference_period: 2016 to 2025\n" in text
    assert "# flag_reference_years: 2003 to 2011\n" in text


def test_8_3_ac1_fixture_mode_restates_the_fixture(fixture_client):
    base = fixture("calendar.json")
    cut = fixture_client.post("/calendar", json=_fixture_body(reference_period=LATE)).json()
    valid(cut, "Calendar")
    assert cut["reference_period"] == LATE and cut["flag_reference_years"] == FLAGS
    by = {m["month"]: m for m in base["months"]}
    sep = [by[f"{y}-09"]["count"] for y in range(2016, 2026) if by[f"{y}-09"]["complete"]]
    got = {m["month"]: m for m in cut["months"]}["2019-09"]
    assert got["median"] == round(statistics.median(sep), 1)
    assert got["count"] == by["2019-09"]["count"] and got["colour_class"] == by["2019-09"]["colour_class"]
    card = cut["current_month"]
    assert [y["year"] for y in card["same_days_by_year"]] == list(range(2016, 2026))
    assert card["reference_period"] == LATE
    assert cut["statistics"] == base["statistics"]


# ---- refusals -------------------------------------------------------------------------------
@pytest.mark.parametrize("span,detail", [
    ({"start_year": 2022, "end_year": 2025}, "at least 5 years"),
    ({"start_year": 2002, "end_year": 2010}, "complete years of the record, 2003 to 2025"),
    ({"start_year": 2020, "end_year": 2026}, "complete years of the record, 2003 to 2025"),
    ({"start_year": 2011, "end_year": 2003}, "before the start year"),
    ({"start_year": 2003.5, "end_year": 2011}, "reference_period.start_year"),
    ({"start_year": "2003", "end_year": 2011}, "reference_period.start_year"),
    ({"start_year": 2003}, "reference_period.end_year"),
    ({"start_year": 2003, "end_year": 2011, "month": 1}, "reference_period.month"),
])
@pytest.mark.parametrize("mode", ["store", "fixture"])
def test_8_3_bad_period_is_a_400_problem(span, detail, mode, client, versions, fixture_client):  # noqa: F811
    c, body = (client, _body(versions[0], AMAZON, name=None)) if mode == "store" else (fixture_client, _fixture_body())
    for path in ("/calendar", "/analytics.csv"):
        r = c.post(path, json={**body, "reference_period": span})
        assert r.status_code == 400 and r.headers["content-type"] == "application/problem+json"
        p = r.json()
        valid(p, "Problem")
        assert p["code"] == "invalid_reference_period" and detail in p["detail"], p
