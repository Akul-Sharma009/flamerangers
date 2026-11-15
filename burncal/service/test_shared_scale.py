"""Story 8.7: two areas' calendars share one set of colour classes when each names the other."""
from burncal.core import stats
from burncal.service.test_store_service import AMAZON, SUMATRA, _body, client, store_root, versions  # noqa: F401


def _cal(client, version, geom, name, other=None):
    body = _body(version, geom=geom, name=name)
    if other is not None:
        body["shared_scale_with"] = {"name": other[0], "geometry": other[1]}
    r = client.post("/calendar", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_8_7_the_same_count_has_the_same_class_in_both_areas(client, versions):  # noqa: F811
    v = versions[0]
    alone_a, alone_b = _cal(client, v, SUMATRA, "A"), _cal(client, v, AMAZON, "B")
    a = _cal(client, v, SUMATRA, "A", ("B", AMAZON))
    b = _cal(client, v, AMAZON, "B", ("A", SUMATRA))
    # One scale, from both areas' months pooled; on their own the two areas' scales differ.
    assert a["statistics"]["colour_breaks"] == b["statistics"]["colour_breaks"]
    assert alone_a["statistics"]["colour_breaks"] != alone_b["statistics"]["colour_breaks"]
    breaks = a["statistics"]["colour_breaks"]
    seen = {}
    for cal in (a, b):
        for m in cal["months"]:
            if m["count"] is None:
                assert m["colour_class"] is None
                continue
            assert m["colour_class"] == stats.class_index(m["count"], breaks)
            assert seen.setdefault(m["count"], m["colour_class"]) == m["colour_class"]
    # Asking for the pair in either order gives the same scale; counts are untouched by it.
    assert [m["count"] for m in a["months"]] == [m["count"] for m in alone_a["months"]]


def test_8_7_without_a_partner_the_scale_is_the_areas_own(client, versions):  # noqa: F811
    c = _cal(client, versions[0], SUMATRA, "A")
    assert c["statistics"]["colour_breaks"] == _cal(client, versions[0], SUMATRA, "A", ("A", SUMATRA))["statistics"]["colour_breaks"]
