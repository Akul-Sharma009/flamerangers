"""Story 2.4: where C1's region rules apply, season tiles, and evidence class (AD-4).

Pure: geometries are passed in; nothing is read from disk.
"""
import numpy as np
import shapely

TUNING_REGIONS = ("sumatra", "australia_grassland", "amazon_forest")
SEASON_TILE_DEG = 5.0
EVIDENCE_ORDER = ("tuned", "tested_unseen", "reported_only", "not_evaluated")


def region_of(lon, lat, geoms: dict) -> np.ndarray:
    """Per point: id of the region whose interior holds it, else "" (a boundary point is outside, as in the harness)."""
    lon, lat = np.asarray(lon, float), np.asarray(lat, float)
    out = np.full(len(lon), "", dtype=object)
    for rid, g in geoms.items():
        out[(out == "") & shapely.contains_xy(g, lon, lat)] = rid
    return out


def rules_region(region_ids) -> np.ndarray:
    """The C1 rules each point uses: its tuning region, else "" for the pooled rules."""
    r = np.asarray(region_ids, object)
    return np.where(np.isin(r, TUNING_REGIONS), r, "").astype(object)


def tile_id(lon, lat) -> np.ndarray:
    """Id of the fixed 5-degree tile holding each point (season mask outside the evaluated regions)."""
    ix = np.floor((np.asarray(lon, float) + 180.0) / SEASON_TILE_DEG + 1e-9).astype(np.int64)
    iy = np.floor((np.asarray(lat, float) + 90.0) / SEASON_TILE_DEG + 1e-9).astype(np.int64)
    return ix * 1000 + iy


def evidence_class(sw_lon, sw_lat, geoms: dict, classes: dict) -> np.ndarray:
    """Per 1-degree cell: the class covering most of its area (lead's call, 14 Nov).

    The part of the cell outside every region counts as not_evaluated, the weakest class. An exact
    tie goes to the weaker class, so a cell exactly half inside a region is not_evaluated. Areas
    are planar, in square degrees.
    """
    lon, lat = np.asarray(sw_lon, float), np.asarray(sw_lat, float)
    cells = shapely.box(lon, lat, lon + 1.0, lat + 1.0)
    share = np.zeros((len(cells), len(EVIDENCE_ORDER)))
    for rid, g in geoms.items():
        share[:, EVIDENCE_ORDER.index(classes[rid])] += shapely.area(shapely.intersection(cells, g))
    share[:, -1] += np.clip(1.0 - share.sum(axis=1), 0.0, None)
    # largest share; on a tie the weaker class (later in EVIDENCE_ORDER) wins
    top = share.max(axis=1, keepdims=True)
    best = share.shape[1] - 1 - np.argmax(share[:, ::-1] >= top - 1e-12, axis=1)
    return np.array(EVIDENCE_ORDER, dtype=object)[best]


def tile_extent(bounds) -> tuple:
    """The build extent widened to whole 5-degree season tiles, so no tile's history is cut."""
    x0, y0, x1, y1 = bounds
    t = SEASON_TILE_DEG
    return (float(np.floor(x0 / t) * t), float(np.floor(y0 / t) * t),
            float(np.ceil(x1 / t) * t), float(np.ceil(y1 / t) * t))


def is_tile_extent(bounds) -> bool:
    return tuple(float(b) for b in bounds) == tile_extent(bounds)
