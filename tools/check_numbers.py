"""Story 4.5: the numbers-agree check. Exits 1 when any number disagrees.

Run against a published store: uv run python tools/check_numbers.py [store root]
For each search (Sumatra, an Amazon polygon, a Punjab box), over the whole record:
  - every analytics CSV row equals the matching /calendar month, field by field, as text;
  - for every complete month up to December 2021, the hotspot CSV's rows that feed the record
    and are not excluded number exactly the month's harmonized count (Aqua rows weigh 1).
A search outside the store's coverage is reported as not loaded, not as a failure.
"""
import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AMAZON = {"type": "Polygon", "coordinates": [[[-59.3, -11.2], [-55.1, -11.9], [-52.6, -8.4], [-54.9, -5.6],
                                              [-58.8, -6.7], [-59.3, -11.2]]]}
FIELDS = ("null_reason", "source", "complete", "validated_satellite", "reference_mean", "ratio_to_median",
          "anomaly_count", "anomaly_pct", "cells_flagged_strong", "cells_flagged_marginal", "cells_total",
          "reference_year", "provisional", "rank")


def _text(v):
    return "" if v is None else str(v).lower() if isinstance(v, bool) else str(v)


def _rows(text):
    lines = [line for line in text.splitlines() if not line.startswith("# ")]
    return list(csv.DictReader(io.StringIO("\n".join(lines))))


def _calendar(client, body):
    return client.post("/calendar", json=body).json()


def check(client, record_version, geometry, *, name):
    meta = client.get("/meta").json()
    body = {"record_version": record_version, "aoi": {"name": name, "geometry": geometry},
            "start": f'{meta["record_start"]}-01', "end": meta["data_through"]}
    first = client.post("/calendar", json=body)
    if first.status_code == 404:
        return {"search": name, "not_loaded": True, "failures": [], "months_compared": 0, "hotspot_months_compared": 0}
    cal = _calendar(client, body)
    failures = []
    rows = _rows(client.post("/analytics.csv", json=body).text)
    if len(rows) != len(cal["months"]):
        failures.append(f"{name}: analytics has {len(rows)} rows, calendar {len(cal['months'])} months")
    for row, m in zip(rows, cal["months"]):
        want = {"harmonized_count": m["count"], "historical_median": m["median"], "aoi_id": cal["aoi"]["aoi_id"],
                "partial_reasons": ";".join(m["partial_reasons"]), **{f: m[f] for f in FIELDS},
                **{f"raw_{k}": v for k, v in m["raw"].items()}}
        if f'{row["year"]}-{row["month"]}' != m["month"]:
            failures.append(f"{name} {m['month']}: analytics row is {row['year']}-{row['month']}")
        failures += [f"{name} {m['month']} {k}: calendar {_text(v)!r}, analytics {row[k]!r}"
                     for k, v in want.items() if row[k] != _text(v)]
    counts = {m["month"]: m["count"] for m in cal["months"] if m["complete"] and m["month"] <= "2021-12"}
    seen = {}
    for year in sorted({int(k[:4]) for k in counts}):
        r = client.post("/hotspots.csv", json={**body, "start": f"{year}-01-01", "end": f"{year}-12-31", "year": year})
        if r.status_code != 200:
            failures.append(f"{name} {year}: hotspots.csv answered {r.status_code}")
            continue
        for h in _rows(r.text):
            if h["feeds_record"] == "true" and h["excluded_reason"] == "none":
                seen[h["acq_datetime_utc"][:7]] = seen.get(h["acq_datetime_utc"][:7], 0) + 1
    failures += [f"{name} {k}: calendar {c}, hotspot rows {seen.get(k, 0)}" for k, c in counts.items() if seen.get(k, 0) != c]
    return {"search": name, "not_loaded": False, "failures": failures, "months_compared": len(cal["months"]),
            "hotspot_months_compared": len(counts)}


def exit_code(*reports):
    return 1 if any(r["failures"] for r in reports) else 0


def main(store_root):
    from fastapi.testclient import TestClient
    sys.path.insert(0, str(ROOT))
    from burncal.service.app import create_app
    client = TestClient(create_app(store_root))
    regions = {f["properties"]["region_id"]: f["geometry"]
               for f in json.loads((ROOT / "contract" / "regions.geojson").read_text(encoding="utf-8"))["features"]}
    rv = client.get("/meta").json()["record_version"]
    reports = [check(client, rv, regions["sumatra"], name="sumatra"), check(client, rv, AMAZON, name="amazon"),
               check(client, rv, regions["punjab"], name="punjab")]
    for r in reports:
        state = "not loaded" if r["not_loaded"] else f"{len(r['failures'])} failures"
        print(f"{r['search']}: {state}; {r['months_compared']} months, {r['hotspot_months_compared']} hotspot months")
        for f in r["failures"][:10]:
            print("  ", f)
    return exit_code(*reports)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "store" / "published"))
