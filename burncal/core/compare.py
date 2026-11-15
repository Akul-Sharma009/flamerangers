"""Story 2.10: the test plan's error and bias measures (criterion 1), for one count series against another.

Error: mean absolute difference per cell-month. Bias: (total test - total reference) / total reference.
Pure: arrays in, unrounded numbers out; the service rounds once.
"""
import numpy as np


def difference_figures(test, reference) -> dict:
    """test and reference: aligned counts, one value per cell-month (zeros included)."""
    t, r = np.asarray(test, float), np.asarray(reference, float)
    if t.shape != r.shape:
        raise ValueError(f"series do not align: {t.shape} against {r.shape}")
    t_sum, r_sum = float(t.sum()), float(r.sum())
    return {
        "mean_abs_difference": float(np.abs(t - r).mean()) if t.size else 0.0,
        "bias_pct": 100.0 * (t_sum - r_sum) / r_sum if r_sum > 0 else None,
        "cell_months": int(t.size),
        "test_total": t_sum,
        "reference_total": r_sum,
    }
