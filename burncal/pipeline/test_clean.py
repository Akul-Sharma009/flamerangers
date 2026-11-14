"""Story 2.3 cleaning step: marks rows, never drops them (synthetic land square)."""
import json

import numpy as np
import pandas as pd
import pytest
import shapely

from burncal.pipeline import clean as pclean

LAND = shapely.box(0, 0, 10, 10)


def _df(lon, lat, when, dn="D"):
    n = len(lon)
    return pd.DataFrame({"latitude": lat, "longitude": lon,
                         "acq_datetime_utc": pd.to_datetime(when, utc=True),
                         "daynight": [dn] * n})


def test_2_3_ac1_every_row_gets_daynight_and_excluded_reason():
    df = _df([5.0, 5.0], [5.0, 5.0], ["2020-06-21 12:00", "2020-06-21 00:00"], dn="N")
    out = pclean.clean(df, LAND, np.array([], dtype=np.int64))
    assert list(out.daynight) == ["D", "N"]  # recomputed, file value was N for both
    assert list(out.daynight_file) == ["N", "N"]
    assert out.sza.notna().all() and out.excluded_reason.isin(["none", "offshore", "static"]).all()
    assert len(out) == 2


def test_2_3_ac2_offshore_and_static_rows_are_marked_not_deleted():
    lon = [5.0, 5.0, 20.0, 7.0]
    lat = [5.0, 5.0, 20.0, 7.0]
    days = pd.date_range("2018-01-01", periods=50)
    when = ["2018-06-01 12:00", "2018-06-02 12:00", "2018-06-01 12:00", "2018-06-01 12:00"]
    df = _df(lon, lat, when)
    # static cell: 50 days of hotspots at (5,5) in 2018
    hist = _df([5.0] * 50, [5.0] * 50, days)
    static = pclean.static_from(hist)
    out = pclean.clean(df, LAND, static)
    assert len(out) == len(df)
    assert list(out.excluded_reason) == ["static", "static", "offshore", "none"]


def test_2_3_ac2_on_land_uses_prepared_geometry():
    got = pclean.on_land(np.array([5.0, 15.0]), np.array([5.0, 5.0]), pclean.prepare(LAND))
    assert list(got) == [True, False]


def test_2_3_ac2_load_land_reads_geojson_polygons(tmp_path):
    gj = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": json.loads(shapely.to_geojson(LAND))}]}
    p = tmp_path / "land.geojson"
    p.write_text(json.dumps(gj))
    g = pclean.load_land(p)
    assert list(pclean.on_land(np.array([5.0, 15.0]), np.array([5.0, 5.0]), g)) == [True, False]


def test_2_3_ac2_load_land_refuses_shapefile(tmp_path):
    with pytest.raises(ValueError, match="GeoJSON"):
        pclean.load_land(tmp_path / "ne_10m_land.shp")
