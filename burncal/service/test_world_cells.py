"""Story 8.9: every loaded 1-degree cell for one month, from the same flags as /cells."""
import json
import time

import shapely

from fastapi.testclient import TestClient

from burncal.service.app import create_app
from burncal.service.store import Store
from burncal.service.test_service import assert_valid as valid
from burncal.service.test_store_service import PUNJAB, SUMATRA, client, store_root, versions  # noqa: F401  (fixtures)

KEYS = ("flag_state", "count", "threshold", "evidence_class", "provisional", "reference_year")


def _world(client, version, month):
    r = client.post("/world_cells", json={"record_version": version, "month": month})
    assert r.status_code == 200, r.text
    return r.json()


def test_8_9_ac1_each_covered_cell_has_state_count_threshold_evidence_and_provenance(client, versions, store_root):
    w = _world(client, versions[0], "2015-09")
    valid(w, "WorldCells")
    v = Store(store_root).latest()
    inside = [c for c in v.evidence.itertuples() if v.covers(shapely.box(c.sw_lon, c.sw_lat, c.sw_lon + 1, c.sw_lat + 1))]
    assert len(w["cells"]) == len(inside)  # every cell of the loaded extents, none added
    assert w["source"] == "aqua_real" and all(c["source"] == "aqua_real" for c in w["cells"])
    assert _world(client, versions[0], "2023-09")["source"] == "viirs_converted"


def test_8_9_ac1_a_cell_reads_the_same_as_in_cells(client, versions):
    """One implementation per number: the world answer and the area answer agree cell by cell."""
    for month in ("2015-09", "2008-03", "2023-10", "2026-11"):
        by = {(c["sw_lon"], c["sw_lat"]): c for c in _world(client, versions[0], month)["cells"]}
        for geom in (PUNJAB, SUMATRA):
            area = client.post("/cells", json={"record_version": versions[0], "aoi": {"name": None, "geometry": geom},
                                               "month": month}).json()["cells"]
            shared = [c for c in area if (c["sw_lon"], c["sw_lat"]) in by]
            assert len(shared) >= len(area) * 0.7  # the rest lie past the loaded extent's edge
            for c in shared:
                w = by[(c["sw_lon"], c["sw_lat"])]
                assert all(w[k] == c[k] for k in KEYS), (month, c, w)


def test_8_9_ac1_cells_outside_coverage_are_absent_not_zero(client, versions):
    w = _world(client, versions[0], "2015-09")
    assert (140, 50) not in {(c["sw_lon"], c["sw_lat"]) for c in w["cells"]}
    # 2023-05 has no feeding day loaded: its cells are absent, not zero and not "none"
    assert _world(client, versions[0], "2023-05")["cells"] == []
    assert _world(client, versions[0], "2023-04")["cells"]


def test_8_9_ac2_says_what_is_covered(client, versions):
    w = _world(client, versions[0], "2015-09")
    meta = client.get("/meta").json()
    assert w["coverage"] == meta["coverage"] and w["coverage"]["global"] is False
    assert {r["region_id"] for r in w["coverage"]["regions"] if r["status"] == "loaded"} >= {"sumatra", "punjab"}


def test_8_9_outside_the_record_is_null_not_zero(client, versions):
    w = _world(client, versions[0], "2002-03")
    assert w["source"] is None and w["cells"]
    assert all(c["count"] is None and c["flag_state"] == "outside_record" for c in w["cells"])


def test_8_9_superseded_version_and_bad_month(client, versions):
    old = versions[2]
    r = client.post("/world_cells", json={"record_version": old, "month": "2015-09"})
    assert r.status_code == 410 and r.json()["code"] == "version_superseded"
    assert client.post("/world_cells", json={"record_version": versions[0], "month": "2015-13"}).status_code == 400


def test_8_9_fixture_mode_serves_the_fixture(monkeypatch, tmp_path):
    monkeypatch.setenv("BURNCAL_STORE_ROOT", str(tmp_path))
    c = TestClient(create_app())
    meta = c.get("/meta").json()
    r = c.post("/world_cells", json={"record_version": meta["record_version"], "month": "2015-09"})
    assert r.status_code == 200
    valid(r.json(), "WorldCells")
    assert c.post("/world_cells", json={"record_version": "20200101-00000000", "month": "2015-09"}).status_code == 410


def test_8_9_ac3_size_per_cell_and_time(client, versions):
    """The measured bytes per cell, for the world extrapolation in the story report (gzip is the host's)."""
    t = time.perf_counter()
    w = _world(client, versions[0], "2015-09")
    took = time.perf_counter() - t
    per_cell = len(json.dumps(w["cells"], separators=(",", ":"))) / len(w["cells"])
    assert per_cell < 200 and took < 2.0
