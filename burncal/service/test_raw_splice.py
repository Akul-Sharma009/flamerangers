"""Story 7.1: the raw splice answers from the record's own raw counts, with the record's colour scale."""
import pytest

from burncal.service.test_service import assert_valid
from burncal.service.test_store_service import _body, client, store_root, versions  # noqa: F401  (fixtures)


@pytest.fixture
def fixture_client(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from burncal.service.app import create_app
    monkeypatch.setenv("BURNCAL_STORE_ROOT", str(tmp_path))
    return TestClient(create_app())


def test_7_1_from_the_store_the_splice_is_the_calendars_raw_counts(client, versions):  # noqa: F811
    cal = client.post("/calendar", json=_body(versions[0])).json()
    r = client.post("/raw_splice", json=_body(versions[0]))
    assert r.status_code == 200, r.text
    s = r.json()
    assert_valid(s, "RawSplice")
    assert [m["month"] for m in s["months"]] == [m["month"] for m in cal["months"]]
    assert s["colour_breaks"] == cal["statistics"]["colour_breaks"]  # the scale does not change
    for sm, cm in zip(s["months"], cal["months"]):
        y = int(sm["month"][:4])
        want = cm["raw"]["aqua"] if y < 2012 else cm["raw"]["snpp"]
        assert sm["count"] == (None if want is None else float(want)), sm["month"]
        assert (sm["count"] is None) == (sm["null_reason"] is not None) == (sm["source"] is None)
        if sm["count"] is not None:
            assert sm["source"] == ("aqua_raw" if y < 2012 else "snpp_raw")
        assert sm["early_bad_scan"] == (sm["count"] is not None and y in (2012, 2013)), sm["month"]
    assert any(m["early_bad_scan"] for m in s["months"]) and any(m["source"] == "aqua_raw" for m in s["months"])


def test_7_1_outside_the_record_the_splice_is_null_not_zero(client, versions):  # noqa: F811
    s = client.post("/raw_splice", json=_body(versions[0], start="2002-01-01")).json()
    jan = next(m for m in s["months"] if m["month"] == "2002-01")
    assert jan["count"] is None and jan["null_reason"] == "outside_record" and jan["colour_class"] is None


def test_7_1_an_old_version_is_410_and_an_unloaded_area_404(client, versions):  # noqa: F811
    assert client.post("/raw_splice", json=_body(versions[2])).status_code == 410
    far = {"type": "Polygon", "coordinates": [[[150, 60], [151, 60], [151, 61], [150, 61], [150, 60]]]}
    assert client.post("/raw_splice", json=_body(versions[0], geom=far)).status_code == 404


def test_7_1_fixture_mode_answers_and_validates(fixture_client):
    from burncal.service.test_service import RANGE, fixture
    s = fixture_client.post("/raw_splice", json=RANGE).json()
    assert_valid(s, "RawSplice")
    assert s == fixture("examples/raw_splice.json")
