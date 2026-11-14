"""The service (contract 0.3.0).

With a published store (BURNCAL_STORE_ROOT, default store/published, holding CURRENT.json), /meta,
/calendar, /cells and both CSVs answer from the record (Stories 2.6, 2.7, 4.1). Without one, every endpoint answers from the
fixture (Story 1.3). Both CSVs are built from the same objects as the JSON answers (Stories 2.7, 4.1, 4.2).
"""
import csv
import io
import json
import re
from datetime import date
from os import environ
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import pandas as pd
import shapely
from shapely.geometry import shape
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, field_validator

from burncal.service import answers
from burncal.service.store import Store

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contract"
DEFAULT_STORE = ROOT / "store" / "published"
DEFAULT_ORIGINS = "http://localhost:5173"
PROBLEM = "application/problem+json"
VERSION = r"^\d{8}-[0-9a-f]{8}$"
HOTSPOT_COLUMNS = ["latitude", "longitude", "acq_datetime_utc", "satellite", "instrument", "confidence", "frp",
                   "daynight", "type", "quality", "feeds_record", "excluded_reason", "weight"]
ANALYTICS_COLUMNS = ["aoi_id", "year", "month", "harmonized_count", "null_reason", "source", "raw_aqua", "raw_terra",
                     "raw_snpp", "raw_noaa20", "raw_noaa21", "inputs", "complete", "partial_reasons",
                     "validated_satellite", "historical_median", "reference_mean", "ratio_to_median", "anomaly_count",
                     "anomaly_pct", "cells_flagged_strong", "cells_flagged_marginal", "cells_total", "reference_year",
                     "provisional", "rank"]
ROW_COUNT_NOTE = ("After December 2021 the number of rows differs from the harmonized count. The `weight` column "
                  "sums to the harmonized count over rows where `feeds_record` is true and `excluded_reason` is none.")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Geometry(Strict):
    type: Literal["Polygon", "MultiPolygon"]
    coordinates: list


class Aoi(Strict):
    name: str | None = Field(default=None, max_length=80)
    geometry: Geometry


class Range(Strict):
    record_version: str = Field(pattern=VERSION)
    aoi: Aoi
    start: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

    @field_validator("start", "end")
    @classmethod
    def real_date(cls, v):
        date.fromisoformat(v)
        return v


class HotspotsRequest(Range):
    all_satellites: StrictBool = False
    year: StrictInt | None = None


class CellsRequest(Strict):
    record_version: str = Field(pattern=VERSION)
    aoi: Aoi
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


def _cell(v):
    return "" if v is None else str(v).lower() if isinstance(v, bool) else v


def _csv(header, columns, rows):
    out = io.StringIO()
    for key, value in header:
        out.write(f"# {key}: {value}\n")
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(columns)
    writer.writerows([_cell(v) for v in row] for row in rows)
    return Response(out.getvalue(), media_type="text/csv")


def _regions():
    gj = json.loads((CONTRACT / "regions.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["region_id"]: (f["properties"]["name"], f["properties"]["evidence_class"],
                                           shape(f["geometry"])) for f in gj["features"]}


def _open_store(root, fetch=None):
    root = Path(root or environ.get("BURNCAL_STORE_ROOT", DEFAULT_STORE))
    return Store(root, fetch) if (root / "CURRENT.json").exists() else None


def _hotspot_cells(rows):
    """CSV cells of the hotspot rows: ISO UTC time with Z, empty type for NRT, unrounded weight."""
    if rows.empty:  # no record file in the range: header and column line, no rows (not a 500)
        return []
    t = rows["acq_datetime_utc"].dt.strftime("%Y-%m-%dT%H:%M:%SZ").to_numpy()
    typ = rows["type"].astype("Int64")
    cols = {c: rows[c].to_numpy() for c in HOTSPOT_COLUMNS}
    cols["acq_datetime_utc"], cols["type"] = t, [None if x is pd.NA else int(x) for x in typ]
    cols["weight"] = [repr(float(w)) for w in rows["weight"]]
    cols["feeds_record"] = [bool(x) for x in rows["feeds_record"]]
    cols["frp"] = [float(x) for x in rows["frp"]]
    return list(zip(*(cols[c] for c in HOTSPOT_COLUMNS)))


def create_app(store_root=None, fetch=None) -> FastAPI:
    """fetch: set when the store was synced from a URL (burncal.service.remote), to get record files on use."""
    store, regions = _open_store(store_root, fetch), _regions()
    load = lambda p: json.loads((CONTRACT / "fixture" / p).read_text(encoding="utf-8"))  # noqa: E731
    # The fixture answers are only needed without a store (they are not shipped to the host).
    meta, calendar, cells, hotspot_rows = (None, None, None, None) if store else (
        load("meta.json"), load("calendar.json"), load("cells.json"), load("hotspot_rows.json")["rows"])
    superseded, invalid = load("problems/version_superseded.json"), load("problems/invalid_aoi.json")
    text = (CONTRACT / "messages.yaml").read_text(encoding="utf-8")
    notes = dict(re.findall(r'^  (\w+): "(.*)"$', text, re.M))
    limits = [("counting_limits", notes[k]) for k in ("hotspot_definition", "monthly_validation_only", "flag_scale")]

    outside, too_large = load("problems/outside_coverage.json"), load("problems/too_large_for_sync.json")
    app = FastAPI(title="burncal service")
    # Comma-separated exact origins; not a secret.
    origins = [o.strip() for o in environ.get("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"])

    @app.exception_handler(RequestValidationError)
    def bad_request(request: Request, exc: RequestValidationError):
        loc = ".".join(str(p) for p in exc.errors()[0]["loc"] if p != "body") or "body"
        body = {**invalid, "status": 400, "detail": f"{loc}: {exc.errors()[0]['msg']}"}
        return JSONResponse(body, status_code=400, media_type=PROBLEM)

    def stale(req):
        if req.record_version != meta["record_version"]:
            return JSONResponse(superseded, status_code=410, media_type=PROBLEM)

    def problem(body, status, v, **extra):
        return JSONResponse({**body, "status": status, "record_version": v.record_version,
                             "data_through": v.data_through.isoformat(), **extra},
                            status_code=status, media_type=PROBLEM)

    def version_and_area(req):
        """(version, geometry, None) or (None, None, problem response)."""
        v = store.get(req.record_version)
        if v is None:
            cur = store.latest()
            return None, None, problem(superseded, 410, cur, current_record_version=cur.record_version)
        try:
            geom = shape(req.aoi.geometry.model_dump())
        except Exception:  # noqa: BLE001
            geom = None
        if geom is None or geom.is_empty or not geom.is_valid or geom.bounds[2] - geom.bounds[0] > 180:
            return None, None, JSONResponse({**invalid, "status": 400, "detail": "aoi.geometry: not a valid area"},
                                            status_code=400, media_type=PROBLEM)
        if not v.covers(geom):
            return None, None, problem(outside, 404, v)
        return v, geom, None

    def header(req, title, extra, v=None, geom=None):
        if v is None:
            aoi, rs = calendar["aoi"], meta["record_switch"]
            rv, dt = calendar["record_version"], calendar["data_through"]
        else:
            aoi = {"aoi_id": answers.core_aoi.aoi_id(geom), "area_km2": answers.r1(answers.core_aoi.area_km2(geom))}
            rs, rv, dt = answers.meta(v, regions)["record_switch"], v.record_version, v.data_through.isoformat()
        span = lambda p: f'{p["start_year"]} to {p["end_year"]}'  # noqa: E731
        common = [("title", f"Harmonized burning activity calendar: {title}"), ("aoi_id", aoi["aoi_id"]),
                  ("aoi_name", req.aoi.name or ""), ("aoi_area_km2", aoi["area_km2"]),
                  ("aoi_geometry", json.dumps(req.aoi.geometry.model_dump(), separators=(",", ":"))),
                  ("date_range", f"{req.start} to {req.end}"), ("record_version", rv),
                  ("data_through", dt),
                  ("record_switch", f'Aqua MODIS counts through {rs["aqua_through"]}; '
                                    f'converted VIIRS counts from {rs["viirs_from"]}'),
                  ("count_unit", answers.UNIT_LABEL)]
        tail = limits + [("citation", "placeholder: dataset citations come from Story 6.1")]
        return common + extra(span) + tail

    @app.get("/meta")
    def get_meta():
        return answers.meta(store.latest(), regions) if store else meta

    @app.post("/calendar")
    def post_calendar(req: Range):
        if not store:
            return stale(req) or calendar
        v, geom, bad = version_and_area(req)
        return bad or answers.calendar(v, geom, req.aoi.name, date.fromisoformat(req.start),
                                       date.fromisoformat(req.end), regions)

    @app.post("/cells")
    def post_cells(req: CellsRequest):
        if not store:
            return stale(req) or cells
        v, geom, bad = version_and_area(req)
        return bad or answers.cells(v, geom, int(req.month[:4]), int(req.month[5:]))

    @app.post("/analytics.csv")
    def analytics(req: Range):
        if store:
            v, geom, bad = version_and_area(req)
            if bad:
                return bad
            cal = answers.calendar(v, geom, req.aoi.name, date.fromisoformat(req.start),
                                   date.fromisoformat(req.end), regions)
        else:
            if (bad := stale(req)):
                return bad
            v, geom, cal = None, None, calendar
        rows = []
        for m in cal["months"]:
            year, month = m["month"].split("-")
            inputs = ";".join(f'{i["satellite"]}:{i["quality"]}:{i["days"]}' + ("*" if i["feeds_record"] else "")
                              for i in m["inputs"])
            flat = {**m, "aoi_id": cal["aoi"]["aoi_id"], "year": year, "month": month, "inputs": inputs,
                    "harmonized_count": m["count"], "historical_median": m["median"],
                    "partial_reasons": ";".join(m["partial_reasons"]),
                    **{f"raw_{k}": v for k, v in m["raw"].items()}}
            rows.append([flat[c] for c in ANALYTICS_COLUMNS])
        head = header(req, "monthly analytics", lambda span: [
            ("reference_period", span(cal["reference_period"])),
            ("flag_reference_years", span(cal["flag_reference_years"]))], v, geom)
        return _csv(head, ANALYTICS_COLUMNS, rows)

    @app.post("/hotspots.csv")
    def hotspots(req: HotspotsRequest):
        if store:
            v, geom, bad = version_and_area(req)
            if bad:
                return bad
            rows, large = v.hotspots(geom, date.fromisoformat(req.start), date.fromisoformat(req.end),
                                     all_satellites=req.all_satellites, year=req.year)
            if large:
                return problem(too_large, 413, v, **large)
            head = header(req, "hotspots", lambda span: [
                ("row_filter", "all satellites" if req.all_satellites else "rows that feed the record"),
                ("row_count_note", ROW_COUNT_NOTE)], v, geom)
            return _csv(head, HOTSPOT_COLUMNS, _hotspot_cells(rows))
        if (bad := stale(req)):
            return bad
        rows = [r for r in hotspot_rows if req.all_satellites or r["feeds_record"]]
        head = header(req, "hotspots", lambda span: [
            ("row_filter", "all satellites" if req.all_satellites else "rows that feed the record"),
            ("row_count_note", ROW_COUNT_NOTE)])
        return _csv(head, HOTSPOT_COLUMNS, [[r[c] for c in HOTSPOT_COLUMNS] for r in rows])

    return app


def __getattr__(name):
    """`burncal.service.app:app` (uvicorn, Dockerfile) is built on first use, not at import, so a host
    entry point can build its own app with create_app() without loading a store twice."""
    if name == "app":
        globals()["app"] = create_app()
        return globals()["app"]
    raise AttributeError(name)
