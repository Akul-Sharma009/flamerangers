"""Story 2.6: AOI area, id and scale cautions (pure core)."""
import shapely

from burncal.core import aoi


def test_2_6_ac5_area_of_a_1deg_box_at_the_equator():
    assert abs(aoi.area_km2(shapely.box(100, 0, 101, 1)) - 12363.6) < 15  # about 111.2 km x 111.2 km


def test_2_6_ac5_scale_cautions():
    assert aoi.scale_cautions(shapely.box(100, 0, 102, 2)) == []
    assert aoi.scale_cautions(shapely.box(100, 0, 100.5, 0.5)) == ["scale_below_1deg"]
    assert aoi.scale_cautions(shapely.box(100, 0, 100.1, 0.1)) == ["scale_below_1deg", "scale_below_025deg"]
    # a long thin strip with the area of more than a 1-degree box is not cautioned
    assert aoi.scale_cautions(shapely.box(100, 0, 110, 0.2)) == []


def test_2_6_ac3_aoi_id_ignores_ring_start_and_direction():
    a = shapely.Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
    b = shapely.Polygon([(1, 1), (0, 1), (0, 0), (1, 0)][::-1])
    assert aoi.aoi_id(a) == aoi.aoi_id(b) and len(aoi.aoi_id(a)) == 16
    assert aoi.aoi_id(a) != aoi.aoi_id(shapely.box(0, 0, 1, 2))
