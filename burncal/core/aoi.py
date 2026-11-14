"""Story 2.6: an area of interest's id, area and scale cautions. Pure."""
import hashlib

import numpy as np
import shapely

EARTH_RADIUS_KM = 6371.0088


def _ring_area(coords) -> float:
    lon, lat = np.radians(np.asarray(coords)[:, 0]), np.radians(np.asarray(coords)[:, 1])
    return abs(np.sum((lon[1:] - lon[:-1]) * (2 + np.sin(lat[:-1]) + np.sin(lat[1:])))) * EARTH_RADIUS_KM ** 2 / 2


def area_km2(geom) -> float:
    """Area on a sphere (km2): outer rings minus holes."""
    polys = getattr(geom, "geoms", [geom])
    return float(sum(_ring_area(p.exterior.coords) - sum(_ring_area(h.coords) for h in p.interiors) for p in polys))


def _box_km2(lat_c: float, size: float) -> float:
    a, b = np.radians(lat_c - size / 2), np.radians(lat_c + size / 2)
    return EARTH_RADIUS_KM ** 2 * np.radians(size) * (np.sin(b) - np.sin(a))


def scale_cautions(geom) -> list[str]:
    """scale_below_1deg / scale_below_025deg when the area is smaller than a box of that size at its latitude."""
    a, lat_c = area_km2(geom), shapely.centroid(geom).y
    out = []
    if a < _box_km2(lat_c, 1.0):
        out.append("scale_below_1deg")
    if a < _box_km2(lat_c, 0.25):
        out.append("scale_below_025deg")
    return out


def aoi_id(geom) -> str:
    """Hash of the normalised geometry (coordinates to 1e-7 degree; ring start and direction ignored)."""
    g = shapely.normalize(shapely.set_precision(geom, 1e-7))
    return hashlib.sha256(shapely.to_wkb(g)).hexdigest()[:16]
