"""Story 1.3 service stub: answers every contract endpoint (0.2.0) from the fixture."""
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
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, field_validator

CONTRACT = Path(__file__).resolve().parents[2] / "contract"
DEFAULT_ORIGINS = "http://localhost:5173"
PROBLEM = "application/problem+json"
VERSION = r"^\d{8}-[0-9a-f]{8}$"
HOTSPOT_COLUMNS = ["latitude", "longitude", "acq_datetime_utc", "satellite", "instrument", "confidence", "frp",
                   "daynight", "type", "quality", "feeds_record", "excluded_reason", "weight"]
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


def create_app() -> FastAPI:
    load = lambda p: json.loads((CONTRACT / "fixture" / p).read_text(encoding="utf-8"))  # noqa: E731
    meta, calendar, cells = load("meta.json"), load("calendar.json"), load("cells.json")
    hotspot_rows = load("hotspot_rows.json")["rows"]
    superseded, invalid = load("problems/version_superseded.json"), load("problems/invalid_aoi.json")
    text = (CONTRACT / "messages.yaml").read_text(encoding="utf-8")
    notes = dict(re.findall(r'^  (\w+): "(.*)"$', text, re.M))
    limits = [("counting_limits", notes[k]) for k in ("hotspot_definition", "monthly_validation_only", "flag_scale")]

    app = FastAPI(title="burncal service (fixture stub)")
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

    def header(req, title, extra):
        aoi, rs = calendar["aoi"], meta["record_switch"]
        span = lambda p: f'{p["start_year"]} to {p["end_year"]}'  # noqa: E731
        common = [("title", f"Harmonized burning activity calendar: {title}"), ("aoi_id", aoi["aoi_id"]),
                  ("aoi_name", req.aoi.name or ""), ("aoi_area_km2", aoi["area_km2"]),
                  ("aoi_geometry", json.dumps(req.aoi.geometry.model_dump(), separators=(",", ":"))),
                  ("date_range", f"{req.start} to {req.end}"), ("record_version", calendar["record_version"]),
                  ("data_through", calendar["data_through"]),
                  ("record_switch", f'Aqua MODIS counts through {rs["aqua_through"]}; '
                                    f'converted VIIRS counts from {rs["viirs_from"]}'),
                  ("count_unit", meta["unit_label"])]
        tail = limits + [("citation", "placeholder: dataset citations come from Story 6.1")]
        return common + extra(span) + tail

    @app.get("/meta")
    def get_meta():
        return meta

    @app.post("/calendar")
    def post_calendar(req: Range):
        return stale(req) or calendar

    @app.post("/cells")
    def post_cells(req: CellsRequest):
        return stale(req) or cells

    @app.post("/analytics.csv")
    def analytics(req: Range):
        if (bad := stale(req)):
            return bad
        cols = ["aoi_id", "year", "month", "harmonized_count", "null_reason", "source", "raw_aqua", "raw_terra",
                "raw_snpp", "raw_noaa20", "raw_noaa21", "inputs", "complete", "partial_reasons",
                "validated_satellite", "historical_median", "reference_mean", "ratio_to_median", "anomaly_count",
                "anomaly_pct", "cells_flagged_strong", "cells_flagged_marginal", "cells_total", "reference_year",
                "provisional", "rank"]
        rows = []
        for m in calendar["months"]:
            year, month = m["month"].split("-")
            inputs = ";".join(f'{i["satellite"]}:{i["quality"]}:{i["days"]}' + ("*" if i["feeds_record"] else "")
                              for i in m["inputs"])
            flat = {**m, "aoi_id": calendar["aoi"]["aoi_id"], "year": year, "month": month, "inputs": inputs,
                    "harmonized_count": m["count"], "historical_median": m["median"],
                    "partial_reasons": ";".join(m["partial_reasons"]),
                    **{f"raw_{k}": v for k, v in m["raw"].items()}}
            rows.append([flat[c] for c in cols])
        head = header(req, "monthly analytics", lambda span: [
            ("reference_period", span(calendar["reference_period"])),
            ("flag_reference_years", span(calendar["flag_reference_years"]))])
        return _csv(head, cols, rows)

    @app.post("/hotspots.csv")
    def hotspots(req: HotspotsRequest):
        if (bad := stale(req)):
            return bad
        rows = [r for r in hotspot_rows if req.all_satellites or r["feeds_record"]]
        head = header(req, "hotspots", lambda span: [
            ("row_filter", "all satellites" if req.all_satellites else "rows that feed the record"),
            ("row_count_note", ROW_COUNT_NOTE)])
        return _csv(head, HOTSPOT_COLUMNS, [[r[c] for c in HOTSPOT_COLUMNS] for r in rows])

    return app


app = create_app()
