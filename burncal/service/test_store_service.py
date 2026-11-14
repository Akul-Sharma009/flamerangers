"""Story 2.6: the service answering from a published store version."""
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import shapely
from fastapi.testclient import TestClient
from shapely.geometry import shape

from burncal.pipeline import aggregate, publish
from burncal.service.app import create_app
from burncal.service.store import Store
from burncal.service.test_service import assert_valid as valid

ROOT = Path(__file__).resolve().parents[2]
REGIONS = {f["properties"]["region_id"]: f["geometry"]
           for f in json.loads((ROOT / "contract" / "regions.geojson").read_text())["features"]}
SUMATRA = REGIONS["sumatra"]
AMAZON = {"type": "Polygon", "coordinates": [[[-59.3, -11.2], [-55.1, -11.9], [-52.6, -8.4], [-54.9, -5.6], [-58.8, -6.7], [-59.3, -11.2]]]}
PUNJAB = REGIONS["punjab"]
AREAS = {"sumatra": SUMATRA, "amazon": AMAZON, "punjab": PUNJAB}
DT = date(2026, 11, 13)
EXTENT = [-62.0, -13.0, 108.0, 33.0]


def _synthetic_record(rng):
    frames = []
    for geom in AREAS.values():
        x0, y0, x1, y1 = shape(geom).bounds
        n = 6000
        t = pd.to_datetime(rng.integers(pd.Timestamp("2002-07-04").value // 10**9, pd.Timestamp("2026-11-14").value // 10**9, n), unit="s", utc=True)
        sat = rng.choice(["AQUA", "TERRA", "SNPP", "NOAA20", "NOAA21"], n)
        lon = rng.uniform(x0 - 0.6, x1 + 0.6, n)
        lat = rng.uniform(y0 - 0.6, y1 + 0.6, n)
        lon[:40], lat[:40] = np.round(lon[:40] * 4) / 4, np.round(lat[:40] * 4) / 4  # points on cell edges
        frames.append(pd.DataFrame({"longitude": lon, "latitude": lat, "acq_datetime_utc": t, "satellite": sat}))
    df = pd.concat(frames, ignore_index=True)
    df["utc_date"] = df["acq_datetime_utc"].dt.date
    df["excluded_reason"] = rng.choice(["none", "none", "none", "static", "offshore"], len(df))
    from burncal.core import record
    df["feeds_record"] = record.feeds_record(df["satellite"], df["utc_date"])
    df["weight"] = record.weights(df["satellite"], df["utc_date"], df["excluded_reason"], rng.uniform(0, 2, len(df)))
    return df


def _cells_around(geoms):
    out = set()
    for g in geoms:
        x0, y0, x1, y1 = (int(np.floor(b)) for b in shape(g).bounds)
        out |= {(x, y) for x in range(x0 - 1, x1 + 2) for y in range(y0 - 1, y1 + 2)}
    return pd.DataFrame(sorted(out), columns=["sw_lon", "sw_lat"]).astype(float)


@pytest.fixture(scope="module")
def store_root(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("pub")
    rec, grids_dir, raw = tmp / "record", tmp / "grids", tmp / "raw"
    for d in (rec, grids_dir, raw):
        d.mkdir()
    df = _synthetic_record(np.random.default_rng(7))
    df.to_parquet(rec / "ALL_2000.parquet")
    cells = _cells_around(AREAS.values())
    cells.assign(evidence_class="not_evaluated").to_parquet(rec / "evidence_1deg.parquet")
    g1, g025 = aggregate.cell_months(df, 1.0), aggregate.cell_months(df, 0.25)
    thr = aggregate.thresholds_1deg(g1, cells)
    for name, t in (("cells_1deg", g1), ("cells_025deg", g025), ("thresholds_1deg", thr),
                    ("flags_1deg", aggregate.flags_1deg(g1, thr, cells, data_through=DT))):
        t.to_parquet(grids_dir / f"{name}.parquet")
    (raw / "coverage.json").write_text(json.dumps({"extent": EXTENT, "sources": {
        "MODIS_SP": [["2002-07-01", "2026-08-31"]], "MODIS_NRT": [["2026-09-01", "2026-11-13"]],
        "VIIRS_SNPP_SP": [["2012-01-20", "2024-02-10"], ["2024-02-16", "2026-07-31"]],
        "VIIRS_SNPP_NRT": [["2026-08-01", "2026-11-02"]], "VIIRS_NOAA20_NRT": [["2026-08-01", "2026-11-13"]]}}))
    root = tmp / "store"
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="old")
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="previous")
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="current")
    return root


@pytest.fixture(scope="module")
def client(store_root):
    return TestClient(create_app(store_root))


@pytest.fixture(scope="module")
def versions(store_root):
    p = json.loads((store_root / "CURRENT.json").read_text())
    old = sorted({d.name for d in (store_root / "versions").iterdir()} - {p["record_version"], p["previous"]})[0]
    return p["record_version"], p["previous"], old


@pytest.mark.parametrize("area", ["sumatra", "amazon", "punjab"])
def test_2_6_ac4_fast_path_equals_brute_force_point_sum(store_root, area):
    v = Store(store_root).latest()
    geom = shape(AREAS[area])
    fast, brute = v.count(geom), v.count_points(geom)
    assert brute[:, 0].sum() > 100
    assert np.allclose(fast, brute, rtol=0, atol=1e-9)
    assert np.array_equal(np.round(fast, 1), np.round(brute, 1))


def _body(version, geom=SUMATRA, start="2002-07-01", end="2026-11-13", name="Sumatra"):
    return {"record_version": version, "aoi": {"name": name, "geometry": geom}, "start": start, "end": end}


def test_2_6_ac2_meta_from_data_through(client, versions):
    m = client.get("/meta").json()
    valid(m, "Meta")
    assert m["placeholder"] is False and m["record_version"] == versions[0]
    assert (m["data_through"], m["current_month"], m["data_through_day"]) == ("2026-11-13", "2026-11", 13)
    assert m["reference_period"] == {"start_year": 2003, "end_year": 2025}


def test_2_6_ac3_calendar_counts_raw_and_provenance(client, versions):
    r = client.post("/calendar", json=_body(versions[0]))
    assert r.status_code == 200, r.text
    c = r.json()
    valid(c, "Calendar")
    assert c["record_version"] == versions[0] and c["data_through"] == "2026-11-13"
    months = {m["month"]: m for m in c["months"]}
    assert len(c["months"]) == 25 * 12
    assert months["2002-06"]["count"] is None and months["2002-06"]["null_reason"] == "outside_record"
    assert months["2002-07"]["partial_reasons"] == ["record_start"] and not months["2002-07"]["complete"]
    assert months["2026-12"]["count"] is None
    assert months["2015-01"]["source"] == "aqua_real" and months["2023-01"]["source"] == "viirs_converted"
    assert months["2024-02"]["partial_reasons"] == ["missing_days"]
    nov = months["2026-11"]
    assert nov["validated_satellite"] is False and nov["partial_reasons"] == ["data_through"]
    assert {(i["satellite"], i["quality"], i["days"], i["feeds_record"]) for i in nov["inputs"]} >= {
        ("SNPP", "NRT", 2, True), ("NOAA20", "NRT", 13, True), ("AQUA", "NRT", 13, False)}
    assert months["2015-01"]["raw"]["noaa21"] is None and isinstance(months["2015-01"]["raw"]["aqua"], int)
    assert months["2015-01"]["cells_total"] == months["2023-01"]["cells_total"] > 0


def test_2_6_ac3_calendar_count_equals_the_point_sum(client, versions, store_root):
    c = client.post("/calendar", json=_body(versions[0], AMAZON, name=None)).json()
    v = Store(store_root).latest()
    brute = v.count_points(shape(AMAZON))
    for m in c["months"]:
        y, mo = map(int, m["month"].split("-"))
        k = (y - 2002) * 12 + mo - 1
        if m["count"] is not None:
            assert m["count"] == round(brute[k, 0], 1)


def test_2_6_ac1_previous_version_answered_older_superseded(client, versions):
    cur, prev, old = versions
    assert client.post("/calendar", json=_body(prev)).status_code == 200
    r = client.post("/calendar", json=_body(old))
    assert r.status_code == 410 and r.headers["content-type"].startswith("application/problem+json")
    p = r.json()
    valid(p, "Problem")
    assert p["code"] == "version_superseded" and p["current_record_version"] == cur


def test_2_6_ac5_scale_cautions(client, versions):
    small = shapely.geometry.mapping(shapely.box(101.0, -1.0, 101.5, -0.5))
    tiny = shapely.geometry.mapping(shapely.box(101.0, -1.0, 101.1, -0.9))
    big = client.post("/calendar", json=_body(versions[0])).json()
    assert big["cautions"] == []
    assert [x["code"] for x in client.post("/calendar", json=_body(versions[0], small)).json()["cautions"]] == ["scale_below_1deg"]
    assert [x["code"] for x in client.post("/calendar", json=_body(versions[0], tiny)).json()["cautions"]] == [
        "scale_below_1deg", "scale_below_025deg"]


def test_2_6_outside_coverage_is_404(client, versions):
    far = shapely.geometry.mapping(shapely.box(140.0, 50.0, 141.0, 51.0))
    r = client.post("/calendar", json=_body(versions[0], far))
    assert r.status_code == 404 and r.json()["code"] == "outside_coverage"
    valid(r.json(), "Problem")


def test_2_6_cells_answer_from_the_store(client, versions):
    r = client.post("/cells", json={"record_version": versions[0], "aoi": {"name": None, "geometry": PUNJAB}, "month": "2015-09"})
    assert r.status_code == 200, r.text
    c = r.json()
    valid(c, "Cells")
    assert len(c["cells"]) == 4 * 4 and any(x["partly_inside"] for x in c["cells"])


# --- Story 3.1: statistics served ---------------------------------------------------
def test_3_1_ac2_cut_and_partial_months_whole_counts_never_ranked(client, versions):
    full = {m["month"]: m for m in client.post("/calendar", json=_body(versions[0])).json()["months"]}
    cut = client.post("/calendar", json=_body(versions[0], start="2010-03-15", end="2012-06-10")).json()
    cm = {m["month"]: m for m in cut["months"]}
    valid(cut, "Calendar")
    assert cm["2010-03"]["count"] == full["2010-03"]["count"] and "range_cut" in cm["2010-03"]["partial_reasons"]
    assert cm["2010-03"]["complete"] is True  # range_cut labels the month; it stays complete
    for k in ("2002-07", "2024-02", "2026-11"):
        assert full[k]["complete"] is False and full[k]["rank"] is None
    c = client.post("/calendar", json=_body(versions[0])).json()
    ranked = {t["month"] for t in c["statistics"]["top_months"]}
    assert not ranked & {"2002-07", "2024-02", "2026-11"}
    assert c["statistics"]["record_high"]["month"] not in {"2002-07", "2024-02", "2026-11"}
    years = {y["year"]: y for y in c["year_totals"]}
    assert years[2002]["rank"] is None and years[2024]["rank"] is None and years[2026]["rank"] is None
    assert cut["year_totals"][0]["rank"] is None  # 2010 is cut by the range: not ranked
    assert all(m["rank"] is None for m in cm.values() if m["month"] < "2010-03")


def test_3_1_ac3_zero_median_has_no_ratio(client, versions):
    c = client.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).json()
    for m in c["months"]:
        if m["median"] == 0:
            assert m["no_typical_activity"] is True and m["ratio_to_median"] is None
        elif m["median"] is not None:
            assert m["no_typical_activity"] is False


def test_3_1_ac4_numbers_rounded_once_from_unrounded_values(client, versions, store_root):
    c = client.post("/calendar", json=_body(versions[0], AMAZON, name=None)).json()
    assert c["reference_period"] == {"start_year": 2003, "end_year": 2025}
    v = Store(store_root).latest()
    sums = v.count_points(shape(AMAZON))[:, 0]
    months = {m["month"]: m for m in c["months"]}
    sep = [sums[(y - 2002) * 12 + 8] for y in range(2003, 2026)
           if months[f"{y}-09"]["complete"]]
    mean = float(np.mean(sep))
    m = months["2015-09"]
    assert m["reference_mean"] == round(mean, 1)
    assert m["anomaly_count"] == round(sums[(2015 - 2002) * 12 + 8] - mean, 1)
    assert m["anomaly_pct"] == round(100 * (sums[(2015 - 2002) * 12 + 8] - mean) / mean, 2)


# --- Story 3.2: flags per area and the current-month card ---------------------------
def test_3_2_ac1_area_flags_are_counts_of_whole_cells(client, versions):
    body = _body(versions[0], PUNJAB, name=None)
    cal = {m["month"]: m for m in client.post("/calendar", json=body).json()["months"]}
    for month in ("2015-09", "2008-03", "2023-10"):
        cells = client.post("/cells", json={"record_version": versions[0], "aoi": body["aoi"], "month": month}).json()["cells"]
        m = cal[month]
        assert m["cells_total"] == len(cells) == 16
        assert m["cells_flagged_strong"] == sum(c["flag_state"] == "strong" for c in cells)
        assert m["cells_flagged_marginal"] == sum(c["flag_state"] == "marginal" for c in cells)
    assert "flag_state" not in cal["2015-09"]  # no flag on the area total


def test_3_2_ac2_cells_have_state_count_threshold_partly_inside_and_evidence(client, versions):
    r = client.post("/cells", json={"record_version": versions[0], "aoi": {"name": None, "geometry": SUMATRA}, "month": "2015-09"})
    c = r.json()
    valid(c, "Cells")
    assert {"flag_state", "count", "threshold", "partly_inside", "evidence_class"} <= set(c["cells"][0])
    assert any(x["partly_inside"] for x in c["cells"]) and all(x["evidence_class"] for x in c["cells"])


def test_3_2_ac3_current_month_card(client, versions, store_root):
    c = client.post("/calendar", json=_body(versions[0], AMAZON, name=None)).json()
    card = c["current_month"]
    valid(card, "CurrentMonth")
    assert (card["month"], card["day"]) == ("2026-11", 13)
    assert card["monthly_validation_only"] is True and card["validated_satellite"] is False and card["quality"] == "NRT"
    assert card["reference_period"] == {"start_year": 2003, "end_year": 2025}
    years = [y["year"] for y in card["same_days_by_year"]]
    assert years == list(range(2003, 2026))  # every November 2003-2025 is complete here
    v = Store(store_root).latest()
    to_date, by_year = v.same_days(shape(AMAZON), 11, 13, years)
    assert card["count_to_date"] == round(to_date, 1)
    assert [y["count"] for y in card["same_days_by_year"]] == [round(x, 1) for x in by_year]
    med = float(np.median(by_year))
    assert card["same_days_median"] == round(med, 1) and card["difference"] == round(to_date - med, 1)
    assert card["ratio"] == (None if med == 0 else round(to_date / med, 2))
    nov = {m["month"]: m for m in c["months"]}["2026-11"]
    assert card["cells_flagged_strong"] == nov["cells_flagged_strong"] and card["cells_total"] == nov["cells_total"]


def test_3_2_ac3_same_days_fast_path_equals_brute_force(store_root):
    v = Store(store_root).latest()
    for geom in AREAS.values():
        g = shape(geom)
        fast = v.same_days(g, 11, 13, range(2003, 2026))
        inside = shapely.intersects_xy(g, v._p_lon, v._p_lat)
        assert np.allclose(fast[1], v.same_days(g, 11, 13, range(2003, 2026), mask=inside)[1], atol=1e-9)
