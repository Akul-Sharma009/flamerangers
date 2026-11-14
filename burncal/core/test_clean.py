"""Story 2.3 cleaning maths (pure core): day/night, static cells, excluded_reason."""
import numpy as np
import pandas as pd

from burncal.core import clean


def test_2_3_ac1_daynight_recomputed_from_solar_zenith():
    # Equator, prime meridian, 21 Mar: noon is day, midnight is night.
    when = pd.to_datetime(["2020-03-21 12:00", "2020-03-21 00:00"])
    lat, lon = np.zeros(2), np.zeros(2)
    sza = clean.solar_zenith_deg(lat, lon, when)
    assert sza[0] < 5 and sza[1] > 150
    assert list(clean.daynight(lat, lon, when)) == ["D", "N"]


def test_2_3_ac1_day_rule_is_sza_below_85():
    # Sunrise-ish: find a time with sza just either side of 85 at the equator.
    when = pd.date_range("2020-03-21 05:00", "2020-03-21 07:00", freq="min")
    lat, lon = np.zeros(len(when)), np.zeros(len(when))
    sza = clean.solar_zenith_deg(lat, lon, when)
    dn = clean.daynight(lat, lon, when)
    assert ((sza < 85.0) == (dn == "D")).all() and {"D", "N"} <= set(dn)


def test_2_3_ac2_static_cell_id_is_30_arcsecond_grid():
    ids = clean.static_cell_id(np.array([0.0, 0.004, 0.0084]), np.array([0.0, 0.0, 0.0]))
    assert ids[0] == ids[1] and ids[1] != ids[2]
    assert ids[0] == 21600 * 100_000 + 10800


def _days(lon, lat, n, year, start="01-01"):
    d = pd.Timestamp(f"{year}-{start}") + pd.to_timedelta(np.arange(n), unit="D")
    return np.full(n, lon), np.full(n, lat), d


def test_2_3_ac2_static_rule_is_the_scored_rule():
    # Lead's decision (14 Nov): the harness rule, tuning years and MODIS + Suomi NPP only.
    assert tuple(clean.STATIC_YEARS) == (2014, 2016, 2017, 2020)
    assert set(clean.STATIC_SATELLITES) == {"AQUA", "TERRA", "SNPP"}


def test_2_3_ac2_static_cells_need_50_days_in_one_year():
    parts = [_days(10.0, 10.0, 50, 2016), _days(20.0, 20.0, 49, 2016),
             _days(30.0, 30.0, 30, 2016), _days(30.0, 30.0, 30, 2017)]  # split across years: no
    lon, lat, d = (np.concatenate(x) for x in zip(*parts))
    got = clean.static_cells(lon, lat, pd.DatetimeIndex(d))
    assert list(got) == list(clean.static_cell_id([10.0], [10.0])) and got.dtype == np.int64


def test_2_3_ac2_static_cells_count_a_day_once_across_satellites_and_ignore_other_years():
    lon, lat, d = _days(10.0, 10.0, 30, 2016)
    # three satellites hit the same 30 days: still 30 days
    got = clean.static_cells(np.tile(lon, 3), np.tile(lat, 3), pd.DatetimeIndex(np.tile(d, 3)))
    assert len(got) == 0
    for year in (2015, 2018, 2021, 2022):  # not tuning years
        lon2, lat2, d2 = _days(10.0, 10.0, 60, year)
        assert len(clean.static_cells(lon2, lat2, pd.DatetimeIndex(d2))) == 0
    for year in (2014, 2020):
        lon3, lat3, d3 = _days(10.0, 10.0, 60, year)
        assert len(clean.static_cells(lon3, lat3, pd.DatetimeIndex(d3))) == 1


def test_2_3_ac2_excluded_reason_offshore_beats_static_and_never_drops():
    cells = np.array([1, 2, 3, 2])
    on_land = np.array([True, True, False, False])
    static = np.array([2, 3], dtype=np.int64)
    out = clean.excluded_reason(on_land, cells, static)
    assert list(out) == ["none", "static", "offshore", "offshore"]
    assert len(out) == len(cells)
