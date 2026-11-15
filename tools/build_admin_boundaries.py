"""Builds the area picker's country and first-level-unit boundaries (Story 8.2).

Input: Natural Earth 1:10m vector, version 5.1.2 (public domain), the two GeoJSON files
  ne_10m_admin_0_countries.geojson and ne_10m_admin_1_states_provinces.geojson
  from https://github.com/nvkelso/natural-earth-vector (tag v5.1.2, folder geojson).
Output: web/src/area/admin/boundaries/index.json (names, codes, level) and one
  c-<ADM0_A3>.json per country holding that country's outline and its first-level units.

Each geometry is simplified (shapely, preserve_topology, TOLERANCE degrees), rounded to
DECIMALS places, and parts smaller than MIN_PART square degrees are dropped when the unit
has a larger part. Every output is checked valid. `wide` marks a unit whose longitude span
exceeds 180 degrees (the service refuses those as invalid_aoi); the flag is a build-time
fact written beside the unit, not a number the page computes.

Usage: uv run python -I tools/build_admin_boundaries.py <folder holding the two files>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.validation import make_valid

TOLERANCE = 0.02   # degrees, about 2 km
DECIMALS = 2
# A unit that does not survive that (a small island state) is redone at this finer pair.
FINE_TOLERANCE = 0.002
FINE_DECIMALS = 3
MIN_PART = 0.0008  # square degrees, about 10 km2 at the equator

OUT = Path(__file__).resolve().parent.parent / "web" / "src" / "area" / "admin" / "boundaries"


def clean(geom: BaseGeometry, tol: float = TOLERANCE, dec: int = DECIMALS, min_part: float = MIN_PART) -> BaseGeometry | None:
    g = geom.simplify(tol, preserve_topology=True)
    parts = [p for p in (g.geoms if hasattr(g, "geoms") else [g]) if p.geom_type == "Polygon"]
    big = [p for p in parts if p.area >= min_part]
    parts = big or parts
    from shapely.geometry import MultiPolygon, Polygon
    from shapely import set_precision
    out: BaseGeometry = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    out = set_precision(out, 10 ** -dec)
    if not out.is_valid:
        out = make_valid(out)
    polys = [p for p in (out.geoms if hasattr(out, "geoms") else [out]) if p.geom_type == "Polygon" and not p.is_empty]
    if not polys:
        return None
    return polys[0] if len(polys) == 1 else MultiPolygon(polys)


def rounded(g: BaseGeometry, dec: int = DECIMALS) -> dict:
    def r(x):
        return [r(i) for i in x] if isinstance(x, (list, tuple)) and x and isinstance(x[0], (list, tuple)) else [round(x[0], dec), round(x[1], dec)]
    m = mapping(g)
    return {"type": m["type"], "coordinates": r(m["coordinates"])}


def main(src: Path) -> None:
    a0 = json.loads((src / "ne_10m_admin_0_countries.geojson").read_text())["features"]
    a1 = json.loads((src / "ne_10m_admin_1_states_provinces.geojson").read_text())["features"]
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    index = []
    chunks: dict[str, dict] = {}

    def add(level: int, code: str, name: str, country: str, kind: str, geom: BaseGeometry) -> None:
        dec = DECIMALS
        g = clean(geom)
        if g is None or g.is_empty or not g.is_valid:
            dec = FINE_DECIMALS
            g = clean(geom, FINE_TOLERANCE, dec, 0.0)
        if g is None or g.is_empty or not g.is_valid:
            print("skipped", code, name)
            return
        b = g.bounds
        entry = {"code": code, "name": name, "level": level, "country": country, "kind": kind}
        if b[2] - b[0] > 180:
            entry["wide"] = True
        index.append(entry)
        chunks.setdefault(country, {})[code] = rounded(g, dec)

    for f in a0:
        p = f["properties"]
        add(0, p["ADM0_A3"], p["NAME"], p["ADM0_A3"], p["TYPE"] or "Country", shape(f["geometry"]))
    seen = set()
    for f in a1:
        p = f["properties"]
        code = p["adm1_code"]
        assert code not in seen, code
        seen.add(code)
        if p["adm0_a3"] not in chunks:
            continue
        name = p["name"] or p.get("name_en") or p.get("gn_name")
        if not name:
            continue
        add(1, code, name, p["adm0_a3"], p["type"] or "Region", shape(f["geometry"]))
    index.sort(key=lambda e: (e["level"], e["name"]))
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    for country, units in chunks.items():
        (OUT / f"c-{country}.json").write_text(json.dumps(units, separators=(",", ":")))
    total = sum(p.stat().st_size for p in OUT.glob("*.json"))
    print(f"{len(index)} units, {len(chunks)} chunks, {total/1e6:.2f} MB; index {(OUT/'index.json').stat().st_size/1e3:.0f} kB; wide: {sum(1 for e in index if e.get('wide'))}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
