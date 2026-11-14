"""Story 2.5: grid cells, flag thresholds and flag states (AD-9). Pure: no file, clock or network access."""
import numpy as np

HISTORY_YEARS = (2003, 2011)   # flag reference years
FLAG_PERCENTILE = 90.0
FLAG_MIN_COUNT = 10.0
STRONG_FACTOR = 1.5            # display tier only; not part of the scored rule
ROUND_DECIMALS = 6


def sw_corner(x, step: float) -> np.ndarray:
    """South-west edge of the cell holding x, same rule as the harness: floor(x / step + 1e-9)."""
    return np.floor(np.asarray(x, dtype=float) / step + 1e-9) * step


def thresholds(history) -> np.ndarray:
    """[n_cells, 12] 90th percentile over the history years (axis 1) by linear interpolation.

    history: [n_cells, n_years, 12] monthly counts of each whole cell.
    """
    return np.percentile(np.asarray(history, dtype=float), FLAG_PERCENTILE, axis=1)


def flag_state(count, threshold, in_record) -> np.ndarray:
    """strong, marginal, none, not_flaggable or outside_record per cell-month.

    Flagged = count strictly above the threshold and at least 10, both rounded to 6 decimals.
    """
    c = np.round(np.asarray(count, dtype=float), ROUND_DECIMALS)
    t = np.round(np.asarray(threshold, dtype=float), ROUND_DECIMALS)
    flagged = (c > t) & (c >= FLAG_MIN_COUNT)
    strong = flagged & (c >= np.round(STRONG_FACTOR * t, ROUND_DECIMALS))
    out = np.where(strong, "strong", np.where(flagged, "marginal",
                   np.where(c < FLAG_MIN_COUNT, "not_flaggable", "none")))
    return np.where(np.asarray(in_record, dtype=bool), out, "outside_record").astype(object)


def reference_year(year) -> np.ndarray:
    y = np.asarray(year)
    return (y >= HISTORY_YEARS[0]) & (y <= HISTORY_YEARS[1])
