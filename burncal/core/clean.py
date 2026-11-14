"""Cleaning maths (Story 2.3). Pure: no file, clock or network access.

Rule "mark, never drop": nothing here removes a row; it only labels rows.
Ported from the frozen harness (tests/shared/processing.py), same constants.
"""
import numpy as np
import pandas as pd

STATIC_CELL_DEG = 1.0 / 120.0   # 30 arc-seconds, about 1 km
STATIC_MIN_DAYS = 50            # hotspot days in one year that make a cell persistent
SZA_DAY_LIMIT_DEG = 85.0        # day when solar zenith angle is below this
STATIC_YEARS = range(2014, 2022)


def solar_zenith_deg(lat, lon, when_utc) -> np.ndarray:
    """Solar zenith angle in degrees (NOAA low-accuracy formulas, ~0.1 degree)."""
    t = pd.DatetimeIndex(when_utc)
    hour = t.hour + t.minute / 60.0 + t.second / 3600.0
    g = 2 * np.pi / 365.0 * (t.day_of_year - 1 + (hour - 12) / 24.0)
    eqtime = 229.18 * (0.000075 + 0.001868 * np.cos(g) - 0.032077 * np.sin(g)
                       - 0.014615 * np.cos(2 * g) - 0.040849 * np.sin(2 * g))
    decl = (0.006918 - 0.399912 * np.cos(g) + 0.070257 * np.sin(g) - 0.006758 * np.cos(2 * g)
            + 0.000907 * np.sin(2 * g) - 0.002697 * np.cos(3 * g) + 0.00148 * np.sin(3 * g))
    tst = hour * 60.0 + eqtime + 4.0 * np.asarray(lon, dtype=float)
    ha = np.radians(tst / 4.0 - 180.0)
    la = np.radians(np.asarray(lat, dtype=float))
    cosz = np.sin(la) * np.sin(decl) + np.cos(la) * np.cos(decl) * np.cos(ha)
    return np.degrees(np.arccos(np.clip(np.asarray(cosz, dtype=float), -1, 1)))


def daynight(lat, lon, when_utc) -> np.ndarray:
    """"D" where the solar zenith angle is below 85 degrees, else "N"."""
    return np.where(solar_zenith_deg(lat, lon, when_utc) < SZA_DAY_LIMIT_DEG, "D", "N")


def static_cell_id(lon, lat) -> np.ndarray:
    """Id of the 30 arc-second cell holding each point."""
    ix = np.floor((np.asarray(lon, dtype=float) + 180.0) / STATIC_CELL_DEG + 1e-9).astype(np.int64)
    iy = np.floor((np.asarray(lat, dtype=float) + 90.0) / STATIC_CELL_DEG + 1e-9).astype(np.int64)
    return ix * 100_000 + iy


def static_cells(lon, lat, utc_date, years=STATIC_YEARS) -> np.ndarray:
    """Sorted int64 ids of persistent cells: hotspots on >= 50 distinct UTC days in one year.

    Only rows whose UTC year is in `years` count. All satellites are pooled and a
    day counts once per cell however many detections it had.
    """
    t = pd.DatetimeIndex(utc_date)
    if t.tz is not None:
        t = t.tz_convert("UTC").tz_localize(None)
    d = pd.DataFrame({"cell": static_cell_id(lon, lat), "year": t.year, "day": t.normalize()})
    d = d[d["year"].isin(list(years))].drop_duplicates(["cell", "year", "day"])
    if d.empty:
        return np.array([], dtype=np.int64)
    n = d.groupby(["cell", "year"]).size()
    cells = n[n >= STATIC_MIN_DAYS].index.get_level_values("cell").unique()
    return np.sort(np.asarray(cells, dtype=np.int64))


def excluded_reason(on_land, cell_ids, static) -> np.ndarray:
    """"offshore" where not on land, else "static" where the cell is persistent, else "none".

    Offshore takes precedence over static when both apply.
    """
    on_land = np.asarray(on_land, dtype=bool)
    is_static = np.isin(np.asarray(cell_ids), np.asarray(static))
    return np.where(~on_land, "offshore", np.where(is_static, "static", "none"))
