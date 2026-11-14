"""Story 1.3 service stub tests.

AC1: with no store, every contract endpoint answers from the fixture, and the
     answers validate against the contract.
AC3: CORS allows only the web origin and localhost; the service holds no secret.
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

CAL = {"aoi": "101,-1,103,1", "start": "2002-06", "end": "2026-11"}
DAYS = {"aoi": "101,-1,103,1", "start": "2014-01-01", "end": "2026-11-13"}
# Minimal valid query for every contract path.
QUERIES = {
    "/meta": {},
    "/calendar": CAL,
    "/cells": {"aoi": CAL["aoi"], "month": "2026-11"},
    "/hotspots.csv": DAYS,
    "/analytics.csv": CAL,
}


def fixture(name):
    return json.loads((CONTRACT / "fixture" / name).read_text(encoding="utf-8"))


def assert_valid(body, schema_name):
    v = Draft202012Validator({"$ref": f"urn:contract#/components/schemas/{schema_name}"}, registry=REGISTRY)
    errors = [e.message for e in v.iter_errors(body)]
    assert not errors, errors


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", f"{WEB_ORIGIN}, {LOCAL_WEB}")
    from burncal.service.app import create_app

    return TestClient(create_app())


def read_csv(text):
    return list(csv.DictReader(io.StringIO(text)))


def test_1_3_ac1_every_contract_path_is_answered(client):
    assert set(QUERIES) == set(SPEC["paths"]), "update QUERIES when the contract adds a path"
    for path, query in QUERIES.items():
        r = client.get(path, params=query)
        assert r.status_code == 200, (path, r.status_code, r.text)


def test_1_3_ac1_meta_is_the_fixture_and_a_placeholder(client):
    body = client.get("/meta").json()
    assert body == fixture("meta.json")
    assert body["placeholder"] is True
    assert_valid(body, "Meta")


def test_1_3_ac1_calendar_is_the_fixture_and_valid(client):
    body = client.get("/calendar", params=CAL).json()
    assert body == fixture("calendar.json")
    assert_valid(body, "Calendar")


def test_1_3_ac1_cells_is_the_fixture_and_valid(client):
    body = client.get("/cells", params=QUERIES["/cells"]).json()
    assert body == fixture("cells.json")
    assert_valid(body, "Cells")


def test_1_3_ac1_current_record_version_is_accepted(client):
    current = fixture("meta.json")["record_version"]
    r = client.get("/calendar", params={**CAL, "record_version": current})
    assert r.status_code == 200


def test_1_3_ac1_old_record_version_gets_410_superseded(client):
    for path in ("/calendar", "/cells"):
        r = client.get(path, params={**QUERIES[path], "record_version": "20261101-aaaaaaaa"})
        assert r.status_code == 410, path
        assert r.json() == fixture("superseded.json")
        assert_valid(r.json(), "VersionSuperseded")


def test_1_3_ac1_missing_required_parameter_is_rejected(client):
    assert client.get("/calendar", params={"aoi": CAL["aoi"]}).status_code == 422


def test_1_3_ac1_hotspots_csv_has_one_line_per_fixture_row(client):
    r = client.get("/hotspots.csv", params=DAYS)
    assert r.headers["content-type"].startswith("text/csv")
    rows = read_csv(r.text)
    expected = fixture("hotspot_rows.json")["rows"]
    assert len(rows) == len(expected)
    assert list(rows[0]) == list(expected[0])
    assert rows[1]["satellite"] == "NOAA-20"
    assert rows[2]["type"] == "2"


def test_1_3_ac1_analytics_csv_has_one_line_per_calendar_month(client):
    r = client.get("/analytics.csv", params=CAL)
    assert r.headers["content-type"].startswith("text/csv")
    rows = read_csv(r.text)
    months = fixture("calendar.json")["months"]
    assert [row["month"] for row in rows] == [m["month"] for m in months]
    # Missing is not zero: a null count is an empty cell, never "0".
    first = rows[0]
    assert months[0]["count"] is None and first["count"] == ""


def test_1_3_ac3_cors_allows_each_listed_origin(client):
    for origin in (WEB_ORIGIN, LOCAL_WEB):
        r = client.get("/meta", headers={"Origin": origin})
        assert r.headers.get("access-control-allow-origin") == origin, origin


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
