"""Cleaning step (Story 2.3): marks rows, never removes them.

Land layer: shapely 2.2 cannot read .shp, and no shapefile reader (pyshp, pyogrio,
fiona) is pinned. So load_land reads a GeoJSON copy of Natural Earth 1:10m land
(e.g. `ogr2ogr -f GeoJSON ne_10m_land.geojson ne_10m_land.shp`, or the
ne_10m_land.geojson published by Natural Earth's GitHub).
"""
import json
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import shape
from shapely.ops import unary_union

from burncal.core import clean as core


def load_land(path):
    """Read a GeoJSON land layer into one prepared geometry."""
    path = Path(path)
    if path.suffix.lower() == ".shp":
        raise ValueError("shapely cannot read shapefiles; convert the land layer to GeoJSON")
    gj = json.loads(path.read_text(encoding="utf-8"))
    if gj.get("type") == "FeatureCollection":
        geoms = [shape(f["geometry"]) for f in gj["features"] if f.get("geometry")]
    elif gj.get("type") == "Feature":
        geoms = [shape(gj["geometry"])]
    else:
        geoms = [shape(gj)]
    return prepare(unary_union(geoms))


def prepare(geom):
    shapely.prepare(geom)
    return geom


def on_land(lon, lat, land_geom) -> np.ndarray:
    return shapely.contains_xy(prepare(land_geom), np.asarray(lon, float), np.asarray(lat, float))


def static_from(df) -> np.ndarray:
    """Persistent cells from rows with latitude, longitude, acq_datetime_utc."""
    return core.static_cells(df["longitude"].values, df["latitude"].values, df["acq_datetime_utc"])


def clean(df, land_geom, static):
    """Add sza, daynight (recomputed), daynight_file (original) and excluded_reason. No row is removed."""
    out = df.copy()
    lon, lat, when = out["longitude"].values, out["latitude"].values, out["acq_datetime_utc"]
    out["daynight_file"] = out["daynight"]
    out["sza"] = core.solar_zenith_deg(lat, lon, when)
    out["daynight"] = np.where(out["sza"] < core.SZA_DAY_LIMIT_DEG, "D", "N")
    out["excluded_reason"] = core.excluded_reason(
        on_land(lon, lat, land_geom), core.static_cell_id(lon, lat), static)
    return out
