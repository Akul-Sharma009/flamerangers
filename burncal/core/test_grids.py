"""Story 2.5: cell corners, flag thresholds and flag states (AD-9)."""
import numpy as np

from burncal.core import grids


def test_2_5_ac1_cell_corner_is_the_south_west_edge():
    x = np.array([101.0, 101.999, -0.25, -0.2500000001, 3.74])
    assert list(grids.sw_corner(x, 1.0)) == [101.0, 101.0, -1.0, -1.0, 3.0]
    assert list(grids.sw_corner(x, 0.25)) == [101.0, 101.75, -0.25, -0.25, 3.5]


def test_2_5_ac2_threshold_is_the_linear_90th_percentile_of_nine_years():
    hist = np.zeros((1, 9, 12))
    hist[0, :, 0] = [0, 1, 2, 3, 4, 5, 6, 7, 18]  # position 7.2: 7 + 0.2 * (18 - 7)
    got = grids.thresholds(hist)
    assert got.shape == (1, 12)
    assert abs(got[0, 0] - 9.2) < 1e-12 and got[0, 1] == 0.0


def test_2_5_ac3_flag_states():
    count = np.array([20.0, 15.0, 12.0, 9.99, 10.0, 0.0, 20.0, 10.0])
    thr = np.array([10.0, 10.0, 12.0, 0.0, 0.0, 0.0, 10.0, 9.9999999])
    ok = np.array([True, True, True, True, True, True, False, True])
    got = grids.flag_state(count, thr, ok)
    assert list(got) == ["strong", "strong", "none", "not_flaggable", "strong", "not_flaggable", "outside_record", "none"]


def test_2_5_ac3_flag_compares_after_rounding_to_6_decimals():
    # 12.0000004 rounds to 12.0, which is not strictly above 12
    got = grids.flag_state(np.array([12.0000004, 12.000001, 9.9999996]), np.array([12.0, 12.0, 0.0]), np.ones(3, bool))
    assert list(got) == ["none", "marginal", "strong"]


def test_2_5_ac3_marginal_below_1_5_times_the_threshold():
    got = grids.flag_state(np.array([14.0, 15.0, 14.999999]), np.array([10.0, 10.0, 10.0]), np.ones(3, bool))
    assert list(got) == ["marginal", "strong", "marginal"]


def test_2_5_ac3_reference_years_and_provisional():
    assert list(grids.reference_year(np.array([2002, 2003, 2011, 2012]))) == [False, True, True, False]
