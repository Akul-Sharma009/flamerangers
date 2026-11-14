"""Story 1.3 service stub: answers every contract endpoint from the fixture."""
import csv
import io
import json
from os import environ
import re
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

FIXTURE = Path(__file__).resolve().parents[2] / "contract" / "fixture"
MONTH = r"^\d{4}-\d{2}$"
LOCAL_ORIGIN = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"


def _csv(rows, columns):
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(columns)
    for row in rows:
        writer.writerow(["" if row.get(c) is None else row[c] for c in columns])
    return Response(out.getvalue(), media_type="text/csv")


def create_app() -> FastAPI:
    data = {n: json.loads((FIXTURE / f"{n}.json").read_text(encoding="utf-8"))
            for n in ("meta", "calendar", "cells", "hotspot_rows", "superseded")}
    app = FastAPI(title="burncal service (fixture stub)")

    origin = environ.get("WEB_ORIGIN")
    pattern = LOCAL_ORIGIN + (f"|{re.escape(origin)}" if origin else "")
    app.add_middleware(CORSMiddleware, allow_origin_regex=f"^(?:{pattern})$", allow_methods=["GET"])

    def answer(name, record_version):
        if record_version and record_version != data["meta"]["record_version"]:
            return JSONResponse(data["superseded"], status_code=410)
        return data[name]

    @app.get("/meta")
    def meta():
        return data["meta"]

    @app.get("/calendar")
    def calendar(aoi: str, start: str = Query(pattern=MONTH), end: str = Query(pattern=MONTH),
                 record_version: str | None = None, reference_start: int = 2003, reference_end: int = 2011):
        return answer("calendar", record_version)

    @app.get("/cells")
    def cells(aoi: str, month: str = Query(pattern=MONTH), record_version: str | None = None):
        return answer("cells", record_version)

    @app.get("/hotspots.csv")
    def hotspots(aoi: str, start: str, end: str, all_satellites: bool = False):
        rows = data["hotspot_rows"]["rows"]
        return _csv(rows, list(rows[0]))

    @app.get("/analytics.csv")
    def analytics(aoi: str, start: str = Query(pattern=MONTH), end: str = Query(pattern=MONTH)):
        months = data["calendar"]["months"]
        columns = [k for k, v in months[0].items() if not isinstance(v, (dict, list))]
        return _csv(months, columns)

    return app


app = create_app()
