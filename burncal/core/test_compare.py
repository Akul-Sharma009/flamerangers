"""Story 2.10: the error and bias measures of the test plan, for one count series against another."""
import numpy as np
import pytest

from burncal.core import compare


def test_2_10_ac1_mean_absolute_difference_and_bias():
    got = compare.difference_figures(np.array([3.0, 0.0, 5.0, 2.0]), np.array([1.0, 1.0, 5.0, 3.0]))
    assert got["mean_abs_difference"] == pytest.approx((2 + 1 + 0 + 1) / 4)
    assert got["bias_pct"] == pytest.approx(100 * (10 - 10) / 10)
    assert got["cell_months"] == 4
    assert got["test_total"] == 10.0 and got["reference_total"] == 10.0


def test_2_10_ac1_bias_is_test_minus_reference_over_reference():
    got = compare.difference_figures(np.array([6.0, 6.0]), np.array([4.0, 4.0]))
    assert got["bias_pct"] == pytest.approx(50.0)


def test_2_10_ac1_no_reference_hotspots_gives_no_bias():
    got = compare.difference_figures(np.array([1.0, 0.0]), np.array([0.0, 0.0]))
    assert got["bias_pct"] is None and got["mean_abs_difference"] == pytest.approx(0.5)


def test_2_10_ac1_series_must_align():
    with pytest.raises(ValueError):
        compare.difference_figures(np.array([1.0]), np.array([1.0, 2.0]))
