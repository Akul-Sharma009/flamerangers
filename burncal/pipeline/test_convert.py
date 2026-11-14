"""Story 2.4: the convert step. Weights, feeding satellites, region rules and evidence class."""
import json

import numpy as np
import pandas as pd
import pytest
import shapely

from burncal.core import c1
from burncal.pipeline import c1_params, convert

GEOMS = {"sumatra": shapely.box(100, -2, 102, 0), "southern_africa": shapely.box(20, -18, 35, -8)}
CLASSES = {"sumatra": "tuned", "southern_africa": "tested_unseen"}


@pytest.fixture(scope="module")
def params():
    return c1_params.read_c1_params()


def _rows(rows):
    df = pd.DataFrame(rows, columns=["satellite", "when", "longitude", "latitude", "excluded_reason"])
    df["acq_datetime_utc"] = pd.to_datetime(df.pop("when"), utc=True)
    df["utc_date"] = df["acq_datetime_utc"].dt.date
    df["frp"], df["scan"], df["track"], df["daynight"], df["quality"] = 5.0, 0.4, 0.38, "D", "SP"
    return df


def test_2_4_ac1_weights_by_satellite_and_period(params):
    df = _rows([
        ("AQUA", "2021-12-31 06:00", 101.0, -1.0, "none"),
        ("AQUA", "2022-01-01 06:00", 101.0, -1.0, "none"),
        ("SNPP", "2021-12-31 06:00", 101.0, -1.0, "none"),
        ("SNPP", "2023-09-10 06:00", 101.0, -1.0, "none"),
        ("TERRA", "2015-01-01 03:00", 101.0, -1.0, "none"),
        ("AQUA", "2015-01-01 06:00", 101.0, -1.0, "static"),
    ])
    out = convert.convert(df, params, GEOMS)
    assert list(out["feeds_record"]) == [True, False, False, True, False, True]
    w = out["weight"].to_numpy()
    assert w[0] == 1.0 and w[1] == 0.0 and w[2] == 0.0 and w[4] == 0.0 and w[5] == 0.0
    expected = c1.row_weights_mixed(params, np.array(["sumatra"], object), np.array([True]),
                                    time_utc=df.acq_datetime_utc.dt.tz_convert(None).to_numpy("datetime64[s]")[3:4],
                                    lat=[-1.0], lon=[101.0], frp_mw=[5.0], scan_km=[0.4], track_km=[0.38], night=[False])
    assert w[3] == pytest.approx(expected[0], abs=1e-12) and w[3] > 0
    # one count rule: the count is the sum of weights over feeding, non-excluded rows
    counted = out["feeds_record"] & (out["excluded_reason"] == "none")
    assert out.loc[counted, "weight"].sum() == pytest.approx(w.sum())


def test_2_4_ac2_suomi_npp_to_noaa20_on_3_november_2026(params):
    df = _rows([
        ("SNPP", "2026-11-02 06:00", 101.0, -1.0, "none"),
        ("SNPP", "2026-11-03 06:00", 101.0, -1.0, "none"),
        ("NOAA20", "2026-11-02 06:30", 101.0, -1.0, "none"),
        ("NOAA20", "2026-11-03 06:30", 101.0, -1.0, "none"),
        ("NOAA21", "2026-11-03 07:00", 101.0, -1.0, "none"),
    ])
    out = convert.convert(df, params, GEOMS)
    assert list(out["feeds_record"]) == [True, False, False, True, False]
    assert list(out["validated_satellite"]) == [True, True, True, False, True]
    assert (out["weight"] > 0).tolist() == [True, False, False, True, False]


def test_2_4_ac3_tuning_region_rules_inside_pooled_outside(params):
    df = _rows([
        ("SNPP", "2023-09-10 06:00", 101.0, -1.0, "none"),   # inside Sumatra
        ("SNPP", "2023-09-10 09:00", 60.0, 10.0, "none"),    # outside every region
        ("SNPP", "2023-09-10 12:00", 25.0, -10.0, "none"),   # southern Africa: evaluated, pooled rules
    ])
    out = convert.convert(df, params, GEOMS)
    assert list(out["region_id"]) == ["sumatra", "", "southern_africa"]
    assert list(out["rules_region"]) == ["sumatra", "", ""]
    assert out["weight"].iloc[0] != out["weight"].iloc[1]


def test_2_4_ac3_season_outside_tuning_regions_comes_from_2003_2011_aqua_history(params):
    hist = [("AQUA", f"{y}-03-15 06:00", 60.5, 10.5, "none") for y in range(2003, 2012)]
    df = _rows(hist + [("SNPP", "2023-03-10 06:00", 60.0, 10.0, "none"),
                       ("SNPP", "2023-04-10 06:00", 60.0, 10.0, "none"),
                       ("AQUA", "2015-04-10 06:00", 60.0, 10.0, "none")])  # outside 2003-2011: ignored
    out = convert.convert(df, params, GEOMS)
    snpp = out[out.satellite == "SNPP"]
    assert list(snpp["in_season"]) == [True, False]


def test_2_4_ac3_every_1deg_cell_has_an_evidence_class(tmp_path, params):
    regions = tmp_path / "regions.geojson"
    regions.write_text(json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"region_id": k, "evidence_class": CLASSES[k]},
         "geometry": json.loads(shapely.to_geojson(g))} for k, g in GEOMS.items()]}))
    clean = tmp_path / "clean"; clean.mkdir()
    _rows([("AQUA", "2015-01-01 06:00", 101.5, -1.5, "none"),
           ("AQUA", "2015-01-01 06:00", 98.5, 3.5, "none")]).to_parquet(clean / "AQUA_2015.parquet")
    with pytest.raises(ValueError, match="5-degree tiles"):
        convert.build(clean, tmp_path / "bad", extent=(98.5, -1.5, 101.5, 3.5), regions_path=regions, params=params)
    summary = convert.build(clean, tmp_path / "out", extent=(95.0, -5.0, 105.0, 5.0), regions_path=regions, params=params)
    ev = pd.read_parquet(tmp_path / "out" / "evidence_1deg.parquet")
    assert len(ev) == 10 * 10  # every 1-degree cell of the build extent
    got = {(r.sw_lon, r.sw_lat): r.evidence_class for r in ev.itertuples()}
    assert got[(101.0, -2.0)] == "tuned" and got[(98.0, 3.0)] == "not_evaluated"
    rec = pd.read_parquet(tmp_path / "out" / "AQUA_2015.parquet")
    assert {"weight", "feeds_record", "validated_satellite", "rules_region", "region_id"} <= set(rec.columns)
    assert summary["rows"] == 2
