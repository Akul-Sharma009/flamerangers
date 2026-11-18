"""Story 2.6: publish writes a whole version and switches one pointer file."""
import json
from datetime import date

import pandas as pd
import pytest

from burncal.pipeline import aggregate, publish

COVERAGE = {"extent": [100.0, -2.0, 102.0, 0.0], "sources": {
    "MODIS_SP": [["2002-07-01", "2021-12-31"]],
    "VIIRS_SNPP_SP": [["2012-01-20", "2024-02-10"], ["2024-02-16", "2026-07-31"]],
    "VIIRS_SNPP_NRT": [["2026-08-01", "2026-11-02"]],
    "VIIRS_NOAA20_NRT": [["2026-08-01", "2026-11-13"]],
}}
PARITY_OK = lambda: {"passed": True, "misses": {},  # noqa: E731  stand-in for the AD-2 case check
                    "params_sha256": publish.params_sha256()}


def test_2_6_ac1_coverage_days_per_satellite_quality_month():
    days, missing = publish.coverage_tables(COVERAGE, data_through=date(2026, 11, 13))
    d = days.set_index(["satellite", "quality", "year", "month"])
    assert d.loc[("AQUA", "SP", 2002, 7), "days"] == 28  # Aqua starts 4 July 2002
    assert d.loc[("TERRA", "SP", 2002, 7), "days"] == 31
    assert d.loc[("SNPP", "SP", 2024, 2), "days"] == 29 - 5
    assert d.loc[("SNPP", "NRT", 2026, 11), "days"] == 2 and bool(d.loc[("SNPP", "NRT", 2026, 11), "feeds_record"])
    assert d.loc[("NOAA20", "NRT", 2026, 11), "days"] == 13 and bool(d.loc[("NOAA20", "NRT", 2026, 11), "feeds_record"])
    assert not bool(d.loc[("NOAA20", "NRT", 2026, 10), "feeds_record"])
    assert not bool(d.loc[("SNPP", "SP", 2015, 1), "feeds_record"])
    m = set(map(tuple, missing[["year", "month"]].to_numpy()))
    assert (2024, 2) in m and (2024, 3) not in m and (2026, 11) not in m and (2002, 7) not in m


def test_2_6_ac1_standard_wins_over_nrt_per_day():
    cov = {"extent": [0, 0, 1, 1], "sources": {"MODIS_SP": [["2026-08-01", "2026-08-31"]],
                                                "MODIS_NRT": [["2026-08-20", "2026-09-05"]]}}
    days, _ = publish.coverage_tables(cov, data_through=date(2026, 9, 5))
    d = days[days.satellite == "AQUA"].set_index(["quality", "year", "month"])["days"]
    assert d[("SP", 2026, 8)] == 31 and ("NRT", 2026, 8) not in d.index and d[("NRT", 2026, 9)] == 5


def _inputs(tmp_path):
    rec, grids, raw = tmp_path / "record", tmp_path / "grids", tmp_path / "raw"
    for d in (rec, grids, raw):
        d.mkdir()
    rows = pd.DataFrame({"latitude": [-1.0, -1.5], "longitude": [101.0, 101.5], "satellite": ["AQUA", "AQUA"],
                         "acq_datetime_utc": pd.to_datetime(["2015-01-01 06:00", "2015-01-02 06:00"], utc=True),
                         "excluded_reason": ["none", "static"], "feeds_record": [True, True], "weight": [1.0, 0.0]})
    rows.to_parquet(rec / "AQUA_2015.parquet")
    pd.DataFrame({"sw_lon": [101.0], "sw_lat": [-2.0], "evidence_class": ["tuned"]}).to_parquet(rec / "evidence_1deg.parquet")
    _grids(rows, pd.DataFrame({"sw_lon": [101.0], "sw_lat": [-2.0]}), grids)
    (raw / "MODIS_SP_2015.csv").write_text("latitude\n")
    (raw / "coverage.json").write_text(json.dumps(COVERAGE))
    return rec, grids, raw


def _grids(rows, cells, grids_dir):
    """Small but real grids, so a published version loads as the service loads it."""
    g1, g025 = aggregate.cell_months(rows, 1.0), aggregate.cell_months(rows, 0.25)
    thr = aggregate.thresholds_1deg(g1, cells)
    for name, t in (("cells_1deg", g1), ("cells_025deg", g025), ("thresholds_1deg", thr),
                    ("flags_1deg", aggregate.flags_1deg(g1, thr, cells, data_through=date(2026, 11, 13)))):
        t.to_parquet(grids_dir / f"{name}.parquet")


def test_2_6_ac1_publish_writes_a_version_and_switches_the_pointer(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    root = tmp_path / "store"
    v1 = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="abc", parity_check=PARITY_OK)
    assert v1.startswith("20261113-") and len(v1) == 17
    vdir = root / "versions" / v1
    man = json.loads((vdir / "manifest.json").read_text())
    assert man["record_version"] == v1 and man["data_through"] == "2026-11-13"
    assert man["extents"] == [{"name": "raw", "bbox": COVERAGE["extent"]}]
    assert {"coverage_days.parquet", "missing_days.parquet", "points.parquet", "grids", "records"} <= {p.name for p in vdir.iterdir()}
    pts = pd.read_parquet(vdir / "points.parquet")
    assert len(pts) == 1  # only rows that are in a count
    assert {"key", "k", "day"} <= set(pts.columns) and pts["key"].is_monotonic_increasing
    assert (vdir / "records" / "raw" / "AQUA_2015.parquet").exists() and (vdir / "records" / "evidence_1deg.parquet").exists()
    assert json.loads((root / "CURRENT.json").read_text()) == {"record_version": v1, "previous": None}
    # a new code revision is a new version; the previous one stays on disk and is named in the pointer
    v2 = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="def", parity_check=PARITY_OK)
    assert v2 != v1 and (root / "versions" / v1).exists()
    assert json.loads((root / "CURRENT.json").read_text()) == {"record_version": v2, "previous": v1}
    # the same inputs give the same version
    assert publish.record_version(raw, date(2026, 11, 13), "def") == v2



def test_2_8_one_version_holds_several_extents(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    other = tmp_path / "other"
    for d in ("record", "grids", "southern"):
        (other / d).mkdir(parents=True)
    rows = pd.read_parquet(rec / "AQUA_2015.parquet").assign(longitude=[25.0, 25.5], latitude=[-10.0, -10.5])
    rows.to_parquet(other / "record" / "AQUA_2015.parquet")
    pd.DataFrame({"sw_lon": [25.0], "sw_lat": [-11.0], "evidence_class": ["tested_unseen"]}).to_parquet(other / "record" / "evidence_1deg.parquet")
    _grids(rows, pd.DataFrame({"sw_lon": [25.0], "sw_lat": [-11.0]}), other / "grids")
    (other / "southern" / "MODIS_SP_2015.csv").write_text("latitude\n")
    cov = {"extent": [20.0, -20.0, 35.0, -5.0], "sources": {"MODIS_SP": [["2002-07-01", "2015-12-31"]]}}
    (other / "southern" / "coverage.json").write_text(json.dumps(cov))
    root = tmp_path / "store"
    v = publish.publish_many([(rec, grids, raw), (other / "record", other / "grids", other / "southern")], root,
                             data_through=date(2026, 11, 13), code_revision="x", parity_check=PARITY_OK)
    vdir = root / "versions" / v
    man = json.loads((vdir / "manifest.json").read_text())
    assert [e["name"] for e in man["extents"]] == ["raw", "southern"]
    assert (vdir / "records" / "southern" / "AQUA_2015.parquet").exists()
    assert len(pd.read_parquet(vdir / "points.parquet")) == 2
    assert len(pd.read_parquet(vdir / "records" / "evidence_1deg.parquet")) == 2
    days = pd.read_parquet(vdir / "coverage_days.parquet")
    assert set(days["extent"]) == {"raw", "southern"}
    with pytest.raises(ValueError, match="both named"):
        publish.publish_many([(rec, grids, raw), (rec, grids, raw)], tmp_path / "s2", data_through=date(2026, 11, 13), code_revision="y", parity_check=PARITY_OK)


def test_2_6_ad2_publish_refuses_converted_counts_without_parity(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    failing = lambda: {"passed": False, "reason": "parity case not available", "misses": {}}  # noqa: E731
    with pytest.raises(RuntimeError, match="AD-2"):
        publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2026, 11, 13), code_revision="a",
                        parity_check=failing)
    assert not (tmp_path / "store" / "CURRENT.json").exists()
    # a record that ends before 2022 holds no converted count: no gate
    v = publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2021, 12, 31), code_revision="a",
                        parity_check=failing)
    man = json.loads((tmp_path / "store" / "versions" / v / "manifest.json").read_text())
    assert man["parity"] == {"required": False}


def test_2_6_ad2_publish_records_the_parity_result(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    h = publish.params_sha256()
    ok = lambda: {"passed": True, "misses": {"C1 1deg": 1.5e-10}, "params_sha256": h}  # noqa: E731
    v = publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2026, 11, 13), code_revision="a",
                        parity_check=ok)
    man = json.loads((tmp_path / "store" / "versions" / v / "manifest.json").read_text())
    assert man["parity"] == {"required": True, "passed": True, "misses": {"C1 1deg": 1.5e-10},
                             "params_sha256": h, "code_revision": "a"}


@pytest.mark.skipif(not __import__("os").environ.get("BURNCAL_PARITY_CASE_DIR"), reason="BURNCAL_PARITY_CASE_DIR not set")
def test_2_6_ad2_the_real_parity_case_passes():
    from burncal.pipeline import parity
    got = parity.check_case()
    assert got["passed"] and len(got["misses"]) == 6, got
    assert got["params_sha256"] == publish.params_sha256()



def test_2_6_null_is_not_zero_a_month_with_no_feeding_day_is_uncovered():
    cov = {"extent": [0, 0, 5, 5], "sources": {"MODIS_SP": [["2002-07-01", "2021-12-31"]],
                                                "VIIRS_SNPP_SP": [["2022-01-01", "2023-04-30"], ["2023-06-01", "2026-07-31"]]}}
    _, missing = publish.coverage_tables(cov, data_through=date(2026, 7, 31))
    m = missing.set_index(["year", "month"])["uncovered"]
    assert bool(m[(2023, 5)]) is True
    assert (2023, 4) not in m.index and (2023, 6) not in m.index


# --- Codex review (14 Nov): the parity pass names what it checked; publish loads before it switches ---
def test_2_6_ad2_the_parity_pass_is_tied_to_the_params_hash_and_code_revision(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    root = tmp_path / "store"
    v = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="abc123",
                        parity_check=PARITY_OK)
    man = json.loads((root / "versions" / v / "manifest.json").read_text())
    assert man["parity"]["params_sha256"] == man["params_sha256"] == publish.params_sha256()
    assert man["parity"]["code_revision"] == man["code_revision"] == "abc123"


def test_2_6_ad2_publish_refuses_a_pass_for_other_params(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    other = lambda: {"passed": True, "misses": {}, "params_sha256": "0" * 64}  # noqa: E731
    with pytest.raises(RuntimeError, match="AD-2"):
        publish.publish(rec, grids, raw, tmp_path / "store", data_through=date(2026, 11, 13), code_revision="x",
                        parity_check=other)
    assert not (tmp_path / "store" / "CURRENT.json").exists()


def test_2_6_ad2_publish_refuses_uncommitted_code():
    dirty = lambda *a, **k: type("R", (), {"stdout": " M burncal/core/c1.py\n", "returncode": 0})()  # noqa: E731
    with pytest.raises(RuntimeError, match="uncommitted"):
        publish.clean_code_revision(run=dirty)
    clean = lambda args, **k: type("R", (), {"stdout": "" if "status" in args else "abc123def456\n", "returncode": 0})()  # noqa: E731
    assert publish.clean_code_revision(run=clean) == "abc123def456"


def test_2_6_ad11_publish_loads_the_new_version_before_switching_the_pointer(tmp_path, monkeypatch):
    rec, grids, raw = _inputs(tmp_path)
    root = tmp_path / "store"
    v1 = publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="a", parity_check=PARITY_OK)
    from burncal.service import store

    def broken(self, path, fetch=None):
        raise ValueError("cannot load")
    monkeypatch.setattr(store.Version, "__init__", broken)
    with pytest.raises(RuntimeError, match="does not load"):
        publish.publish(rec, grids, raw, root, data_through=date(2026, 11, 13), code_revision="b", parity_check=PARITY_OK)
    assert json.loads((root / "CURRENT.json").read_text())["record_version"] == v1
    assert sorted(d.name for d in (root / "versions").iterdir() if not d.name.startswith(".")) == [v1]


def test_2_10_ac2_publish_puts_the_noaa20_headline_in_the_version(tmp_path):
    rec, grids, raw = _inputs(tmp_path)
    head = {"reported_only": True, "validated_against_aqua": False, "period_start": "2022-01", "period_end": "2026-10",
            "pooled": {"mean_abs_difference": 1.0, "bias_pct": 2.0, "cell_months": 3}, "regions": []}
    src = tmp_path / "noaa20_headline.json"
    src.write_text(json.dumps(head))
    root = tmp_path / "store"
    v = publish.publish_many([(rec, grids, raw)], root, data_through=date(2026, 11, 13), code_revision="a",
                             parity_check=PARITY_OK, noaa20_check=src)
    assert json.loads((root / "versions" / v / "noaa20_check.json").read_text()) == head
    man = json.loads((root / "versions" / v / "manifest.json").read_text())
    assert man["noaa20_check_sha256"]


def _extent(base, name, extent, rows):
    """One extent's build inputs: record rows, evidence cells (half-open, as convert writes them), grids."""
    rec, grids, raw = base / name / "record", base / name / "grids", base / name / name
    for d in (rec, grids, raw):
        d.mkdir(parents=True)
    rows.to_parquet(rec / "AQUA_2015.parquet")
    x0, y0, x1, y1 = (int(v) for v in extent)
    cells = pd.DataFrame([(float(x), float(y)) for x in range(x0, x1) for y in range(y0, y1)], columns=["sw_lon", "sw_lat"])
    cells.assign(evidence_class="not_evaluated").to_parquet(rec / "evidence_1deg.parquet")
    _grids(rows, cells, grids)
    (raw / "MODIS_SP_2015.csv").write_text("latitude\n")
    (raw / "coverage.json").write_text(json.dumps({"extent": extent, "sources": {"MODIS_SP": [["2002-07-01", "2015-12-31"]]}}))
    return rec, grids, raw


def _aqua(points):
    n = len(points)
    when = pd.to_datetime([f"2015-09-{i + 1:02d} 06:00" for i in range(n)], utc=True)
    return pd.DataFrame({"longitude": [p[0] for p in points], "latitude": [p[1] for p in points], "satellite": ["AQUA"] * n,
                         "acq_datetime_utc": when, "utc_date": when.date,
                         "excluded_reason": ["none"] * n, "feeds_record": [True] * n, "weight": [1.0] * n})


def test_2_9_a_hotspot_on_an_edge_two_extents_share_is_counted_once(tmp_path):
    # Sumatra's box ends at 110 E and Kalimantan's starts there; both downloads hold a hotspot on 110.0.
    # It was counted twice in the joined points and 0.25-degree grid, so the calendar of an area whose
    # edge is on 110 read one more than its hotspot rows (the daily refresh's check, 15-18 Nov).
    edge = (110.0, -1.0)
    west = _extent(tmp_path, "west", [100.0, -2.0, 110.0, 0.0], _aqua([(105.0, -1.0), edge]))
    east = _extent(tmp_path, "east", [110.0, -2.0, 120.0, 0.0], _aqua([edge, (115.0, -1.0), (120.0, -1.0)]))
    root = tmp_path / "store"
    v = publish.publish_many([west, east], root, data_through=date(2026, 11, 13), code_revision="x", parity_check=PARITY_OK)
    vdir = root / "versions" / v
    pts = pd.read_parquet(vdir / "points.parquet")
    assert sorted(pts["longitude"]) == [105.0, 110.0, 115.0, 120.0]  # the edge hotspot once; the outer edge kept
    for g in ("cells_025deg", "cells_1deg"):
        t = pd.read_parquet(vdir / "grids" / f"{g}.parquet")
        assert t["count"].sum() == 4 and not t.duplicated(["sw_lon", "sw_lat", "year", "month"]).any(), g
    ev = pd.read_parquet(vdir / "records" / "evidence_1deg.parquet")
    assert not ev.duplicated(["sw_lon", "sw_lat"]).any() and len(ev) == 2 * 10 * 2
    # each extent's own record files stay whole: the hotspot list of either extent still has its edge row
    assert len(pd.read_parquet(vdir / "records" / "west" / "AQUA_2015.parquet")) == 2


def test_2_9_owned_by_gives_every_place_one_extent():
    # interior, shared edges, a corner three boxes touch, and outer edges
    import duckdb
    boxes = [[0.0, 0.0, 10.0, 10.0], [10.0, 0.0, 20.0, 10.0], [0.0, 10.0, 10.0, 20.0]]
    places = pd.DataFrame({"x": [5.0, 10.0, 10.0, 0.0, 20.0, 10.0, 5.0], "y": [5.0, 5.0, 10.0, 0.0, 10.0, 20.0, 10.0]})
    con = duckdb.connect()
    con.register("p", places)
    cols = ", ".join(f"({publish.owned_by(i, boxes, 'x', 'y')})::INT AS o{i}" for i in range(len(boxes)))
    owners = con.execute(f"SELECT {cols} FROM p").df().sum(axis=1)
    assert owners.tolist() == [1] * len(places)
