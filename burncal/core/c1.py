"""C1: the frozen blend of 4A (Aqua-equivalent transfer table) and 1A (virtual Aqua).

Every number comes from params/c1_params.json and is never refitted. Pure numpy:
it reads no clock, no network and no other file.

Row weight of a VIIRS row = (1 - w) * r4A + w * (k * p + miss if the row anchors
its 1A footprint else 0), where w is the season weight of the row's UTC month.
Summing the weights of the rows in a cell and month gives the gridded prediction.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

PARAMS_FILE = Path(__file__).parent / "params" / "c1_params.json"

# Orbit geometry and footprint constants (sensor physics, not fitted).
R_EARTH = 6371.0
H_AQUA = 705.0
H_SNPP = 829.0
VIIRS_NADIR_TRACK = 0.375
MODIS_NADIR = 1.0
THETA_BIN_DEG = 2.5
PASS_GAP_MIN = 15


def _arrays(obj):
    """Turn {"dtype","shape","values"} nodes into numpy arrays, recursively."""
    if isinstance(obj, dict):
        if "dtype" in obj and "values" in obj:
            return np.asarray(obj["values"], dtype=obj["dtype"]).reshape(obj["shape"])
        return {k: _arrays(v) for k, v in obj.items()}
    return obj


def load_params() -> dict:
    raw = json.loads(PARAMS_FILE.read_text(encoding="utf-8"))
    c1 = _arrays(raw["C1"])
    m1 = c1["m1"]
    lk = m1["angle_lookup"]
    return {
        "w_season": float(c1["w_season"]),
        "w_off": float(c1["w_off"]),
        "season": {r: np.asarray(s, bool) for r, s in c1["season_months_in_state_by_region"].items()},
        "season_share": float(c1["season_share_fixed"]),
        "history_aqua_2003_2011": {r: np.asarray(v, float)
                                   for r, v in c1["history_aqua_month_totals_2003_2011_by_region"].items()},
        "regions_fit": list(m1["regions_fit"]),
        "table_by_region": c1["m4"]["table_by_region"],
        "pooled_table": c1["m4"]["pooled_table"],
        "model": m1["model"],
        "pooled_model": m1["pooled_model"],
        "per_det": {r: float(v) for r, v in m1["per_det_by_region"].items()},
        "miss": {r: float(v) for r, v in m1["miss_by_region"].items()},
        "pooled_per_det": float(m1["pooled_per_det"]),
        "pooled_miss": float(m1["pooled_miss"]),
        "pair": {(int(e["track_x100"]), int(e["scan_x100"])): float(e["vza_deg"]) for e in lk["pair"]},
        "track": {int(e["track_x100"]): float(e["vza_deg"]) for e in lk["track"]},
    }


# --- 4A -----------------------------------------------------------------------
def _month(time_utc) -> np.ndarray:
    """UTC calendar month 1..12."""
    t = np.asarray(time_utc).astype("datetime64[s]")
    return t.astype("datetime64[M]").astype(np.int64) % 12 + 1


def row_4a(params, region, time_utc, night) -> np.ndarray:
    tab = params["table_by_region"].get(region, params["pooled_table"])
    return tab[_month(time_utc) - 1, np.asarray(night, bool).astype(np.int64)]


# --- geometry -------------------------------------------------------------------
def _geometry(h, theta):
    s = np.clip((R_EARTH + h) / R_EARTH * np.sin(theta), -1, 1)
    zeta = np.arcsin(s)
    gamma = zeta - theta
    with np.errstate(invalid="ignore", divide="ignore"):
        rho = np.where(theta > 1e-9, R_EARTH * np.sin(gamma) / np.sin(theta), h)
    dzeta = (R_EARTH + h) / R_EARTH * np.cos(theta) / np.cos(zeta)
    stretch_scan = R_EARTH * (dzeta - 1.0) / h
    return rho / h, stretch_scan


_THETA = np.radians(np.linspace(0.0, 58.0, 5801))
_VIIRS_TRACK_RATIO, _ = _geometry(H_SNPP, _THETA)
_MODIS_TRACK_RATIO, _MODIS_SCAN_RATIO = _geometry(H_AQUA, _THETA)


def _viirs_view_angle(track_km):
    ratio = np.clip(np.asarray(track_km, float) / VIIRS_NADIR_TRACK, 1.0, _VIIRS_TRACK_RATIO[-1])
    return np.interp(ratio, _VIIRS_TRACK_RATIO, _THETA)


def _scan_from_vza(vza_rad):
    return np.arcsin(np.clip(R_EARTH / (R_EARTH + H_SNPP) * np.sin(vza_rad), -1, 1))


def view_angle(params, track_km, scan_km) -> np.ndarray:
    """Suomi NPP scan angle (rad): lookup on (track, scan), then track, then orbit geometry."""
    track = np.asarray(track_km, float)
    theta = _viirs_view_angle(track)
    t = np.round(track * 100).astype(int)
    s = np.round(np.asarray(scan_km, float) * 100).astype(int)
    pair, trk = params["pair"], params["track"]
    vza = np.array([pair.get((a, b), trk.get(a, np.nan)) for a, b in zip(t, s)], dtype=float)
    ok = np.isfinite(vza)
    theta[ok] = _scan_from_vza(np.radians(vza[ok]))
    return theta


def _modis_pixel(theta):
    th = np.clip(theta, 0, _THETA[-1])
    return (MODIS_NADIR * np.interp(th, _THETA, _MODIS_SCAN_RATIO),
            MODIS_NADIR * np.interp(th, _THETA, _MODIS_TRACK_RATIO))


# --- footprints -----------------------------------------------------------------
def _pass_id(t) -> np.ndarray:
    order = np.argsort(t, kind="stable")
    ts = t[order]
    brk = np.r_[True, np.diff(ts) > np.timedelta64(PASS_GAP_MIN, "m")]
    pid = np.empty(len(t), dtype=np.int64)
    pid[order] = np.cumsum(brk)
    return pid


def _footprints(params, time_utc, lat, lon, frp_mw, scan_km, track_km, include):
    """Returns fp_id (-1 for excluded rows), anchor, theta, and the footprint FRP sums."""
    n = len(lat)
    inc = np.ones(n, bool) if include is None else np.asarray(include, bool)
    idx = np.flatnonzero(inc)
    fp_id = np.full(n, -1, dtype=np.int64)
    anchor = np.zeros(n, bool)
    theta = np.zeros(n)
    if len(idx) == 0:
        return fp_id, anchor, theta, np.zeros(0)
    t = np.asarray(time_utc).astype("datetime64[s]")[idx]
    la, lo = np.asarray(lat, float)[idx], np.asarray(lon, float)[idx]
    frp = np.asarray(frp_mw, float)[idx]
    th = view_angle(params, np.asarray(track_km, float)[idx], np.asarray(scan_km, float)[idx])
    tbin = np.floor(np.degrees(th) / THETA_BIN_DEG).astype(np.int64)
    tc = np.radians((tbin + 0.5) * THETA_BIN_DEG)
    S, T = _modis_pixel(tc)
    x, y = lo * 111.32 * np.cos(np.radians(la)), la * 110.57
    gx = np.floor(x / S).astype(np.int64)
    gy = np.floor(y / T).astype(np.int64)
    keys = np.column_stack([_pass_id(t), tbin, gx, gy])
    _, member = np.unique(keys, axis=0, return_inverse=True)
    member = member.reshape(-1).astype(np.int64)
    nfp = int(member.max()) + 1
    frp_sum = np.bincount(member, weights=frp, minlength=nfp)
    # brightest member anchors the footprint; ties go to the lowest row index
    order = np.lexsort((-frp, member))
    first = order[np.r_[True, np.diff(member[order]) != 0]]
    fp_id[idx] = member
    anchor[idx[first]] = True
    theta[idx] = th
    return fp_id, anchor, theta, frp_sum


def footprints(time_utc, lat, lon, frp_mw, scan_km, track_km, include=None, *, params=None):
    """(fp_id, anchor): fp_id is -1 for excluded rows; anchor marks each footprint's representative row."""
    fp_id, anchor, _, _ = _footprints(params if params is not None else _default_params(),
                                      time_utc, lat, lon, frp_mw, scan_km, track_km, include)
    return fp_id, anchor


_PARAMS = None


def _default_params():
    global _PARAMS
    if _PARAMS is None:
        _PARAMS = load_params()
    return _PARAMS


# --- 1A -------------------------------------------------------------------------
def footprint_1a(params, region, time_utc, lat, lon, frp_mw, scan_km, track_km, include=None) -> np.ndarray:
    """Per row: the footprint's max(k*p + miss, 0) on its anchor row, 0 elsewhere."""
    fp_id, anchor, theta, frp_sum = _footprints(params, time_utc, lat, lon, frp_mw, scan_km, track_km, include)
    out = np.zeros(len(fp_id))
    a = np.flatnonzero(anchor)
    if len(a) == 0:
        return out
    X = np.column_stack([
        np.log(np.maximum(frp_sum[fp_id[a]], 0.01)),
        theta[a],
        np.log(np.maximum(np.asarray(scan_km, float)[a] * np.asarray(track_km, float)[a], 1e-3)),
    ])
    if region in params["regions_fit"]:
        m, gi = params["model"], params["regions_fit"].index(region)
        k, miss = params["per_det"][region], params["miss"][region]
    else:
        m, gi = params["pooled_model"], 0
        k, miss = params["pooled_per_det"], params["pooled_miss"]
    eta = ((X - m["mu"]) / m["sd"]) @ m["b"] + m["a"][gi]
    out[a] = np.clip(k / (1 + np.exp(-eta)) + miss, 0, None)
    return out


# --- blend ----------------------------------------------------------------------
def season_months(params, aqua_month_totals) -> np.ndarray:
    """Bool [12]: calendar months holding >= season_share of a region's 2003-2011 Aqua annual total.

    The frozen rule from C1; nothing is fitted. aqua_month_totals: 12 whole-region sums.
    """
    by_month = np.asarray(aqua_month_totals, float).reshape(-1, 12).sum(0)
    total = by_month.sum()
    if total <= 0:
        return np.zeros(12, bool)
    return by_month >= params["season_share"] * total


def blend_weight(params, region, calendar_month) -> float:
    """w_season in the region's fire-season months, w_off otherwise (tuning regions only)."""
    if region not in params["season"]:
        raise ValueError(f"no stored fire-season months for region {region!r}")
    return params["w_season"] if params["season"][region][int(calendar_month) - 1] else params["w_off"]


def row_weights(params, region, *, time_utc, lat, lon, frp_mw, scan_km, track_km, night,
                include=None, method="C1") -> np.ndarray:
    n = len(lat)
    inc = np.ones(n, bool) if include is None else np.asarray(include, bool)
    r4a = row_4a(params, region, time_utc, night)
    if method == "4A":
        w = np.zeros(n)
    elif method == "1A":
        w = np.ones(n)
    elif method == "C1":
        wm = np.array([blend_weight(params, region, m) for m in range(1, 13)])
        w = wm[_month(time_utc) - 1]
    else:
        raise ValueError(f"unknown method {method!r}")
    term = footprint_1a(params, region, time_utc, lat, lon, frp_mw, scan_km, track_km, include)
    return np.where(inc, (1.0 - w) * r4a + w * term, 0.0)
