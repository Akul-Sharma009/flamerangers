"""Story 2.4: tuning-region rules per row, 5-degree season tiles, evidence class per 1-degree cell."""
import numpy as np
import shapely

from burncal.core import regions

BOXES = {
    "sumatra": (shapely.box(100, -2, 102, 0), "tuned"),
    "southern_africa": (shapely.box(20, -18, 35, -8), "tested_unseen"),
    "punjab": (shapely.box(73.5, 29.5, 77, 32.5), "reported_only"),
}
GEOMS = {k: g for k, (g, _) in BOXES.items()}
CLASSES = {k: c for k, (_, c) in BOXES.items()}


def test_2_4_ac3_region_of_points_and_rules_region():
    lon = np.array([101.0, 25.0, 50.0, 100.0])
    lat = np.array([-1.0, -10.0, 0.0, -1.0])  # last point is on the edge: outside, as in the harness
    got = regions.region_of(lon, lat, GEOMS)
    assert list(got) == ["sumatra", "southern_africa", "", ""]
    assert list(regions.rules_region(got)) == ["sumatra", "", "", ""]


def test_2_4_ac3_season_tile_is_a_fixed_5_degree_grid():
    t = regions.tile_id(np.array([0.0, 4.99, 5.0, -0.01]), np.array([0.0, 0.0, 0.0, -0.01]))
    assert t[0] == t[1] and t[2] != t[0] and t[3] != t[0]


def test_2_4_ac3_evidence_class_per_1deg_cell():
    sw_lon = np.array([100.0, 101.0, 25.0, 76.0, 76.5, 50.0, 102.0])
    sw_lat = np.array([-2.0, -1.0, -10.0, 31.0, 32.0, 0.0, -1.0])
    got = regions.evidence_class(sw_lon, sw_lat, GEOMS, CLASSES)
    # a cell touching a boundary only along an edge is not inside (102E is the box's east edge)
    assert list(got) == ["tuned", "tuned", "tested_unseen", "reported_only", "reported_only", "not_evaluated", "not_evaluated"]


def test_2_4_ac3_evidence_class_prefers_the_strongest_evidence():
    geoms = {"a": shapely.box(0, 0, 0.5, 1), "b": shapely.box(0.5, 0, 1, 1)}
    got = regions.evidence_class(np.array([0.0]), np.array([0.0]), geoms, {"a": "tested_unseen", "b": "tuned"})
    assert list(got) == ["tuned"]
