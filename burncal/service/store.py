"""Story 2.6: read one published store version and count any area (AD-3, AD-11, AD-12).

The fast path sums whole 0.25-degree grid cells inside the area and adds the point rows of cells
that the area's edge cuts. It must equal the brute-force point sum (count_points).
"""
import json
import logging
from datetime import date
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import shapely

from burncal.core import grids

log = logging.getLogger("burncal.service")
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
    def __init__(self, path, fetch=None):
        self.path = Path(path)
        self._fetch = fetch  # downloads a record file on first use when the store was synced from a URL
        self.manifest = json.loads((self.path / "manifest.json").read_text(encoding="utf-8"))
        self.record_version = self.manifest["record_version"]
        self.data_through = date.fromisoformat(self.manifest["data_through"])
        ext = self.manifest.get("extents") or [{"name": "", "bbox": self.manifest["extent"]}]
        self.extents = {e["name"]: shapely.box(*e["bbox"]) for e in ext}
        self.n_months = (self.data_through.year - 2002) * 12 + self.data_through.month
        g = self.path / "grids"
        self.cells_1deg = pd.read_parquet(g / "cells_1deg.parquet")
        self.flags = pd.read_parquet(g / "flags_1deg.parquet")
        self.evidence = pd.read_parquet(self.path / "records" / "evidence_1deg.parquet")
        self.coverage_days = pd.read_parquet(self.path / "coverage_days.parquet")
        miss = pd.read_parquet(self.path / "missing_days.parquet")
        if "extent" not in miss:
            miss["extent"] = ""
        if "extent" not in self.coverage_days:
            self.coverage_days["extent"] = ""
        if "uncovered" not in miss:
            miss["uncovered"] = False
        self._missing = {e: set(zip(g["year"], g["month"])) for e, g in miss.groupby("extent")}
        unc = miss[miss["uncovered"].astype(bool).to_numpy()]  # an empty object column would select columns
        self._uncovered = {e: set(zip(g["year"], g["month"])) for e, g in unc.groupby("extent")}
        # Fine grid and points stay on disk; DuckDB reads them per request (memory does not grow with area).
        self._db = duckdb.connect()
        self._db.execute("SET threads = 2")
        self._db.execute("SET memory_limit = '512MB'")
        self._db.execute("SET TimeZone = 'UTC'")
        cells = (self.path / "grids" / "cells_025deg.parquet").as_posix()
        raws = ", ".join(f"raw_{s.lower()}::DOUBLE AS r_{s.lower()}" for s in SATELLITES)
        self._db.execute(f"""CREATE VIEW cells AS SELECT
            round(sw_lon / {FINE})::BIGINT AS ix, round(sw_lat / {FINE})::BIGINT AS iy,
            (round(sw_lon / {FINE})::BIGINT + 1000) * 10000 + (round(sw_lat / {FINE})::BIGINT + 1000) AS key,
            (year - 2002) * 12 + month - 1 AS k, "count"::DOUBLE AS cnt, {raws}
            FROM read_parquet('{cells}')""")
        pts = (self.path / "points.parquet").as_posix()
        cols = set(pq.read_schema(pts).names)
        if {"key", "k", "day"} <= cols:  # published since 15 Nov: sorted by key
            derived = "key, k, day"
        else:
            derived = (f"(floor(longitude / {FINE} + 1e-9)::BIGINT + 1000) * 10000 + "
                       f"(floor(latitude / {FINE} + 1e-9)::BIGINT + 1000) AS key, "
                       "(year(acq_datetime_utc) - 2002) * 12 + month(acq_datetime_utc) - 1 AS k, "
                       "day(acq_datetime_utc) AS day")
        sats = ", ".join(f"(satellite = '{s}')::DOUBLE AS r_{s.lower()}" for s in SATELLITES)
        self._db.execute(f"""CREATE VIEW pts AS SELECT {derived}, longitude AS lon, latitude AS lat,
            CASE WHEN feeds_record THEN weight ELSE 0 END AS cnt, {sats} FROM read_parquet('{pts}')""")
        keys = self._db.execute("SELECT DISTINCT key, ix, iy FROM cells").fetchnumpy()
        self._c_key, self._c_ix, self._c_iy = (np.asarray(keys[c], np.int64) for c in ("key", "ix", "iy"))

    def extent_of(self, geom):
        """The name of the extent holding the whole area, or None (outside coverage)."""
        return next((n for n, box in self.extents.items() if shapely.covers(box, geom)), None)

    def covers(self, geom) -> bool:
        return self.extent_of(geom) is not None

    def missing(self, extent) -> set:
        return self._missing.get(extent, set())

    def uncovered(self, extent) -> set:
        """Months of the record with no feeding day loaded: their count is null (outside_coverage)."""
        return self._uncovered.get(extent, set())

    def _records(self, extent) -> Path:
        named = extent and "extents" in self.manifest
        return self.path / "records" / extent if named else self.path / "records"

    def _record_files(self, extent, sats, y0, y1) -> list:
        d = self._records(extent)
        if self._fetch is None:
            return [p for p in sorted(d.glob("[A-Z]*_[0-9]*.parquet"))
                    if p.stem.rsplit("_", 1)[0] in sats and y0 <= int(p.stem.rsplit("_", 1)[1]) <= y1]
        want = [d / f"{s}_{y}.parquet" for s in sats for y in range(y0, y1 + 1)]
        return [p for p in want if p.exists() or self._fetch(p)]

    VALUE_COLUMNS = ["cnt"] + [f"r_{s.lower()}" for s in SATELLITES]

    def _sum(self, k, vals):
        """[n_months, 1 + len(SATELLITES)]: column 0 the harmonized count, then raw counts."""
        k = np.asarray(k, np.int64)
        ok = (k >= 0) & (k < self.n_months)
        return np.column_stack([np.bincount(k[ok], weights=vals[ok, j], minlength=self.n_months)
                                for j in range(vals.shape[1])])

    def _query(self, sql, **tables):
        con = self._db.cursor()
        con.execute("SET TimeZone = 'UTC'")  # a session setting: each cursor needs it, or months shift near midnight
        for name, keys in tables.items():
            con.register(name, pa.table({"key": pa.array(np.asarray(keys, np.int64))}))
        return con.execute(sql).fetchnumpy()

    def _points(self, keys=None, bbox=None, where="TRUE"):
        """Point rows of the given fine cells (or inside a bounding box), as numpy columns."""
        cols = ", ".join(["k", "lon", "lat", "day"] + self.VALUE_COLUMNS)
        if keys is not None:
            return self._query(f"SELECT {cols} FROM pts JOIN wanted USING (key) WHERE {where}", wanted=keys)
        x0, y0, x1, y1 = bbox
        return self._query(f"SELECT {cols} FROM pts WHERE lon BETWEEN {x0} AND {x1} AND lat BETWEEN {y0} AND {y1} AND {where}")

    def _vals(self, r):
        return np.column_stack([np.asarray(r[c], float) for c in self.VALUE_COLUMNS]) if len(r["k"]) else np.zeros((0, 6))

    def _cells_split(self, geom):
        """Keys of the fine cells wholly inside the area and of the cells its edge cuts."""
        shapely.prepare(geom)
        x0, y0, x1, y1 = geom.bounds
        near = ((self._c_ix >= _cell_ix(x0)) & (self._c_ix <= _cell_ix(x1))
                & (self._c_iy >= _cell_ix(y0)) & (self._c_iy <= _cell_ix(y1)))
        keys, ix, iy = self._c_key[near], self._c_ix[near], self._c_iy[near]
        boxes = shapely.box(ix * FINE, iy * FINE, (ix + 1) * FINE, (iy + 1) * FINE)
        covered = shapely.covers(geom, boxes)
        return keys[covered], keys[~covered & shapely.intersects(geom, boxes)]

    def _inside(self, geom, r):
        return shapely.intersects_xy(geom, np.asarray(r["lon"], float), np.asarray(r["lat"], float))

    def count_points(self, geom) -> np.ndarray:
        """Brute force: every point row inside the area (edge counts as inside)."""
        r = self._points(bbox=geom.bounds)
        m = self._inside(geom, r)
        return self._sum(np.asarray(r["k"])[m], self._vals(r)[m])

    def count(self, geom) -> np.ndarray:
        """Fast path: whole fine cells inside the area from the grid, cut cells from the points."""
        whole, cut = self._cells_split(geom)
        cols = ", ".join(f"sum({c}) AS {c}" for c in self.VALUE_COLUMNS)
        g = self._query(f"SELECT k, {cols} FROM cells JOIN wanted USING (key) GROUP BY k", wanted=whole)
        e = self._points(keys=cut)
        m = self._inside(geom, e)
        return self._sum(g["k"], self._vals(g)) + self._sum(np.asarray(e["k"])[m], self._vals(e)[m])

    def same_days(self, geom, month: int, day: int, years, brute: bool = False) -> tuple[float, list[float]]:
        """(count for days 1 to day of `month` in the data-through year, the same days in each of `years`).
        brute=True tests every point in the area's bounding box instead of using whole fine cells."""
        where = f"k % 12 = {month - 1} AND day <= {day}"
        if brute:
            r = self._points(bbox=geom.bounds, where=where)
            m = self._inside(geom, r)
            k, w = np.asarray(r["k"])[m], self._vals(r)[m, 0]
        else:
            whole, cut = self._cells_split(geom)
            a, e = self._points(keys=whole, where=where), self._points(keys=cut, where=where)
            m = self._inside(geom, e)
            k = np.concatenate([np.asarray(a["k"]), np.asarray(e["k"])[m]]).astype(np.int64)
            w = np.concatenate([self._vals(a)[:, 0], self._vals(e)[m, 0]])
        by_k = np.bincount(k, weights=w, minlength=self.n_months) if len(k) else np.zeros(self.n_months)
        kk = lambda y: (y - 2002) * 12 + month - 1  # noqa: E731
        return float(by_k[kk(self.data_through.year)]), [float(by_k[kk(y)]) for y in years]

    def hotspots(self, geom, start: date, end: date, *, all_satellites: bool, year: int | None):
        """Rows inside the area and the exact dates (every row, excluded ones too), or the years and
        row estimate when there are more than MAX_SYNC_ROWS and no single year was asked for."""
        import pyarrow.dataset as pads
        if year is not None:
            start, end = max(start, date(year, 1, 1)), min(end, date(year, 12, 31))
        sats = SATELLITES if all_satellites else FEEDING_SATELLITES
        files = self._record_files(self.extent_of(geom) or "", sats, start.year, end.year)
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

    def month_inputs(self, extent) -> dict:
        out = {}
        order = {s: i for i, s in enumerate(SATELLITES)}
        rows = self.coverage_days[self.coverage_days["extent"] == extent]
        for r in sorted(rows.itertuples(), key=lambda r: (order[r.satellite], r.quality)):
            out.setdefault((r.year, r.month), []).append(
                {"satellite": r.satellite, "quality": r.quality, "days": int(r.days), "feeds_record": bool(r.feeds_record)})
        return out


class Store:
    """The pointer file names the current version and the previous one; both are answered."""

    def __init__(self, root, fetch=None):
        self.root = Path(root)
        self._fetch_file = fetch
        self.pointer = self.root / "CURRENT.json"
        self._mtime, self._versions, self.current, self.previous = None, {}, None, None
        self.load_error = None
        self.refresh()

    def refresh(self) -> None:
        """Re-read the pointer when it changes. A version that fails to load is not switched to:
        the last good versions keep answering (AD-11), and the failure is kept in load_error."""
        try:
            mtime = self.pointer.stat().st_mtime_ns
            if mtime == self._mtime:
                return
            p = json.loads(self.pointer.read_text(encoding="utf-8"))
            keep = {p["record_version"], p["previous"]} - {None}
            versions = {v: self._versions.get(v) or Version(self.root / "versions" / v, self._fetch_file) for v in keep}
        except Exception as exc:  # noqa: BLE001
            self._mtime = mtime if "mtime" in locals() else self._mtime  # do not retry a broken pointer on every request
            self.load_error = f"{type(exc).__name__}: {exc}"
            if self.current is None:
                raise
            log.warning("store refresh failed; still serving %s (%s)", self.current, self.load_error)
            return
        self._versions, self.load_error = versions, None
        self.current, self.previous, self._mtime = p["record_version"], p["previous"], mtime

    def get(self, record_version: str) -> Version | None:
        self.refresh()
        return self._versions.get(record_version)

    def latest(self) -> Version:
        self.refresh()
        return self._versions[self.current]
