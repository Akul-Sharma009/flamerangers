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
    sw_lon = np.array([100.0, 101.0, 25.0, 76.0, 76.0, 50.0, 102.0])
    sw_lat = np.array([-2.0, -1.0, -10.0, 31.0, 32.0, 0.0, -1.0])
    got = regions.evidence_class(sw_lon, sw_lat, GEOMS, CLASSES)
    # (76, 32) is half inside Punjab: a tie with the outside part goes to the region's class
    assert list(got) == ["tuned", "tuned", "tested_unseen", "reported_only", "reported_only", "not_evaluated", "not_evaluated"]


def test_2_4_ac3_evidence_class_is_the_class_covering_most_of_the_cell():
    # lead's call (14 Nov): largest area share; the part outside every region is not_evaluated
    tuned = {"t": shapely.box(0, 0, 0.6, 1)}
    assert list(regions.evidence_class(np.array([0.0]), np.array([0.0]), tuned, {"t": "tuned"})) == ["tuned"]
    small = {"t": shapely.box(0, 0, 0.4, 1)}
    assert list(regions.evidence_class(np.array([0.0]), np.array([0.0]), small, {"t": "tuned"})) == ["not_evaluated"]
    split = {"a": shapely.box(0, 0, 0.3, 1), "b": shapely.box(0.3, 0, 0.6, 1)}
    assert list(regions.evidence_class(np.array([0.0]), np.array([0.0]), split,
                                       {"a": "tuned", "b": "tested_unseen"})) == ["not_evaluated"]


def test_2_4_ac3_evidence_class_tie_goes_to_the_weaker_class():
    geoms = {"a": shapely.box(0, 0, 0.5, 1), "b": shapely.box(0.5, 0, 1, 1)}
    got = regions.evidence_class(np.array([0.0]), np.array([0.0]), geoms, {"a": "tested_unseen", "b": "tuned"})
    assert list(got) == ["tested_unseen"]


def test_2_4_ac3_six_regions_give_the_leads_counts():
    import json
    from pathlib import Path
    from shapely.geometry import shape
    gj = json.loads((Path(__file__).resolve().parents[2] / "contract" / "regions.geojson").read_text())
    geoms = {f["properties"]["region_id"]: shape(f["geometry"]) for f in gj["features"]}
    classes = {f["properties"]["region_id"]: f["properties"]["evidence_class"] for f in gj["features"]}
    cells = set()
    for g in geoms.values():
        x0, y0, x1, y1 = g.bounds
        cells |= {(x, y) for x in range(int(np.floor(x0)), int(np.ceil(x1))) for y in range(int(np.floor(y0)), int(np.ceil(y1)))
                  if shapely.area(shapely.intersection(shapely.box(x, y, x + 1, y + 1), g)) > 0}
    lon, lat = (np.array(v, float) for v in zip(*sorted(cells)))
    got = regions.evidence_class(lon, lat, geoms, classes)
    counts = {k: int((got == k).sum()) for k in regions.EVIDENCE_ORDER}
    assert counts == {"tuned": 225, "tested_unseen": 570, "reported_only": 14, "not_evaluated": 30}


def test_2_4_ac3_build_extent_snaps_to_whole_5deg_tiles():
    assert regions.tile_extent((94.8, -6.6, 107.0, 6.3)) == (90.0, -10.0, 110.0, 10.0)
    assert regions.tile_extent((20.0, -18.0, 35.0, -8.0)) == (20.0, -20.0, 35.0, -5.0)
    assert regions.is_tile_extent((90.0, -10.0, 110.0, 10.0)) and not regions.is_tile_extent((94.8, -6.6, 107.0, 6.3))
