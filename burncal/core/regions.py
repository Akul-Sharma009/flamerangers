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
    """Per 1-degree cell: the strongest evidence class of any region overlapping it with positive area."""
    cells = shapely.box(np.asarray(sw_lon, float), np.asarray(sw_lat, float),
                        np.asarray(sw_lon, float) + 1.0, np.asarray(sw_lat, float) + 1.0)
    rank = np.full(len(cells), EVIDENCE_ORDER.index("not_evaluated"))
    for rid, g in geoms.items():
        hit = shapely.area(shapely.intersection(cells, g)) > 0
        rank = np.where(hit, np.minimum(rank, EVIDENCE_ORDER.index(classes[rid])), rank)
    return np.array(EVIDENCE_ORDER, dtype=object)[rank]
