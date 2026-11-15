"""Story 2.10: converted NOAA-20 counts against converted Suomi NPP counts, reported only."""
import json

import numpy as np
import pandas as pd
import pytest
import shapely

from burncal.pipeline import c1_params, convert, noaa20_check

GEOMS = {"sumatra": shapely.box(100, -2, 102, 0)}
LAND = shapely.box(99, -3, 103, 1)


@pytest.fixture(scope="module")
def params():
    return c1_params.read_c1_params()


def _rows(rows):
    df = pd.DataFrame(rows, columns=["satellite", "when", "longitude", "latitude", "excluded_reason"])
    df["acq_datetime_utc"] = pd.to_datetime(df.pop("when"), utc=True)
    df["utc_date"] = df["acq_datetime_utc"].dt.date
    df["frp"], df["scan"], df["track"], df["daynight"], df["quality"] = 5.0, 0.4, 0.38, "D", "SP"
    return df


SAME = [("2023-09-10 06:00", 101.2, -1.3), ("2023-09-10 06:01", 101.21, -1.31), ("2023-09-11 18:00", 100.5, -0.5)]


def test_2_10_ac1_c1_is_applied_unchanged_to_each_satellite(params):
    snpp = _rows([("SNPP", t, x, y, "none") for t, x, y in SAME])
    n20 = _rows([("NOAA20", t, x, y, "none") for t, x, y in SAME])
    history = convert.season_history(snpp.iloc[:0], GEOMS)
    w_snpp = noaa20_check.weights(snpp, params, GEOMS, history)
    w_n20 = noaa20_check.weights(n20, params, GEOMS, history)
    assert np.allclose(w_snpp, w_n20, rtol=0, atol=1e-12) and (w_snpp > 0).all()
    # the same weights the record gives Suomi NPP rows of 2023 (C1 unchanged, nothing fitted)
    rec = convert.convert(snpp, params, GEOMS, history)
    assert np.allclose(rec["weight"].to_numpy(), w_snpp, rtol=0, atol=1e-12)


def test_2_10_ac1_excluded_rows_and_rows_outside_the_period_count_nothing(params):
    df = _rows([("NOAA20", "2023-09-10 06:00", 101.2, -1.3, "static"),
                ("NOAA20", "2021-12-31 06:00", 101.2, -1.3, "none"),
                ("NOAA20", "2026-11-01 06:00", 101.2, -1.3, "none")])
    history = convert.season_history(df.iloc[:0], GEOMS)
    t = noaa20_check.cell_month_counts(df, params, GEOMS, history, "sumatra")
    assert t["count"].sum() == 0


def _clean_dir(tmp_path):
    d = tmp_path / "clean"
    d.mkdir()
    snpp = _rows([("SNPP", t, x, y, "none") for t, x, y in SAME])
    n20 = _rows([("NOAA20", t, x, y, "none") for t, x, y in SAME[:2]] + [("NOAA20", "2024-03-01 06:00", 101.5, -1.5, "none")])
    snpp.to_parquet(d / "SNPP_2023.parquet")
    n20[n20["acq_datetime_utc"].dt.year == 2023].to_parquet(d / "NOAA20_2023.parquet")
    n20[n20["acq_datetime_utc"].dt.year == 2024].to_parquet(d / "NOAA20_2024.parquet")
    return d


def test_2_10_ac1_figures_per_region_at_1deg_and_whole_region(tmp_path, params):
    d = _clean_dir(tmp_path)
    rep = noaa20_check.run([("sumatra", d)], LAND, params=params, geoms=GEOMS, names={"sumatra": "Sumatra"})
    r = rep["regions"]["sumatra"]
    months = 58  # January 2022 to October 2026
    assert r["1deg"]["cell_months"] == 4 * months  # the four 1-degree land cells of the region
    assert r["region"]["cell_months"] == months
    assert r["1deg"]["test_total"] == pytest.approx(r["region"]["test_total"])
    assert r["1deg"]["reference_total"] > 0 and r["1deg"]["test_total"] > 0
    assert rep["pooled"]["1deg"]["cell_months"] == 4 * months
    assert rep["period_start"] == "2022-01" and rep["period_end"] == "2026-10"


def test_2_10_ac2_the_file_says_reported_only_and_not_a_validation(tmp_path, params):
    d = _clean_dir(tmp_path)
    rep = noaa20_check.run([("sumatra", d)], LAND, params=params, geoms=GEOMS, names={"sumatra": "Sumatra"})
    assert "reported only" in rep["label"].lower() and "not a validation against aqua" in rep["label"].lower()
    assert rep["params_sha256"] == c1_params_sha()
    json.dumps(rep)  # plain JSON, no NaN
    assert "nan" not in json.dumps(rep).lower()


def c1_params_sha():
    import hashlib
    return hashlib.sha256(c1_params.PARAMS_FILE.read_bytes()).hexdigest()
