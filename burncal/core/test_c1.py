"""Story 2.2: C1 in core, matching the scored predictions.

The parity case (Sumatra, September 2015, Suomi NPP) is derived from held-out
inputs, so it is never copied into this repo. Point BURNCAL_PARITY_CASE_DIR at
the planning record's exports/c1/out/intermediate folder to run those tests.
"""
import ast
import os
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from burncal.core import c1

PARAMS_DIR = Path(__file__).parent / "params"
CASE_DIR = os.environ.get("BURNCAL_PARITY_CASE_DIR")
needs_case = pytest.mark.skipif(not CASE_DIR, reason="BURNCAL_PARITY_CASE_DIR not set")
TOL = 1e-6
YEAR_AXIS, MONTH_AXIS = 0, 8  # 2015, September


@pytest.fixture(scope="module")
def params():
    return c1.load_params()


@pytest.fixture(scope="module")
def case():
    return pd.read_csv(Path(CASE_DIR) / "rows_sumatra_201509.csv")


def _inputs(df):
    return dict(
        time_utc=pd.to_datetime(df["acq_datetime_utc"]).to_numpy("datetime64[s]"),
        lat=df["latitude"].to_numpy(float), lon=df["longitude"].to_numpy(float),
        frp_mw=df["frp_mw"].to_numpy(float), scan_km=df["scan_km"].to_numpy(float),
        track_km=df["track_km"].to_numpy(float), night=(df["daynight_used"] == "N").to_numpy(),
    )


def _grid(weights, df, scale):
    name = "cells_1deg_sumatra.csv" if scale == "1deg" else "cells_0.25deg_sumatra.csv"
    n = len(pd.read_csv(PARAMS_DIR / "parity" / name))
    col = "cell1_index" if scale == "1deg" else "cell025_index"
    return np.bincount(df[col].to_numpy(), weights=weights, minlength=n)


@needs_case
@pytest.mark.parametrize("method", ["4A", "1A", "C1"])
@pytest.mark.parametrize("scale", ["1deg", "025deg"])
def test_2_2_ac1_parity_sumatra_201509(params, case, method, scale):
    weights = c1.row_weights(params, "sumatra", **_inputs(case), method=method)
    got = _grid(weights, case, scale)
    target = np.load(PARAMS_DIR / "parity" / f"{method}_selection_main.npz", allow_pickle=False)
    want = target[f"count_{scale}|sumatra"][:, YEAR_AXIS, MONTH_AXIS]
    miss = np.abs(got - want).max()
    assert miss <= TOL, f"{method} {scale}: max abs miss {miss:.3e}"


@needs_case
def test_2_2_ac1_footprints_match_the_harness(params, case):
    fp_id, anchor = c1.footprints(**{k: v for k, v in _inputs(case).items() if k in
                                     ("time_utc", "lat", "lon", "frp_mw", "scan_km", "track_km")}, params=params)
    want = case["1a_footprint_id"].to_numpy()
    # same partition: a one-to-one map between our ids and the harness ids
    pairs = pd.DataFrame({"ours": fp_id, "theirs": want}).drop_duplicates()
    assert pairs["ours"].is_unique and pairs["theirs"].is_unique
    assert (anchor == case["1a_is_representative_row"].to_numpy()).all()


@needs_case
def test_2_2_ac1_view_angle_matches_the_harness(params, case):
    theta = c1.view_angle(params, case["track_km"].to_numpy(float), case["scan_km"].to_numpy(float))
    assert np.abs(theta - case["1a_theta_scan_angle_rad"].to_numpy()).max() <= 1e-9


def _toy():
    t0 = np.datetime64("2024-09-10T06:00:00", "s")
    return dict(
        time_utc=np.array([t0, t0, t0 + np.timedelta64(60, "s"), t0 + np.timedelta64(3, "h")]),
        lat=np.array([0.10, 0.1001, 0.1002, 0.5]), lon=np.array([101.10, 101.1001, 101.1002, 101.5]),
        frp_mw=np.array([5.0, 9.0, 2.0, 4.0]), scan_km=np.full(4, 0.4), track_km=np.full(4, 0.38),
        night=np.array([False, False, False, True]),
    )


def test_2_2_ac2_excluded_rows_form_no_footprints_and_weigh_nothing(params):
    x = _toy()
    keep = np.array([True, False, True, True])  # row 1 (the brightest) is excluded
    fp_id, anchor = c1.footprints(**{k: v for k, v in x.items() if k != "night"}, include=keep, params=params)
    assert fp_id[1] == -1 and not anchor[1]
    assert anchor[keep].sum() == len(set(fp_id[keep]))  # one anchor per footprint
    w = c1.row_weights(params, "sumatra", **x, include=keep)
    assert w[1] == 0.0
    # the excluded row cannot be its footprint's anchor: the anchor is the brightest kept row
    assert anchor[0] and not anchor[2]


def test_2_2_ac3_row_weight_formula(params):
    x = _toy()
    fp_id, anchor = c1.footprints(**{k: v for k, v in x.items() if k != "night"}, params=params)
    r4a = c1.row_4a(params, "sumatra", x["time_utc"], x["night"])
    term = c1.footprint_1a(params, "sumatra", **{k: v for k, v in x.items() if k != "night"})
    w_month = c1.blend_weight(params, "sumatra", 9)
    assert w_month == 0.7  # September is fire season in Sumatra
    expected = (1 - w_month) * r4a + w_month * np.where(anchor, term, 0.0)
    got = c1.row_weights(params, "sumatra", **x)
    assert np.allclose(got, expected, rtol=0, atol=1e-12)


@needs_case
def test_2_2_ac3_weights_of_a_region_month_sum_to_the_gridded_prediction(params, case):
    w = c1.row_weights(params, "sumatra", **_inputs(case))
    target = np.load(PARAMS_DIR / "parity" / "C1_selection_main.npz", allow_pickle=False)
    total = target["count_1deg|sumatra"][:, YEAR_AXIS, MONTH_AXIS].sum()
    assert abs(w.sum() - total) <= TOL * max(1.0, total)


def test_2_2_ac4_c1_imports_no_tests_and_reads_only_the_param_file():
    src = (Path(__file__).parent / "c1.py").read_text(encoding="utf-8")
    tree = ast.parse(src)
    mods = {a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
    mods |= {n.module or "" for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)}
    assert not any(m.split(".")[0] in ("tests", "burncal") and not m.startswith("burncal.core") for m in mods), mods
    for banned in ("read_csv", "read_parquet", "np.load", "urlopen", "requests", "environ", "datetime.now", "time.time"):
        assert banned not in src, banned
    assert src.count("open(") + src.count("read_text(") <= 1, "only the parameter file may be read"


def test_2_2_season_rule_reproduces_the_stored_seasons(params):
    # The frozen rule (a month is fire season if it holds >= 10% of the 2003-2011
    # Aqua annual total) must give back the seasons stored for the tuning regions
    # before it is applied to any other region.
    for region in ("sumatra", "australia_grassland", "amazon_forest"):
        got = c1.season_months(params, params["history_aqua_2003_2011"][region])
        assert (got == params["season"][region]).all(), region


def test_2_2_season_rule_edges(params):
    assert not c1.season_months(params, np.zeros(12)).any()  # no history: no season
    totals = np.array([10.0, 90.0] + [0.0] * 10)  # month 1 holds exactly 10%
    assert c1.season_months(params, totals)[0]
