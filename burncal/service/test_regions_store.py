"""Story 2.8: the six evaluated regions in one published version (runs where store/published holds it)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from burncal.service.app import create_app

ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "store" / "published"
REGIONS = json.loads((ROOT / "contract" / "regions.geojson").read_text(encoding="utf-8"))["features"]
IDS = [f["properties"]["region_id"] for f in REGIONS if f["properties"]["evidence_class"] != "not_evaluated"]


def _manifest():
    try:
        v = json.loads((STORE / "CURRENT.json").read_text())["record_version"]
        return json.loads((STORE / "versions" / v / "manifest.json").read_text())
    except (OSError, ValueError, KeyError):
        return None


MAN = _manifest()
SIX = MAN is not None and set(IDS) <= {e["name"] for e in MAN.get("extents", [])}
pytestmark = pytest.mark.skipif(not SIX, reason="the six-region version is not published locally (store/ is git-ignored)")


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app(STORE))


def _body(geom, name=None):
    return {"record_version": MAN["record_version"], "aoi": {"name": name, "geometry": geom},
            "start": "2002-07-01", "end": "2026-11-13"}


@pytest.mark.parametrize("region", IDS)
def test_2_8_ac1_each_region_calendar_loads(client, region):
    f = next(f for f in REGIONS if f["properties"]["region_id"] == region)
    r = client.post("/calendar", json=_body(f["geometry"], f["properties"]["name"]))
    assert r.status_code == 200, r.text
    months = {m["month"]: m for m in r.json()["months"]}
    in_record = [m for k, m in months.items() if "2002-07" <= k <= "2026-11"]
    assert all(m["count"] is not None for m in in_record), [k for k, m in months.items() if "2002-07" <= k <= "2026-11" and m["count"] is None]
    assert sum(m["count"] for m in in_record) > 0
    assert all(months[k]["count"] is None for k in ("2002-01", "2002-06", "2026-12"))


def test_2_8_ac1_each_region_has_its_own_whole_tile_extent():
    from burncal.pipeline import download
    assert {e["name"]: e["bbox"] for e in MAN["extents"]} == {r: list(download.region_extent(r)) for r in IDS}


def test_2_8_ac1_an_area_outside_every_extent_is_outside_coverage_never_zero(client):
    sahara = {"type": "Polygon", "coordinates": [[[5, 22], [6, 22], [6, 23], [5, 23], [5, 22]]]}
    r = client.post("/calendar", json=_body(sahara))
    assert r.status_code == 404 and r.json()["code"] == "outside_coverage"
    across = {"type": "Polygon", "coordinates": [[[108, 0], [112, 0], [112, 1], [108, 1], [108, 0]]]}  # crosses Sumatra's east edge
    r = client.post("/calendar", json=_body(across))
    assert r.status_code == 404 and r.json()["code"] == "outside_coverage"
