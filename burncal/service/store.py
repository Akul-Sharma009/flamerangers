"""Story 2.6: read one published store version and count any area (AD-3, AD-11, AD-12).

The fast path sums whole 0.25-degree grid cells inside the area and adds the point rows of cells
that the area's edge cuts. It must equal the brute-force point sum (count_points).
"""
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import shapely

from burncal.core import grids

SATELLITES = ("AQUA", "TERRA", "SNPP", "NOAA20", "NOAA21")
FEEDING_SATELLITES = ("AQUA", "SNPP", "NOAA20")
FINE = 0.25
MAX_SYNC_ROWS = 250_000      # above this, /hotspots.csv answers too_large_for_sync with an estimate
CSV_BYTES_PER_ROW = 110      # measured on Sumatra rows; only used for the estimate
HOTSPOT_COLUMNS = ["latitude", "longitude", "acq_datetime_utc", "satellite", "instrument", "confidence", "frp",
                   "daynight", "type", "quality", "feeds_record", "excluded_reason", "weight"]


def _key(ix, iy):
    return (np.asarray(ix, np.int64) + 1000) * 10_000 + (np.asarray(iy, np.int64) + 1000)


def _cell_ix(x):
    return np.floor(np.asarray(x, float) / FINE + 1e-9).astype(np.int64)


class Version:
    def __init__(self, path):
        self.path = Path(path)
        self.manifest = json.loads((self.path / "manifest.json").read_text(encoding="utf-8"))
        self.record_version = self.manifest["record_version"]
        self.data_through = date.fromisoformat(self.manifest["data_through"])
        self.extent = shapely.box(*self.manifest["extent"])
        self.n_months = (self.data_through.year - 2002) * 12 + self.data_through.month
        g = self.path / "grids"
        self.cells_1deg = pd.read_parquet(g / "cells_1deg.parquet")
        self.flags = pd.read_parquet(g / "flags_1deg.parquet")
        self.evidence = pd.read_parquet(self.path / "records" / "evidence_1deg.parquet")
        self.coverage_days = pd.read_parquet(self.path / "coverage_days.parquet")
        self.missing = set(map(tuple, pd.read_parquet(self.path / "missing_days.parquet").to_numpy().tolist()))
        c = pd.read_parquet(g / "cells_025deg.parquet")
        self._c_ix, self._c_iy = _cell_ix(c["sw_lon"] + FINE / 2) , _cell_ix(c["sw_lat"] + FINE / 2)
        self._c_key = _key(self._c_ix, self._c_iy)
        self._c_k = self._month_index(c["year"], c["month"])
        self._c_vals = self._values(c["count"].to_numpy(float), [c[f"raw_{s.lower()}"].to_numpy() for s in SATELLITES])
        p = pd.read_parquet(self.path / "points.parquet")
        self._p_lon, self._p_lat = p["longitude"].to_numpy(float), p["latitude"].to_numpy(float)
        self._p_key = _key(_cell_ix(self._p_lon), _cell_ix(self._p_lat))
        t = p["acq_datetime_utc"]
        self._p_k = self._month_index(t.dt.year, t.dt.month)
        self._p_day = t.dt.day.to_numpy()
        sat = p["satellite"].to_numpy()
        self._p_vals = self._values(np.where(p["feeds_record"].to_numpy(), p["weight"].to_numpy(float), 0.0),
                                    [(sat == s).astype(float) for s in SATELLITES])

    @staticmethod
    def _month_index(year, month):
        return (np.asarray(year, np.int64) - 2002) * 12 + np.asarray(month, np.int64) - 1

    @staticmethod
    def _values(count, raws):
        return np.column_stack([count] + list(raws))

    def _sum(self, k, vals):
        """[n_months, 1 + len(SATELLITES)]: column 0 the harmonized count, then raw counts."""
        ok = (k >= 0) & (k < self.n_months)
        return np.column_stack([np.bincount(k[ok], weights=vals[ok, j], minlength=self.n_months)
                                for j in range(vals.shape[1])])

    def count_points(self, geom) -> np.ndarray:
        """Brute force: every point row inside the area (edge counts as inside)."""
        inside = shapely.intersects_xy(geom, self._p_lon, self._p_lat)
        return self._sum(self._p_k[inside], self._p_vals[inside])

    def _cells_split(self, geom):
        """Keys of the fine cells wholly inside the area and of the cells its edge cuts."""
        shapely.prepare(geom)
        x0, y0, x1, y1 = geom.bounds
        near = ((self._c_ix >= _cell_ix(x0)) & (self._c_ix <= _cell_ix(x1))
                & (self._c_iy >= _cell_ix(y0)) & (self._c_iy <= _cell_ix(y1)))
        keys, first = np.unique(self._c_key[near], return_index=True)
        ix, iy = self._c_ix[near][first], self._c_iy[near][first]
        boxes = shapely.box(ix * FINE, iy * FINE, (ix + 1) * FINE, (iy + 1) * FINE)
        covered = shapely.covers(geom, boxes)
        return keys[covered], keys[~covered & shapely.intersects(geom, boxes)]

    def inside(self, geom) -> np.ndarray:
        """Point rows inside the area: every point of a covered cell, and points of cut cells tested one by one."""
        whole, cut = self._cells_split(geom)
        mask = np.isin(self._p_key, whole)
        edge = np.isin(self._p_key, cut)
        edge[edge] = shapely.intersects_xy(geom, self._p_lon[edge], self._p_lat[edge])
        return mask | edge

    def same_days(self, geom, month: int, day: int, years, mask=None) -> tuple[float, list[float]]:
        """(count for days 1 to day of `month` in the data-through year, the same days in each of `years`)."""
        m = self.inside(geom) if mask is None else mask
        sel = m & (self._p_day <= day) & ((self._p_k % 12) == month - 1)
        by_k = np.bincount(self._p_k[sel], weights=self._p_vals[sel, 0], minlength=self.n_months)
        k = lambda y: (y - 2002) * 12 + month - 1  # noqa: E731
        return float(by_k[k(self.data_through.year)]), [float(by_k[k(y)]) for y in years]

    def count(self, geom) -> np.ndarray:
        """Fast path: whole fine cells inside the area from the grid, cut cells from the points."""
        whole, cut = self._cells_split(geom)
        g = np.isin(self._c_key, whole)
        edge = np.isin(self._p_key, cut)
        edge[edge] = shapely.intersects_xy(geom, self._p_lon[edge], self._p_lat[edge])
        return self._sum(self._c_k[g], self._c_vals[g]) + self._sum(self._p_k[edge], self._p_vals[edge])

    def hotspots(self, geom, start: date, end: date, *, all_satellites: bool, year: int | None):
        """Rows inside the area and the exact dates (every row, excluded ones too), or the years and
        row estimate when there are more than MAX_SYNC_ROWS and no single year was asked for."""
        import pyarrow.dataset as pads
        if year is not None:
            start, end = max(start, date(year, 1, 1)), min(end, date(year, 12, 31))
        sats = SATELLITES if all_satellites else FEEDING_SATELLITES
        files = [p for p in sorted((self.path / "records").glob("[A-Z]*_[0-9]*.parquet"))
                 if p.stem.rsplit("_", 1)[0] in sats and start.year <= int(p.stem.rsplit("_", 1)[1]) <= end.year]
        if not files or start > end:
            return pd.DataFrame(columns=HOTSPOT_COLUMNS), None
        x0, y0, x1, y1 = geom.bounds
        f = ((pads.field("utc_date") >= start) & (pads.field("utc_date") <= end)
             & (pads.field("longitude") >= x0) & (pads.field("longitude") <= x1)
             & (pads.field("latitude") >= y0) & (pads.field("latitude") <= y1))
        if not all_satellites:
            f = f & (pads.field("feeds_record") == True)  # noqa: E712
        ds = pads.dataset(files, format="parquet")
        pos = ds.to_table(columns=["longitude", "latitude", "utc_date"], filter=f).to_pandas()
        inside = shapely.intersects_xy(geom, pos["longitude"].to_numpy(), pos["latitude"].to_numpy())
        n = int(inside.sum())
        if n > MAX_SYNC_ROWS and year is None:
            years = sorted({d.year for d in pos["utc_date"][inside]})
            return None, {"estimated_rows": n, "estimated_megabytes": round(n * CSV_BYTES_PER_ROW / 1e6, 1), "years": years}
        rows = ds.to_table(columns=HOTSPOT_COLUMNS, filter=f).to_pandas()[inside]
        return rows.sort_values("acq_datetime_utc", kind="stable").reset_index(drop=True), None

    def cells_1deg_of(self, geom) -> pd.DataFrame:
        """The 1-degree cells of the extent that the area overlaps with positive area."""
        ev = self.evidence
        boxes = shapely.box(ev["sw_lon"], ev["sw_lat"], ev["sw_lon"] + 1, ev["sw_lat"] + 1)
        hit = shapely.area(shapely.intersection(boxes, geom)) > 0
        return ev[hit].reset_index(drop=True)

    def flag_counts(self, cells: pd.DataFrame) -> pd.DataFrame:
        """Per (year, month): strong and marginal 1-degree cells among `cells`, each on the whole cell (AD-9)."""
        f = self.flags.merge(cells[["sw_lon", "sw_lat"]], on=["sw_lon", "sw_lat"])
        return (f.assign(strong=f["flag_state"] == "strong", marginal=f["flag_state"] == "marginal")
                .groupby(["year", "month"])[["strong", "marginal"]].sum())

    def month_inputs(self) -> dict:
        out = {}
        order = {s: i for i, s in enumerate(SATELLITES)}
        for r in sorted(self.coverage_days.itertuples(), key=lambda r: (order[r.satellite], r.quality)):
            out.setdefault((r.year, r.month), []).append(
                {"satellite": r.satellite, "quality": r.quality, "days": int(r.days), "feeds_record": bool(r.feeds_record)})
        return out


class Store:
    """The pointer file names the current version and the previous one; both are answered."""

    def __init__(self, root):
        self.root = Path(root)
        self.pointer = self.root / "CURRENT.json"
        self._mtime, self._versions, self.current, self.previous = None, {}, None, None
        self.refresh()

    def refresh(self) -> None:
        mtime = self.pointer.stat().st_mtime_ns
        if mtime == self._mtime:
            return
        p = json.loads(self.pointer.read_text(encoding="utf-8"))
        keep = {p["record_version"], p["previous"]} - {None}
        self._versions = {v: self._versions.get(v) or Version(self.root / "versions" / v) for v in keep}
        self.current, self.previous, self._mtime = p["record_version"], p["previous"], mtime

    def get(self, record_version: str) -> Version | None:
        self.refresh()
        return self._versions.get(record_version)

    def latest(self) -> Version:
        self.refresh()
        return self._versions[self.current]
