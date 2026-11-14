"""Story 2.3 (c): compare cleaned Sumatra Aqua monthly counts with the harness's processed counts.

Run: uv run python -m burncal.pipeline.compare_tuning
Reads only local files (store/raw, store/static) and the frozen target CSV. Writes nothing.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from shapely.geometry import shape

from burncal.core import clean as core
from burncal.pipeline import clean as pclean
from burncal.pipeline import ingest

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "store" / "raw" / "sumatra"
LAND = ROOT / "store" / "static" / "ne_10m_land_v5.1.1.geojson"
REGIONS = ROOT / "contract" / "regions.geojson"
TARGET = ROOT / "burncal" / "core" / "params" / "sumatra_aqua_tuning_counts_1deg.csv"
TUNING_YEARS = (2014, 2016, 2017, 2020)
KEY = ["lon_sw", "lat_sw", "year", "month"]
HARNESS_SATELLITES = ("AQUA", "TERRA", "SNPP")


def cell_sw(values) -> np.ndarray:
    """South-west corner of the 1-degree cell, same rule as the harness (floor(x + 1e-9))."""
    return np.floor(np.asarray(values, dtype=float) + 1e-9)


def monthly_counts(df: pd.DataFrame, name: str = "count") -> pd.DataFrame:
    """Rows with longitude, latitude, acq_datetime_utc to counts per 1-degree cell and UTC month."""
    if len(df) == 0:
        return pd.DataFrame(columns=KEY + [name])
    t = pd.DatetimeIndex(df["acq_datetime_utc"])
    d = pd.DataFrame({"lon_sw": cell_sw(df["longitude"]), "lat_sw": cell_sw(df["latitude"]),
                      "year": t.year, "month": t.month})
    return d.groupby(KEY).size().rename(name).reset_index()


def compare_counts(ours: pd.DataFrame, target: pd.DataFrame) -> pd.DataFrame:
    """Outer join on KEY; a missing side is 0. Columns: KEY, ours, target, diff (ours - target)."""
    a = ours[KEY + ["count"]].rename(columns={"count": "ours"})
    b = target[KEY + ["aqua_count"]].rename(columns={"aqua_count": "target"})
    m = a.merge(b, on=KEY, how="outer").fillna({"ours": 0, "target": 0})
    m[["ours", "target"]] = m[["ours", "target"]].astype(np.int64)
    m["diff"] = m["ours"] - m["target"]
    return m.sort_values(KEY).reset_index(drop=True)


def summarize(cmp: pd.DataFrame, top: int = 10) -> dict:
    """Totals and the largest differences (by absolute value, ties by key)."""
    bad = cmp[cmp["diff"] != 0]
    worst = bad.assign(_a=bad["diff"].abs()).sort_values(["_a"] + KEY, ascending=[False] + [True] * 4)
    return {"rows_ours": int(cmp["ours"].sum()), "rows_target": int(cmp["target"].sum()),
            "cell_months": int(len(cmp)), "cell_months_differ": int(len(bad)),
            "total_abs_diff": int(bad["diff"].abs().sum()), "net_diff": int(cmp["diff"].sum()),
            "largest": worst.drop(columns="_a").head(top).reset_index(drop=True)}


def cause_of(in_region, excl_h, excl_p) -> np.ndarray:
    """Per row: why variant P counts it differently from H, or "same" when both agree.

    A row is counted by a variant when it is inside the region and its reason is "none".
    Land/sea and region membership are the same function in both variants, so the only
    row-level cause is the static mask. Anything else would show as "other".
    """
    in_region = np.asarray(in_region, dtype=bool)
    h = in_region & (np.asarray(excl_h) == "none")
    p = in_region & (np.asarray(excl_p) == "none")
    out = np.full(len(h), "same", dtype=object)
    out[h & ~p & (np.asarray(excl_p) == "static")] = "static_p_only"
    out[p & ~h & (np.asarray(excl_h) == "static")] = "static_h_only"
    out[(h != p) & (out == "same")] = "other"
    return out


def load_region(path=REGIONS):
    """Sumatra polygon: the first feature of the regions file."""
    gj = json.loads(Path(path).read_text(encoding="utf-8"))
    return shape(gj["features"][0]["geometry"])


def in_polygon(lon, lat, polygon) -> np.ndarray:
    return shapely.contains_xy(polygon, np.asarray(lon, float), np.asarray(lat, float))


def counted(df: pd.DataFrame, in_region, excluded) -> pd.DataFrame:
    """Aqua rows of the tuning years inside the region with excluded_reason "none"."""
    keep = np.asarray(in_region, dtype=bool) & (np.asarray(excluded) == "none")
    return df[keep]


def cause_table(cmp_p: pd.DataFrame, rows: pd.DataFrame, cause: np.ndarray, cmp_h: pd.DataFrame) -> pd.DataFrame:
    """One line per cell-month that differs in variant P: rows per cause and what is left over.

    `rows` has longitude, latitude, acq_datetime_utc (all Aqua tuning-year rows in the region);
    `cause` is cause_of() for each row. The leftover is the cell-month's variant H difference
    (H count minus target), i.e. what the two rules do not explain.
    """
    bad = cmp_p[cmp_p["diff"] != 0][KEY + ["diff"]]
    r = rows.assign(cause=cause)
    r = r[r["cause"] != "same"]
    cols = ["static_p_only", "static_h_only", "other"]
    if len(r):
        t = pd.DatetimeIndex(r["acq_datetime_utc"])
        r = pd.DataFrame({"lon_sw": cell_sw(r["longitude"]), "lat_sw": cell_sw(r["latitude"]),
                          "year": t.year, "month": t.month, "cause": r["cause"].values})
        piv = r.groupby(KEY + ["cause"]).size().unstack("cause", fill_value=0).reset_index()
    else:
        piv = pd.DataFrame(columns=KEY)
    out = bad.merge(piv, on=KEY, how="left")
    for c in cols:
        if c not in out:
            out[c] = 0
    out[cols] = out[cols].fillna(0).astype(np.int64)
    out = out.merge(cmp_h[KEY + ["diff"]].rename(columns={"diff": "h_diff"}), on=KEY, how="left")
    out["h_diff"] = out["h_diff"].fillna(0).astype(np.int64)
    # diff = (P - H) + (H - target); P - H = static_h_only - static_p_only + other signed away
    return out


def static_years(df: pd.DataFrame, cells, years=core.STATIC_YEARS) -> dict:
    """For each cell id: sorted years (within `years`) with fire on >= 50 distinct UTC days."""
    t = pd.DatetimeIndex(df["acq_datetime_utc"]).tz_convert("UTC").tz_localize(None)
    d = pd.DataFrame({"cell": core.static_cell_id(df["longitude"].values, df["latitude"].values),
                      "year": t.year, "day": t.normalize()})
    d = d[d["cell"].isin(list(cells)) & d["year"].isin(list(years))].drop_duplicates()
    n = d.groupby(["cell", "year"]).size()
    n = n[n >= core.STATIC_MIN_DAYS]
    out = {int(c): [] for c in cells}
    for (c, y) in n.index:
        out[int(c)].append(int(y))
    return {c: sorted(v) for c, v in out.items()}


def why_static_in_p(years_all, years_harness_sats, tuning=TUNING_YEARS) -> str:
    """Reason a cell is static under P but not under H, from the years that reach 50 days."""
    if any(y not in tuning for y in years_harness_sats):
        return "50 or more fire days in a year outside the tuning years"
    if years_all:
        return "50 or more fire days only when NOAA-20 detections are added"
    return "other"


def _fmt(df: pd.DataFrame) -> str:
    return df.to_string(index=False) if len(df) else "(none)"


def main() -> None:
    files = sorted(RAW.glob("MODIS_SP_*.csv")) + sorted(RAW.glob("VIIRS_SNPP_SP_*.csv")) \
        + sorted(RAW.glob("VIIRS_NOAA20_SP_*.csv"))
    print("files used:", len(files))
    for prefix in ("MODIS_SP", "VIIRS_SNPP_SP", "VIIRS_NOAA20_SP"):
        ys = sorted(int(f.stem.rsplit("_", 1)[1]) for f in files if f.stem.rsplit("_", 1)[0] == prefix)
        print(f"  {prefix}: {len(ys)} files" + (f", years {ys[0]}-{ys[-1]}, missing {sorted(set(range(ys[0], ys[-1] + 1)) - set(ys))}" if ys else ""))
    df = ingest.prefer_standard(ingest.ingest_csv_files(files))
    land = pclean.load_land(LAND)
    polygon = load_region(); shapely.prepare(polygon)
    target = pd.read_csv(TARGET)
    print("rows ingested:", len(df), "| target rows:", int(target["aqua_count"].sum()))

    lon, lat = df["longitude"].values, df["latitude"].values
    in_reg = in_polygon(lon, lat, polygon)
    land_ok = pclean.on_land(lon, lat, land)
    year = df["acq_datetime_utc"].dt.year.values

    # Variant H: tuning years, MODIS (Aqua+Terra) + Suomi NPP, rows in region and on land (harness rule).
    h_src = df["satellite"].isin(HARNESS_SATELLITES).values
    h_rows = df[h_src & in_reg & land_ok]
    static_h = core.static_cells(h_rows["longitude"].values, h_rows["latitude"].values,
                                 h_rows["acq_datetime_utc"], years=TUNING_YEARS)
    # Variant P: product rule, every ingested satellite, all rows, years 2014-2021.
    static_p = pclean.static_from(df)
    print(f"static cells: H {len(static_h)}, P {len(static_p)}, P not in H {len(np.setdiff1d(static_p, static_h))}, H not in P {len(np.setdiff1d(static_h, static_p))}")

    aqua = (df["satellite"] == "AQUA").values & np.isin(year, TUNING_YEARS)
    a = df[aqua]
    a_reg = in_reg[aqua]
    ids = core.static_cell_id(a["longitude"].values, a["latitude"].values)
    a_land = land_ok[aqua]
    ex_h = core.excluded_reason(a_land, ids, static_h)
    ex_p = core.excluded_reason(a_land, ids, static_p)
    print(f"Aqua rows in tuning years: {len(a)}, inside region: {int(a_reg.sum())}")

    cmps = {}
    for name, ex in (("H (harness rule)", ex_h), ("P (product rule)", ex_p)):
        c = compare_counts(monthly_counts(counted(a, a_reg, ex)), target)
        cmps[name[0]] = c
        s = summarize(c)
        print(f"\n== Variant {name} ==")
        print(f"rows compared: ours {s['rows_ours']}, target {s['rows_target']} (net {s['net_diff']:+d})")
        print(f"cell-months compared: {s['cell_months']}, differing: {s['cell_months_differ']}, total absolute difference: {s['total_abs_diff']}")
        print("largest differences:\n" + _fmt(s["largest"]))

    cause = cause_of(a_reg, ex_h, ex_p)
    vc = pd.Series(cause[a_reg]).value_counts()
    print("\nRow-level causes, variant P versus H (rows in region):\n" + vc.to_string())
    ct = cause_table(cmps["P"], a, cause, cmps["H"])
    print("\nCell-months differing in variant P, by cause (rows):")
    print(_fmt(ct))
    hit = core.static_cell_id(a["longitude"].values, a["latitude"].values)[a_reg & (cause == "static_p_only")]
    cells = sorted(set(int(x) for x in hit))
    y_all = static_years(df, cells)
    y_h = static_years(df[h_src], cells)
    print(f"\nCells that are static under P only and hold counted Aqua rows: {len(cells)}")
    for c in cells:
        ix, iy = c // 100_000, c % 100_000
        print(f"  cell at {ix * core.STATIC_CELL_DEG - 180:.4f}E {iy * core.STATIC_CELL_DEG - 90:.4f}N: years>=50d all sats {y_all[c]}, MODIS+SNPP {y_h[c]} -> {why_static_in_p(y_all[c], y_h[c])}")
    print("\nrows per cause over those cell-months:", {c: int(ct[c].sum()) for c in ("static_p_only", "static_h_only", "other")},
          "| leftover (variant H difference) abs:", int(ct["h_diff"].abs().sum()))


if __name__ == "__main__":
    main()
