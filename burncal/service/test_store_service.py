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
PARITY_OK = lambda: {"passed": True, "misses": {},  # noqa: E731  stand-in for the AD-2 case check
                    "params_sha256": publish.params_sha256()}
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
    modis = df["satellite"].isin(["AQUA", "TERRA"]).to_numpy()
    df["instrument"] = np.where(modis, "MODIS", "VIIRS")
    df["confidence"] = np.where(modis, rng.integers(0, 101, len(df)).astype(str), rng.choice(["l", "n", "h"], len(df)))
    df["frp"] = rng.uniform(1, 80, len(df)).round(1)
    df["daynight"] = rng.choice(["D", "N"], len(df))
    df["quality"] = np.where(df["acq_datetime_utc"] >= pd.Timestamp("2026-08-01", tz="UTC"), "NRT", "SP")
    df["type"] = pd.array(np.where(df["quality"] == "SP", 0, -1), dtype="Int64")
    df.loc[df["quality"] == "NRT", "type"] = pd.NA
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
    from burncal.pipeline import ingest
    ingest.write_partitions(df, rec)
    cells = _cells_around(AREAS.values())
    cells.assign(evidence_class="not_evaluated").to_parquet(rec / "evidence_1deg.parquet")
    g1, g025 = aggregate.cell_months(df, 1.0), aggregate.cell_months(df, 0.25)
    thr = aggregate.thresholds_1deg(g1, cells)
    for name, t in (("cells_1deg", g1), ("cells_025deg", g025), ("thresholds_1deg", thr),
                    ("flags_1deg", aggregate.flags_1deg(g1, thr, cells, data_through=DT))):
        t.to_parquet(grids_dir / f"{name}.parquet")
    (raw / "coverage.json").write_text(json.dumps({"extent": EXTENT, "sources": {
        "MODIS_SP": [["2002-07-01", "2026-08-31"]], "MODIS_NRT": [["2026-09-01", "2026-11-13"]],
        "VIIRS_SNPP_SP": [["2012-01-20", "2023-04-30"], ["2023-06-01", "2024-02-10"], ["2024-02-16", "2026-07-31"]],
        "VIIRS_SNPP_NRT": [["2026-08-01", "2026-11-02"]], "VIIRS_NOAA20_NRT": [["2026-08-01", "2026-11-13"]]}}))
    root = tmp / "store"
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="old", parity_check=PARITY_OK)
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="previous", parity_check=PARITY_OK)
    publish.publish(rec, grids_dir, raw, root, data_through=DT, code_revision="current", parity_check=PARITY_OK)
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
    # 0.4.0: flag counts are null outside the record (missing is not zero), integers inside it
    for k in ("cells_flagged_strong", "cells_flagged_marginal"):
        assert months["2002-06"][k] is None and months["2026-12"][k] is None and isinstance(months["2015-01"][k], int)
    assert c["current_month"]["missing_days_to_date"] is False  # the test store's November has no missing days
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
        brute = v.same_days(g, 11, 13, range(2003, 2026), brute=True)
        assert abs(fast[0] - brute[0]) < 1e-9 and np.allclose(fast[1], brute[1], atol=1e-9)


# --- Stories 2.7 and 4.2: hotspots for any search, as CSV ---------------------------
import csv  # noqa: E402
import io  # noqa: E402

from burncal.service.test_service import split_csv  # noqa: E402

HOTSPOT_COLUMNS = ["latitude", "longitude", "acq_datetime_utc", "satellite", "instrument", "confidence", "frp",
                   "daynight", "type", "quality", "feeds_record", "excluded_reason", "weight"]


def _hot(client, version, geom, start, end, **kw):
    return client.post("/hotspots.csv", json={**_body(version, geom, start, end, name=None), **kw})


def _rows(text):
    keys, head, cols, rows = split_csv(text)
    return head, cols, rows


def test_2_7_ac1_rows_inside_the_area_and_exact_dates_with_every_column(client, versions, store_root):
    r = _hot(client, versions[0], AMAZON, "2015-03-10", "2016-02-20", all_satellites=True)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    head, cols, rows = _rows(r.text)
    assert cols == HOTSPOT_COLUMNS
    df = pd.concat(pd.read_parquet(p) for p in sorted((store_root / "versions" / versions[0] / "records").glob("*/[A-Z]*_[0-9]*.parquet")))
    g = shape(AMAZON)
    d = df["utc_date"].astype(str)
    want = df[shapely.intersects_xy(g, df["longitude"], df["latitude"]) & (d >= "2015-03-10") & (d <= "2016-02-20")]
    assert len(rows) == len(want) > 0
    got_days = sorted(x["acq_datetime_utc"][:10] for x in rows)
    assert got_days[0] >= "2015-03-10" and got_days[-1] <= "2016-02-20"
    assert {x["excluded_reason"] for x in rows} == {"none", "static", "offshore"}
    assert all(x["weight"] == "0.0" for x in rows if x["excluded_reason"] != "none")
    assert all(x["acq_datetime_utc"].endswith("Z") and "T" in x["acq_datetime_utc"] for x in rows)


@pytest.mark.parametrize("start,end,year", [("1999-01-01", "2000-12-31", None), ("2027-01-01", "2027-03-31", None),
                                            ("2015-01-01", "2015-12-31", 2019)])
def test_2_7_a_search_with_no_record_file_gives_a_header_and_no_rows(client, versions, start, end, year):
    kw = {"year": year} if year else {}
    r = _hot(client, versions[0], SUMATRA, start, end, **kw)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    _, cols, rows = _rows(r.text)
    assert cols == HOTSPOT_COLUMNS and rows == []


def test_2_6_store_meta_states_the_contract_version(client):
    import yaml
    want = yaml.safe_load((ROOT / "contract" / "openapi.yaml").read_text())["info"]["version"]
    assert client.get("/meta").json()["contract_version"] == want


def test_2_7_ac2_feeding_kept_rows_of_a_complete_month_equal_its_count(client, versions):
    cal = {m["month"]: m for m in client.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).json()["months"]}
    for month, end in (("2009-06", "2009-06-30"), ("2018-02", "2018-02-28"), ("2021-12", "2021-12-31")):
        _, _, rows = _rows(_hot(client, versions[0], PUNJAB, f"{month}-01", end).text)
        n = sum(x["feeds_record"] == "true" and x["excluded_reason"] == "none" for x in rows)
        assert cal[month]["complete"] and n == cal[month]["count"]


def test_4_2_ac1_default_rows_feed_the_record_option_for_every_satellite(client, versions):
    _, _, feed = _rows(_hot(client, versions[0], SUMATRA, "2026-01-01", "2026-11-13").text)
    _, _, every = _rows(_hot(client, versions[0], SUMATRA, "2026-01-01", "2026-11-13", all_satellites=True).text)
    assert feed and all(x["feeds_record"] == "true" for x in feed)
    assert {x["satellite"] for x in feed} == {"SNPP", "NOAA20"}
    assert {x["satellite"] for x in every} == {"AQUA", "TERRA", "SNPP", "NOAA20", "NOAA21"}
    assert len(every) > len(feed)
    w = sum(float(x["weight"]) for x in feed if x["excluded_reason"] == "none")
    assert w > 0


def test_4_2_ac2_large_search_gets_an_estimate_and_years(client, versions, monkeypatch):
    from burncal.service import store as store_mod
    monkeypatch.setattr(store_mod, "MAX_SYNC_ROWS", 500)
    r = _hot(client, versions[0], SUMATRA, "2010-01-01", "2014-12-31", all_satellites=True)
    assert r.status_code == 413
    p = r.json()
    valid(p, "Problem")
    assert p["code"] == "too_large_for_sync" and p["estimated_rows"] > 500 and p["estimated_megabytes"] > 0
    assert p["years"] == [2010, 2011, 2012, 2013, 2014]
    one = _hot(client, versions[0], SUMATRA, "2010-01-01", "2014-12-31", all_satellites=True, year=2012)
    assert one.status_code == 200
    _, _, rows = _rows(one.text)
    assert rows and all(x["acq_datetime_utc"].startswith("2012-") for x in rows)


def test_4_2_ac3_header_explains_the_row_count_and_limits(client, versions):
    text = _hot(client, versions[0], PUNJAB, "2023-01-01", "2023-12-31").text
    keys, head, _, _ = split_csv(text)
    from burncal.service.test_service import HOTSPOT_KEYS
    assert keys == HOTSPOT_KEYS
    assert head["record_version"] == versions[0] and head["data_through"] == "2026-11-13"
    assert "weight" in head["row_count_note"] and "December 2021" in head["row_count_note"]
    assert text.count("\n# counting_limits: ") == 6 and head["row_filter"] == "rows that feed the record"


# --- Story 4.1: analytics CSV -----------------------------------------------------
ANALYTICS_COLUMNS = ["aoi_id", "year", "month", "harmonized_count", "null_reason", "source", "raw_aqua", "raw_terra",
                     "raw_snpp", "raw_noaa20", "raw_noaa21", "inputs", "complete", "partial_reasons",
                     "validated_satellite", "historical_median", "reference_mean", "ratio_to_median", "anomaly_count",
                     "anomaly_pct", "cells_flagged_strong", "cells_flagged_marginal", "cells_total", "reference_year",
                     "provisional", "rank"]


def _cell_text(v):
    return "" if v is None else str(v).lower() if isinstance(v, bool) else str(v)


def test_4_1_ac1_one_row_per_month_and_the_header(client, versions):
    from burncal.service.test_service import ANALYTICS_KEYS
    body = _body(versions[0], AMAZON, start="2010-03-15", end="2026-11-13", name="Amazon test")
    r = client.post("/analytics.csv", json=body)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    keys, head, cols, rows = split_csv(r.text)
    assert keys == ANALYTICS_KEYS and cols == ANALYTICS_COLUMNS
    assert head["record_version"] == versions[0] and head["data_through"] == "2026-11-13"
    assert head["reference_period"] == "2003 to 2025" and head["aoi_name"] == "Amazon test"
    assert head["date_range"] == "2010-03-15 to 2026-11-13"
    assert len(rows) == (2026 - 2010 + 1) * 12


def test_4_1_ac2_every_number_equals_the_calendar(client, versions):
    body = _body(versions[0], PUNJAB, name=None)
    cal = client.post("/calendar", json=body).json()
    _, _, _, rows = split_csv(client.post("/analytics.csv", json=body).text)
    assert len(rows) == len(cal["months"])
    for row, m in zip(rows, cal["months"]):
        assert row["aoi_id"] == cal["aoi"]["aoi_id"] and f'{row["year"]}-{row["month"]}' == m["month"]
        assert row["harmonized_count"] == _cell_text(m["count"])
        assert row["historical_median"] == _cell_text(m["median"])
        for f in ("null_reason", "source", "complete", "validated_satellite", "reference_mean", "ratio_to_median",
                  "anomaly_count", "anomaly_pct", "cells_flagged_strong", "cells_flagged_marginal", "cells_total",
                  "reference_year", "provisional", "rank"):
            assert row[f] == _cell_text(m[f]), (m["month"], f)
        for s, v in m["raw"].items():
            assert row[f"raw_{s}"] == _cell_text(v)
        assert row["partial_reasons"] == ";".join(m["partial_reasons"])
        assert row["inputs"] == ";".join(f'{i["satellite"]}:{i["quality"]}:{i["days"]}' + ("*" if i["feeds_record"] else "")
                                         for i in m["inputs"])


# --- Story 4.5: the numbers-agree check ---------------------------------------------
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("check_numbers", ROOT / "tools" / "check_numbers.py")
check_numbers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_numbers)


@pytest.mark.parametrize("area", ["sumatra", "amazon", "punjab"])
def test_4_5_ac1_calendar_csvs_and_hotspots_agree(client, versions, area):
    report = check_numbers.check(client, versions[0], AREAS[area], name=area)
    assert report["failures"] == [], report["failures"][:5]
    assert report["months_compared"] == 300 and report["hotspot_months_compared"] == 233


def test_2_8_check_numbers_searches_every_region_the_version_holds():
    regions = {"a": {"type": "Polygon", "coordinates": [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]},
               "b": {"type": "Polygon", "coordinates": [[[11, 1], [12, 1], [12, 2], [11, 2], [11, 1]]]},
               "c": {"type": "Polygon", "coordinates": [[[31, 1], [32, 1], [32, 2], [31, 2], [31, 1]]]}}
    found = check_numbers.searches(regions, [[0, 0, 5, 5], [10, 0, 15, 5]])
    assert [n for n, _ in found] == ["a", "b", "extent 0,0,5,5", "extent 10,0,15,5"]
    box = dict(found)["extent 0,0,5,5"]["coordinates"][0]
    assert min(x for x, _ in box) > 0 and max(x for x, _ in box) < 5  # just inside the extent, so it is covered
    assert [n for n, _ in check_numbers.searches(regions, [[-60, -15, -50, -5]])] == ["extent -60,-15,-50,-5", "amazon"]


def test_4_5_ac2_a_failing_check_fails(client, versions, monkeypatch):
    real = check_numbers._calendar

    def off_by_one(*a, **kw):
        cal = real(*a, **kw)
        m = next(m for m in cal["months"] if m["count"])
        m["count"] += 1
        return cal

    monkeypatch.setattr(check_numbers, "_calendar", off_by_one)
    report = check_numbers.check(client, versions[0], PUNJAB, name="punjab")
    assert report["failures"]
    assert check_numbers.exit_code(report) == 1



def test_2_6_null_is_not_zero_an_uncovered_month_is_null(client, versions):
    c = client.post("/calendar", json=_body(versions[0], SUMATRA)).json()
    m = {x["month"]: x for x in c["months"]}
    assert m["2023-05"]["count"] is None and m["2023-05"]["null_reason"] == "outside_coverage"
    assert m["2023-05"]["rank"] is None and m["2023-05"]["source"] is None
    assert m["2023-04"]["count"] is not None and m["2023-06"]["count"] is not None
    cells = client.post("/cells", json={"record_version": versions[0], "aoi": {"name": None, "geometry": PUNJAB},
                                         "month": "2023-05"}).json()["cells"]
    assert all(x["count"] is None and x["flag_state"] == "outside_record" for x in cells)



def test_2_6_ad11_a_version_that_fails_to_load_leaves_the_last_good_one_serving(store_root, versions, tmp_path):
    import os
    import shutil
    root = tmp_path / "copy"
    shutil.copytree(store_root, root)
    app = TestClient(create_app(root))
    assert app.get("/meta").json()["record_version"] == versions[0]
    broken = "20261114-deadbeef"
    (root / "versions" / broken).mkdir()
    (root / "versions" / broken / "manifest.json").write_text("{not json")
    (root / "CURRENT.json").write_text(json.dumps({"record_version": broken, "previous": versions[0]}))
    os.utime(root / "CURRENT.json", ns=(10**18, 10**18))
    m = app.get("/meta")
    assert m.status_code == 200 and m.json()["record_version"] == versions[0]
    assert app.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).status_code == 200


# --- hosting: the store copied from public storage into local disk ---------------------
def test_2_6_store_synced_from_a_url_answers_the_same(store_root, versions, tmp_path):
    from burncal.service import remote
    local = remote.sync(store_root.as_uri(), tmp_path / "tmpstore")
    v = versions[0]
    vdir = local / "versions" / v
    assert (vdir / "points.parquet").exists() and (vdir / "grids" / "flags_1deg.parquet").exists()
    assert not list((vdir / "records").glob("*/[A-Z]*_[0-9]*.parquet"))  # hotspot files wait until needed
    synced = TestClient(create_app(local, fetch=remote.fetcher(store_root.as_uri(), local)))
    direct = TestClient(create_app(store_root))
    body = _body(v, AMAZON, name=None)
    assert synced.post("/calendar", json=body).json() == direct.post("/calendar", json=body).json()
    hot = {**body, "start": "2015-01-01", "end": "2015-12-31", "all_satellites": True}
    assert synced.post("/hotspots.csv", json=hot).text == direct.post("/hotspots.csv", json=hot).text
    assert list((vdir / "records").glob("*/[A-Z]*_2015.parquet"))  # fetched on first use
    # a second sync downloads nothing new
    assert remote.sync(store_root.as_uri(), tmp_path / "tmpstore") == local


# --- the lead's low review items (15 Nov) --------------------------------------------
def test_review_months_outside_the_record_are_not_validated_and_never_minus_zero(client, versions):
    c = client.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).json()
    out = [m for m in c["months"] if m["count"] is None]
    assert out and all(m["validated_satellite"] is False for m in out)
    for m in c["months"]:
        for f in ("anomaly_count", "anomaly_pct", "ratio_to_median"):
            assert m[f] is None or str(m[f]) != "-0.0", (m["month"], f)


def test_review_cells_after_data_through_have_no_threshold(client, versions):
    c = client.post("/cells", json={"record_version": versions[0], "aoi": {"name": None, "geometry": PUNJAB},
                                     "month": "2026-12"}).json()
    assert all(x["threshold"] is None and x["count"] is None for x in c["cells"])


def test_review_hotspot_csv_streams_a_large_year(client, versions, monkeypatch):
    from burncal.service import store as store_mod
    monkeypatch.setattr(store_mod, "MAX_SYNC_ROWS", 10)
    r = client.post("/hotspots.csv", json={**_body(versions[0], SUMATRA, "2002-07-01", "2026-11-13", name=None),
                                            "all_satellites": True, "year": 2015})
    assert r.status_code == 200 and r.text.count("\n2015-") == 0 and "2015-" in r.text


# --- Codex review (14 Nov): the previous version loads only when a request names it ----------
def test_2_6_ad11_only_the_current_version_loads_at_start(store_root, versions):
    s = Store(store_root)
    assert set(s._versions) == {versions[0]}
    assert s.get(versions[1]) is not None and set(s._versions) == {versions[0], versions[1]}


def test_2_6_ad11_a_broken_previous_version_does_not_stop_the_current(store_root, versions, tmp_path):
    import shutil
    root = tmp_path / "copy"
    shutil.copytree(store_root, root)
    (root / "versions" / versions[1] / "manifest.json").write_text("{not json")
    app = TestClient(create_app(root))
    assert app.get("/meta").json()["record_version"] == versions[0]
    assert app.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).status_code == 200
    r = app.post("/calendar", json=_body(versions[1], PUNJAB, name=None))
    assert r.status_code == 410 and r.json()["current_record_version"] == versions[0]
    assert app.post("/calendar", json=_body(versions[0], PUNJAB, name=None)).status_code == 200


def test_2_6_sync_copies_the_current_version_and_fetches_the_previous_on_use(store_root, versions, tmp_path):
    from burncal.service import remote
    local = remote.sync(store_root.as_uri(), tmp_path / "tmpstore")
    assert (local / "versions" / versions[0] / "manifest.json").exists()
    assert not (local / "versions" / versions[1]).exists()
    app = TestClient(create_app(local, fetch=remote.fetcher(store_root.as_uri(), local)))
    direct = TestClient(create_app(store_root))
    body = _body(versions[1], AMAZON, name=None)
    assert app.post("/calendar", json=body).json() == direct.post("/calendar", json=body).json()
    assert (local / "versions" / versions[1] / "points.parquet").exists()

# --- Story 3.4: a changed date range ------------------------------------------------
def test_3_4_ac3_rankings_follow_the_range_median_and_anomalies_keep_the_reference_period(client, versions):
    full = client.post("/calendar", json=_body(versions[0])).json()
    cut = client.post("/calendar", json=_body(versions[0], start="2010-03-15", end="2012-06-10")).json()
    valid(cut, "Calendar")
    assert cut["range"] == {"start": "2010-03-15", "end": "2012-06-10"}
    # The reference period does not move with the range, and neither does anything computed from it.
    assert cut["reference_period"] == full["reference_period"]
    assert cut["calendar_month_medians"] == full["calendar_month_medians"]
    fm = {m["month"]: m for m in full["months"]}
    for m in cut["months"]:
        for k in ("median", "reference_mean", "ratio_to_median", "anomaly_count", "anomaly_pct", "anomaly_class"):
            assert m[k] == fm[m["month"]][k], (m["month"], k)
    # Rankings follow the range: only months and years inside it are ranked.
    top_months = cut["statistics"]["top_months"]
    assert top_months and all("2010-03" <= t["month"] <= "2012-06" for t in top_months)
    assert {t["year"] for t in cut["statistics"]["top_years"]} <= {2011}  # 2010 and 2012 are cut
    assert top_months != full["statistics"]["top_months"]
    assert all(m["rank"] is None for m in cut["months"] if not "2010-03" <= m["month"] <= "2012-06")
    # The record high is the whole record's, whatever the range (contract: record_high).
    assert cut["statistics"]["record_high"] == full["statistics"]["record_high"]


# --- Story 2.8, option 1: a version's points read from another location (a URL on the host) ---
def test_2_8_a_version_reads_its_points_from_another_location(store_root, versions, tmp_path):
    import shutil
    v = versions[0]
    local = tmp_path / "nopoints"
    shutil.copytree(store_root, local, ignore=shutil.ignore_patterns("points.parquet"))
    elsewhere = tmp_path / "remote" / v
    elsewhere.mkdir(parents=True)
    shutil.copy2(store_root / "versions" / v / "points.parquet", elsewhere / "points.parquet")
    where = lambda version: (tmp_path / "remote" / version / "points.parquet").as_posix()  # noqa: E731
    app = TestClient(create_app(local, points_location=where))
    direct = TestClient(create_app(store_root))
    for geom in (SUMATRA, AMAZON, PUNJAB):
        body = _body(v, geom, name=None)
        assert app.post("/calendar", json=body).json() == direct.post("/calendar", json=body).json()


def test_2_8_sync_without_points_reads_them_from_the_store_url(store_root, versions, tmp_path):
    from burncal.service import remote
    local = remote.sync(store_root.as_uri(), tmp_path / "tmpstore", with_points=False)
    # DuckDB reads the points from a plain path here, as it reads an https URL on the host
    assert not (local / "versions" / versions[0] / "points.parquet").exists()
    app = TestClient(create_app(local, fetch=remote.fetcher(store_root.as_uri(), local),
                                points_location=remote.points_url(store_root.as_posix())))
    direct = TestClient(create_app(store_root))
    for v in versions[:2]:  # the previous version too, loaded on demand
        body = _body(v, AMAZON, name=None)
        assert app.post("/calendar", json=body).json() == direct.post("/calendar", json=body).json()
    assert not list((local / "versions").glob("*/points.parquet"))


def test_3_2_missing_days_to_date_reads_the_area_extent(store_root, versions, tmp_path):
    """Contract 0.4.0's card flag, on a multi-extent store: the current month's missing days are read per extent."""
    import shutil
    root = tmp_path / "copy"
    shutil.copytree(store_root, root)
    path = root / "versions" / versions[0] / "missing_days.parquet"
    miss = pd.read_parquet(path)
    extent = miss["extent"].iloc[0] if "extent" in miss and len(miss) else ""
    row = {"year": 2026, "month": 11, "uncovered": False, "extent": extent}
    pd.concat([miss, pd.DataFrame([row])], ignore_index=True).to_parquet(path, index=False)
    c = TestClient(create_app(root)).post("/calendar", json=_body(versions[0])).json()
    assert c["current_month"]["missing_days_to_date"] is True


# --- Story 2.10: /meta serves the NOAA-20 check's headline figures -------------------------
def test_2_10_ac2_meta_serves_the_noaa20_headline_rounded_once(store_root, versions, tmp_path):
    import shutil
    root = tmp_path / "copy"
    shutil.copytree(store_root, root)
    head = {"reported_only": True, "validated_against_aqua": False, "period_start": "2022-01", "period_end": "2026-10",
            "pooled": {"mean_abs_difference": 1.23456, "bias_pct": -7.25001, "cell_months": 580},
            "regions": [{"region_id": "sumatra", "name": "Sumatra",
                         "figures": {"mean_abs_difference": 2.04999, "bias_pct": 3.96, "cell_months": 580}}]}
    (root / "versions" / versions[0] / "noaa20_check.json").write_text(json.dumps(head))
    m = TestClient(create_app(root)).get("/meta").json()
    valid(m, "Meta")
    n = m["noaa20_check"]
    assert n["reported_only"] is True and n["validated_against_aqua"] is False
    assert n["pooled"] == {"mean_abs_difference": 1.2, "bias_pct": -7.3, "cell_months": 580}
    assert n["regions"][0]["figures"] == {"mean_abs_difference": 2.0, "bias_pct": 4.0, "cell_months": 580}


def test_2_10_ac2_meta_noaa20_check_is_null_until_the_run_exists(client):
    assert client.get("/meta").json()["noaa20_check"] is None


def test_7_3_season_from_the_store_agrees_with_the_calendar(client, versions):
    """Same medians as /calendar (one implementation), and each year's counts are /calendar's counts."""
    body = {"record_version": versions[0], "aoi": {"name": "Sumatra", "geometry": SUMATRA}}
    r = client.post("/season", json=body)
    assert r.status_code == 200, r.text
    s = r.json()
    valid(s, "Season")
    cal = client.post("/calendar", json=_body(versions[0])).json()
    assert [m["median"] for m in s["typical"]["months"]] == [c["median"] for c in cal["calendar_month_medians"]]
    counts = {m["month"]: m["count"] for m in cal["months"]}
    for y in s["years"]:
        for i, c in enumerate(y["counts"]):
            assert c == counts.get(f"{y['year']:04d}-{i + 1:02d}")
    assert all(m["low"] <= m["median"] <= m["high"] for m in s["typical"]["months"] if m["median"] is not None)
    assert client.post("/season", json={**body, "record_version": versions[2]}).status_code in (200, 410)


def test_7_5_season_to_date_from_the_store_equals_the_calendar_and_marks_the_current_month(client, versions):
    cal = client.post("/calendar", json=_body(versions[0])).json()
    r = client.post("/season_to_date", json={"record_version": versions[0], "aoi": {"name": "Sumatra", "geometry": SUMATRA}, "year": 2026})
    assert r.status_code == 200, r.text
    s = r.json()
    valid(s, "SeasonToDate")
    counts = {m["month"]: m["count"] for m in cal["months"]}
    assert s["past_years"][0] == 2003 and 2002 not in s["past_years"] and 2026 not in s["past_years"]
    run = 0.0
    for p in s["months"][:11]:                       # January to November 2026: running total of the calendar's months
        run += counts[p["month"]]
        assert p["cumulative"] == pytest.approx(run, abs=0.6)  # the calendar rounds each month
    assert [p["to_date"] for p in s["months"]] == [False] * 10 + [True, False]
    assert s["months"][11]["cumulative"] is None and s["months"][11]["median"] is not None
    assert all(p["band_low"] <= p["median"] <= p["band_high"] for p in s["months"])
    # A year that starts in July has no curve; the median and band do not depend on the year asked for
    s02 = client.post("/season_to_date", json={"record_version": versions[0], "aoi": {"geometry": SUMATRA}, "year": 2002}).json()
    assert all(p["cumulative"] is None for p in s02["months"])
    assert [p["median"] for p in s02["months"]] == [p["median"] for p in s["months"]]


def test_7_5_season_to_date_refuses_what_calendar_refuses(client, versions):
    far = {"type": "Polygon", "coordinates": [[[150, -40], [151, -40], [151, -39], [150, -39], [150, -40]]]}
    r = client.post("/season_to_date", json={"record_version": versions[0], "aoi": {"geometry": far}, "year": 2020})
    assert r.status_code == 404
    r = client.post("/season_to_date", json={"record_version": versions[2], "aoi": {"geometry": SUMATRA}, "year": 2020})
    assert r.status_code == 410


# --- 15 Nov: a 400 problem names the version being served, not the fixture's ---
def test_review_a_400_problem_names_the_served_version(client, versions):
    v = versions[0]
    bad_geometry = {**_body(v, AMAZON, name=None), "aoi": {"name": "x", "geometry": {"type": "Point", "coordinates": [0, 0]}}}
    malformed = {"record_version": v}  # no aoi, start or end: a validation error
    served = client.get("/meta").json()
    for body in (bad_geometry, malformed):
        r = client.post("/calendar", json=body)
        assert r.status_code == 400, r.text
        p = r.json()
        assert p["record_version"] == served["record_version"] and p["data_through"] == served["data_through"], p
