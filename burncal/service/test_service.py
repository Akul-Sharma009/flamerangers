"""Story 1.3 service stub tests, contract 0.5.0.

AC1: with no store, every contract endpoint answers from the fixture, and the
     answers validate against the contract (JSON, problem+json and the CSV spec).
AC3: CORS allows only the listed origins; the service holds no secret.
(AC2, host measurements, is recorded in docs/handoff.md, not tested here.)
"""
import csv
import io
import json
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contract"
SPEC = yaml.safe_load((CONTRACT / "openapi.yaml").read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("urn:contract", Resource(contents=SPEC, specification=DRAFT202012))
WEB_ORIGIN = "https://web.example.org"
LOCAL_WEB = "http://localhost:5173"
PROBLEM_JSON = "application/problem+json"


def fixture(name):
    return json.loads((CONTRACT / "fixture" / name).read_text(encoding="utf-8"))


META = fixture("meta.json")
VERSION = META["record_version"]
SUMATRA = json.loads((CONTRACT / "regions.geojson").read_text(encoding="utf-8"))["features"][0]
AOI = {"name": "Sumatra", "geometry": SUMATRA["geometry"]}
RANGE = {"record_version": VERSION, "aoi": AOI, "start": "2002-07-01", "end": "2026-11-13"}
BODIES = {
    "/calendar": RANGE,
    "/cells": {"record_version": VERSION, "aoi": AOI, "month": "2015-09"},
    "/raw_splice": RANGE,
    "/season": {"record_version": VERSION, "aoi": AOI},
    "/hotspots.csv": RANGE,
    "/analytics.csv": RANGE,
    "/season_to_date": {"record_version": VERSION, "aoi": AOI, "year": 2026},
    "/world_cells": {"record_version": VERSION, "month": "2015-09"},  # Story 8.9
}

COMMON_KEYS = ["title", "aoi_id", "aoi_name", "aoi_area_km2", "aoi_geometry", "date_range",
               "record_version", "data_through", "record_switch", "count_unit"]
ANALYTICS_KEYS = COMMON_KEYS + ["reference_period", "flag_reference_years", "counting_limits", "citation"]
HOTSPOT_KEYS = COMMON_KEYS + ["row_filter", "row_count_note", "counting_limits", "citation"]
ANALYTICS_COLUMNS = ["aoi_id", "year", "month", "harmonized_count", "null_reason", "source",
                     "raw_aqua", "raw_terra", "raw_snpp", "raw_noaa20", "raw_noaa21", "inputs", "complete",
                     "partial_reasons", "validated_satellite", "historical_median", "reference_mean",
                     "ratio_to_median", "anomaly_count", "anomaly_pct", "cells_flagged_strong",
                     "cells_flagged_marginal", "cells_total", "reference_year", "provisional", "rank"]


def assert_valid(body, schema_name):
    v = Draft202012Validator({"$ref": f"urn:contract#/components/schemas/{schema_name}"}, registry=REGISTRY)
    errors = [e.message for e in v.iter_errors(body)]
    assert not errors, errors


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("CORS_ORIGINS", f"{WEB_ORIGIN}, {LOCAL_WEB}")
    monkeypatch.setenv("BURNCAL_STORE_ROOT", str(tmp_path))  # no published store: fixture mode
    from burncal.service.app import create_app

    return TestClient(create_app())


def split_csv(text):
    """Return (header keys in order, header dict of first values, column names, rows)."""
    lines = text.splitlines()
    header = [line for line in lines if line.startswith("# ")]
    assert lines[: len(header)] == header, "header block must come first"
    keys, values = [], {}
    for line in header:
        key, _, value = line[2:].partition(": ")
        if not keys or keys[-1] != key:  # counting_limits and citation may repeat
            keys.append(key)
        values.setdefault(key, value)
    reader = csv.DictReader(io.StringIO("\n".join(lines[len(header):])))
    return keys, values, reader.fieldnames, list(reader)


def test_1_3_ac1_every_contract_path_is_answered(client):
    assert {p: list(ops) for p, ops in SPEC["paths"].items()} == {
        "/meta": ["get"], **{p: ["post"] for p in BODIES}}, "update the tests when the contract changes"
    assert client.get("/meta").status_code == 200
    for path, body in BODIES.items():
        r = client.post(path, json=body)
        assert r.status_code == 200, (path, r.status_code, r.text)


def test_1_3_ac1_meta_is_the_fixture_and_a_placeholder(client):
    body = client.get("/meta").json()
    assert body == META
    assert body["placeholder"] is True
    assert_valid(body, "Meta")


def test_1_3_ac1_calendar_is_the_fixture_and_valid(client):
    body = client.post("/calendar", json=RANGE).json()
    assert body == fixture("calendar.json")
    assert_valid(body, "Calendar")


def test_1_3_ac1_cells_is_the_fixture_and_valid(client):
    body = client.post("/cells", json=BODIES["/cells"]).json()
    assert body == fixture("cells.json")
    assert_valid(body, "Cells")


def test_1_3_ac1_old_record_version_gets_410_problem(client):
    for path, body in BODIES.items():
        r = client.post(path, json={**body, "record_version": "20261101-aaaaaaaa"})
        assert r.status_code == 410, path
        assert r.headers["content-type"].startswith(PROBLEM_JSON), path
        assert r.json() == fixture("problems/version_superseded.json")
        assert_valid(r.json(), "Problem")


def test_1_3_ac1_malformed_request_gets_400_problem_not_422(client):
    # 422 means no_land in this contract, so a malformed body must not use it.
    bad = [
        {k: v for k, v in RANGE.items() if k != "record_version"},
        {**RANGE, "aoi": {"geometry": {"type": "Point", "coordinates": [101, 0]}}},
        {**RANGE, "start": "not-a-date"},
        {**RANGE, "extra": 1},
    ]
    for body in bad:
        r = client.post("/calendar", json=body)
        assert r.status_code == 400, (body, r.status_code)
        assert r.headers["content-type"].startswith(PROBLEM_JSON)
        assert_valid(r.json(), "Problem")
        assert r.json()["status"] == 400


def test_1_3_ac1_analytics_csv_follows_the_spec(client):
    r = client.post("/analytics.csv", json=RANGE)
    assert r.headers["content-type"].startswith("text/csv")
    keys, header, columns, rows = split_csv(r.text)
    assert keys == ANALYTICS_KEYS
    assert columns == ANALYTICS_COLUMNS
    cal = fixture("calendar.json")
    assert header["record_version"] == cal["record_version"]
    assert header["aoi_id"] == cal["aoi"]["aoi_id"]
    assert [f'{row["year"]}-{row["month"]}' for row in rows] == [m["month"] for m in cal["months"]]
    for row, m in zip(rows, cal["months"]):
        # Missing is not zero: null is an empty cell.
        assert row["harmonized_count"] == ("" if m["count"] is None else str(m["count"]))
        assert row["partial_reasons"] == ";".join(m["partial_reasons"])
        expected_inputs = ";".join(
            f'{i["satellite"]}:{i["quality"]}:{i["days"]}' + ("*" if i["feeds_record"] else "") for i in m["inputs"])
        assert row["inputs"] == expected_inputs


def test_1_3_ac1_hotspots_csv_follows_the_spec(client):
    all_rows = fixture("hotspot_rows.json")["rows"]
    columns_expected = list(SPEC["components"]["schemas"]["HotspotRow"]["properties"])

    r = client.post("/hotspots.csv", json=RANGE)
    assert r.headers["content-type"].startswith("text/csv")
    keys, header, columns, rows = split_csv(r.text)
    assert keys == HOTSPOT_KEYS
    assert columns == columns_expected
    assert header["row_filter"] == "rows that feed the record"
    assert len(rows) == sum(row["feeds_record"] for row in all_rows)

    r = client.post("/hotspots.csv", json={**RANGE, "all_satellites": True})
    keys, header, _, rows = split_csv(r.text)
    assert header["row_filter"] == "all satellites"
    assert len(rows) == len(all_rows)


def test_1_3_ac3_cors_allows_each_listed_origin(client):
    for origin in (WEB_ORIGIN, LOCAL_WEB):
        r = client.get("/meta", headers={"Origin": origin})
        assert r.headers.get("access-control-allow-origin") == origin, origin
        pre = client.options("/calendar", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"})
        assert pre.status_code == 200, origin
        assert pre.headers.get("access-control-allow-origin") == origin


def test_1_3_ac3_cors_refuses_unlisted_origins(client):
    for origin in ("https://evil.example.com", "http://localhost:8000", "https://web.example.org.evil.com"):
        r = client.get("/meta", headers={"Origin": origin})
        assert "access-control-allow-origin" not in r.headers, origin


def test_1_3_ac3_cors_defaults_to_local_web_only(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    from burncal.service.app import create_app

    c = TestClient(create_app())
    assert c.get("/meta", headers={"Origin": LOCAL_WEB}).headers.get("access-control-allow-origin") == LOCAL_WEB
    assert "access-control-allow-origin" not in c.get("/meta", headers={"Origin": WEB_ORIGIN}).headers


def test_1_3_ac3_service_reads_no_secret():
    source = "\n".join(p.read_text(encoding="utf-8") for p in (ROOT / "burncal" / "service").glob("*.py") if not p.name.startswith("test_"))
    for name in ("FIRMS_MAP_KEY", "EARTHDATA_TOKEN", "dotenv", '".env"', "'.env'"):
        assert name not in source, name


def test_0_4_0_both_csv_headers_write_the_six_counting_limits_in_order(client):
    import yaml
    six = yaml.safe_load((ROOT / "contract" / "messages.yaml").read_text(encoding="utf-8"))["counting_limits"]
    assert len(six) == 6
    for path in ("/analytics.csv", "/hotspots.csv"):
        text = client.post(path, json=BODIES[path]).text
        got = [line.partition(": ")[2] for line in text.splitlines() if line.startswith("# counting_limits: ")]
        assert got == six, path


def test_7_3_season_is_the_fixture_and_valid(client):
    body = client.post("/season", json={"record_version": RANGE["record_version"], "aoi": RANGE["aoi"]}).json()
    assert body == fixture("season.json")
    assert_valid(body, "Season")


def test_7_3_criterion_3_on_sumatra_fixture():
    """Criterion 3 recomputed here from the Sumatra calendar fixture by plain code, not by core."""
    import statistics
    cal, season = fixture("calendar.json"), fixture("season.json")
    ref = cal["reference_period"]
    by = {}
    for m in cal["months"]:
        y, mo = int(m["month"][:4]), int(m["month"][5:])
        if m["complete"] and m["count"] is not None and ref["start_year"] <= y <= ref["end_year"]:
            by.setdefault(mo, []).append(m["count"])
    medians = [statistics.median(by[mo]) for mo in range(1, 13)]
    assert [x["median"] for x in season["typical"]["months"]] == [round(x, 1) for x in medians]
    assert [x["median"] for x in season["typical"]["months"]] == [c["median"] for c in cal["calendar_month_medians"]]
    assert [(x["low"], x["high"]) for x in season["typical"]["months"]] == [(min(by[mo]), max(by[mo])) for mo in range(1, 13)]
    annual = sum(medians)
    assert season["typical"]["peak_month"] == medians.index(max(medians)) + 1
    assert season["typical"]["season_months"] == [i + 1 for i, x in enumerate(medians) if x >= 0.1 * annual]
    assert season["typical"]["season_length"] == len(season["typical"]["season_months"])
    for y in season["years"]:  # each full year: same definition on that year's own twelve counts
        if None not in y["counts"]:
            assert y["peak_month"] == y["counts"].index(max(y["counts"])) + 1
            assert y["season_length"] == sum(c >= 0.1 * sum(y["counts"]) for c in y["counts"])
        else:
            assert y["peak_month"] is None


def test_7_3_season_rejects_a_stale_version(client):
    r = client.post("/season", json={"record_version": "19990101-00000000", "aoi": RANGE["aoi"]})
    assert r.status_code == 410


def test_7_5_season_to_date_is_the_fixture_and_valid_and_an_old_version_is_410(client):
    body = client.post("/season_to_date", json={"record_version": VERSION, "aoi": AOI, "year": 2026}).json()
    assert body == fixture("season_to_date.json")
    assert_valid(body, "SeasonToDate")
    assert body["start"] == 0 and body["resolution"] == "month"
    assert body["band"] == {"lower_percentile": 10, "upper_percentile": 90}
    r = client.post("/season_to_date", json={"record_version": "20261101-aaaaaaaa", "aoi": AOI, "year": 2026})
    assert r.status_code == 410
    assert client.post("/season_to_date", json={"record_version": VERSION, "aoi": AOI, "year": "x"}).status_code == 400
