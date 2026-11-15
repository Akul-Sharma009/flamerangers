"""Story 1.2 contract tests.

- The OpenAPI document is valid, and every fixture validates against it.
- The fixtures hold every enum value and problem code, and the special cases the story names.
- Schemas are closed: a misspelt field fails.
- Served numbers are already rounded, and fields that must agree do agree.
- messages.yaml, regions.geojson, CSV_SPEC.md and evidence.schema.json match the contract.
"""

import copy
import json
import re
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

HERE = Path(__file__).parent
FIXTURE = HERE / "fixture"
SPEC = yaml.safe_load((HERE / "openapi.yaml").read_text(encoding="utf-8"))
SCHEMAS = SPEC["components"]["schemas"]
REGISTRY = Registry().with_resource("urn:contract", Resource(contents=SPEC, specification=DRAFT202012))
MESSAGES = yaml.safe_load((HERE / "messages.yaml").read_text(encoding="utf-8"))

# The file name decides the schema. A fixture that matches none fails the test below.
SCHEMA_BY_PREFIX = {
    "problems/": "Problem",
    "meta": "Meta",
    "calendar": "Calendar",
    "raw_splice": "RawSplice",
    "cells": "Cells",
    "season_to_date": "SeasonToDate",  # before "season": the first matching prefix wins
    "season": "Season",
    "hotspot_rows": "HotspotRowList",
    "world_cells": "WorldCells",  # Story 8.9
}
REQUEST_ONLY = {"AoiInput", "CalendarRequest", "CellsRequest", "SeasonRequest", "HotspotsCsvRequest", "SeasonToDateRequest", "WorldCellsRequest"}
ONE_DECIMAL = {"count", "cumulative", "band_low", "band_high", "median", "reference_mean", "total", "anomaly_count", "count_to_date", "same_days_median",
               "difference", "mean_count", "threshold", "area_km2", "estimated_megabytes", "mean_abs_difference", "bias_pct", "low", "high", "counts"}
FOUR_DECIMAL = {"p_value"}
UNROUNDED = {"weight", "latitude", "longitude", "frp"}


def schema_for(path: Path) -> str:
    rel = path.relative_to(FIXTURE).as_posix()
    if rel.startswith("problems/"):
        return "Problem"
    for prefix, name in SCHEMA_BY_PREFIX.items():
        if path.name.startswith(prefix):
            return name
    raise AssertionError(f"no schema is mapped for fixture {rel}")


FIXTURES = {p.relative_to(FIXTURE).as_posix(): json.loads(p.read_text(encoding="utf-8"))
            for p in sorted(FIXTURE.rglob("*.json"))}


def validator(schema_name):
    return Draft202012Validator({"$ref": f"urn:contract#/components/schemas/{schema_name}"}, registry=REGISTRY,
                                format_checker=Draft202012Validator.FORMAT_CHECKER)


def walk(obj, key=None):
    """Yield every (key, value) pair in a nested JSON value, lists flattened under their key."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, k)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk(item, key)
    else:
        yield key, obj


def refs_in(schema):
    """Names of the component schemas a property schema points at, directly or through items / oneOf."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            yield schema["$ref"].rsplit("/", 1)[-1]
        for key, value in schema.items():
            if key != "properties":  # a nested object's own properties are separate sites
                yield from refs_in(value)
    elif isinstance(schema, list):
        for item in schema:
            yield from refs_in(item)


def properties_everywhere(schema, owner):
    """Yield (owner schema name, property name, property schema) for every property, nested ones included."""
    if isinstance(schema, dict):
        for name, prop in schema.get("properties", {}).items():
            yield owner, name, prop
        for value in schema.values():
            yield from properties_everywhere(value, owner)
    elif isinstance(schema, list):
        for item in schema:
            yield from properties_everywhere(item, owner)


def enum_sites():
    """Every (property name, allowed values) in a response schema, for named and inline enums alike."""
    for owner, body in SCHEMAS.items():
        if owner in REQUEST_ONLY:
            continue
        for _, name, prop in properties_everywhere(body, owner):
            if "enum" in prop:
                yield name, set(prop["enum"])
            for ref in refs_in(prop):
                if "enum" in SCHEMAS.get(ref, {}):
                    yield name, set(SCHEMAS[ref]["enum"])


def seen_values():
    seen = {}
    for doc in FIXTURES.values():
        for key, value in walk(doc):
            if isinstance(value, str):
                seen.setdefault(key, set()).add(value)
    return seen


# ---- the document and the fixtures ----

def test_openapi_document_is_valid():
    validate(SPEC)


@pytest.mark.parametrize("name", FIXTURES)
def test_fixture_validates_against_contract(name):
    errors = sorted(validator(schema_for(FIXTURE / name)).iter_errors(FIXTURES[name]), key=lambda e: list(e.path))
    assert not errors, "\n".join(f"{name}: {list(e.path)}: {e.message}" for e in errors[:10])


@pytest.mark.parametrize("name", FIXTURES)
def test_a_misspelt_field_fails(name):
    doc = copy.deepcopy(FIXTURES[name])
    doc["not_a_contract_field"] = 1
    assert list(validator(schema_for(FIXTURE / name)).iter_errors(doc)), f"{name}: an unknown field was accepted"


def test_every_enum_value_appears_in_a_fixture():
    seen = seen_values()
    sites = list(enum_sites())
    assert len(sites) > 15, "the enum scan found too little; it is probably broken"
    missing = {}
    for prop, allowed in sites:
        gone = allowed - seen.get(prop, set())
        if gone:
            missing.setdefault(prop, set()).update(gone)
    assert not missing, f"enum values with no fixture instance: { {k: sorted(v) for k, v in missing.items()} }"


def test_every_problem_code_has_a_fixture_with_its_status():
    statuses = dict(re.findall(r"(\w+) (\d{3})", SPEC["components"]["responses"]["Problem"]["description"]))
    assert set(statuses) == set(SCHEMAS["ProblemCode"]["enum"])
    for code, status in statuses.items():
        doc = FIXTURES[f"problems/{code}.json"]
        assert (doc["code"], doc["status"]) == (code, int(status))
    assert "current_record_version" in FIXTURES["problems/version_superseded.json"]


def test_the_special_cases_the_story_names():
    months = FIXTURES["calendar.json"]["months"]
    by_month = {m["month"]: m for m in months}
    now = by_month["2026-11"]
    assert "data_through" in now["partial_reasons"] and not now["complete"]
    assert any(i["satellite"] == "NOAA20" and i["feeds_record"] for i in now["inputs"]) and not now["validated_satellite"]
    assert by_month["2002-06"]["count"] is None and by_month["2002-06"]["null_reason"] == "outside_record"
    assert {r for m in months for r in m["partial_reasons"]} == set(SCHEMAS["PartialReason"]["enum"])
    small = FIXTURES["examples/calendar_small_savanna_area.json"]["months"]
    assert any(m["count"] == 0 for m in small), "no zero month"
    assert any(m["median"] == 0 and m["no_typical_activity"] and m["ratio_to_median"] is None for m in small), "no zero median"
    assert FIXTURES["meta.json"]["placeholder"] is True
    assert FIXTURES["meta.json"]["noaa20_check"] is None
    assert FIXTURES["examples/meta_after_noaa20_check.json"]["noaa20_check"]["validated_against_aqua"] is False


def test_the_ruler_has_one_mark_per_reference_year():
    for name in ("calendar.json", "examples/calendar_small_savanna_area.json"):
        card = FIXTURES[name]["current_month"]
        ref = card["reference_period"]
        assert [d["year"] for d in card["same_days_by_year"]] == list(range(ref["start_year"], ref["end_year"] + 1))
        assert (card["ratio"] is None) == card["no_typical_activity"]


# ---- requests ----

def test_every_request_carries_record_version_and_can_be_superseded():
    for path, item in SPEC["paths"].items():
        if path == "/meta":
            continue
        op = item["post"]
        body = op["requestBody"]["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[-1]
        assert "record_version" in SCHEMAS[body]["required"], path
        assert "410" in op["responses"], path
        for status in ("400", "404", "422", "429"):
            assert status in op["responses"], f"{path} has no {status}"


# ---- numbers ----

def decimals(x):
    return len(repr(x).split(".")[1]) if isinstance(x, float) and "." in repr(x) and "e" not in repr(x) else 0


def test_served_numbers_are_already_rounded():
    bad = []
    for name, doc in FIXTURES.items():
        for key, value in walk(doc):
            if isinstance(value, float) and key not in UNROUNDED:
                limit = 1 if key in ONE_DECIMAL else 4 if key in FOUR_DECIMAL else 2
                if decimals(value) > limit:
                    bad.append((name, key, value))
    assert not bad, bad[:10]


def test_month_fields_agree_with_each_other():
    for name, doc in FIXTURES.items():
        if not name.split("/")[-1].startswith("calendar"):
            continue
        years = {int(m["month"][:4]) for m in doc["months"]}
        assert len(doc["months"]) == 12 * len(years), f"{name}: rows must be whole years"
        assert [y["year"] for y in doc["year_totals"]] == sorted(years)
        for m in doc["months"]:
            where = f"{name} {m['month']}"
            assert (m["count"] is None) == (m["null_reason"] is not None) == (m["source"] is None), where
            blocking = {"record_start", "data_through", "missing_days"} & set(m["partial_reasons"])
            if m["count"] is not None:
                assert m["complete"] == (not blocking), where
                assert (m["colour_class"] is not None), where
                assert m["cells_flagged_strong"] + m["cells_flagged_marginal"] <= m["cells_total"], where
            if m["no_typical_activity"]:
                assert m["ratio_to_median"] is None, where
            if m["rank"] is not None:
                assert m["complete"], f"{where}: only complete months are ranked"
        for y in doc["year_totals"]:
            if y["rank"] is not None:
                assert y["complete"], f"{name} {y['year']}: only complete years are ranked"


def test_cells_fixture_matches_the_calendar_month():
    cells = FIXTURES["cells.json"]
    month = next(m for m in FIXTURES["calendar.json"]["months"] if m["month"] == cells["month"])
    states = [c["flag_state"] for c in cells["cells"]]
    assert states.count("strong") == month["cells_flagged_strong"]
    assert states.count("marginal") == month["cells_flagged_marginal"]
    assert len(states) == month["cells_total"]
    for c in cells["cells"]:
        if c["flag_state"] in ("strong", "marginal"):
            assert c["count"] > c["threshold"] and c["count"] >= 10
        if c["flag_state"] == "strong":
            assert c["count"] >= 1.5 * c["threshold"]
        if c["flag_state"] == "not_flaggable":
            assert c["count"] < 10


def test_8_9_world_cells_fixture_is_the_cells_fixture_for_its_covered_cells():
    """Story 8.9: one implementation per number, so a cell reads the same in /cells and /world_cells."""
    world, cells = FIXTURES["world_cells.json"], FIXTURES["cells.json"]
    assert world["month"] == cells["month"] and world["coverage"] == FIXTURES["meta.json"]["coverage"]
    by = {(c["sw_lon"], c["sw_lat"]): c for c in cells["cells"]}
    assert {(c["sw_lon"], c["sw_lat"]) for c in world["cells"]} == set(by)
    for c in world["cells"]:
        a = by[(c["sw_lon"], c["sw_lat"])]
        assert all(c[k] == a[k] for k in ("flag_state", "count", "threshold", "evidence_class", "provisional", "reference_year"))


# ---- the other contract files ----

def snake(name):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def test_messages_cover_every_code_and_label():
    assert set(MESSAGES["problems"]) == set(SCHEMAS["ProblemCode"]["enum"])
    assert set(MESSAGES["cautions"]) == set(SCHEMAS["CautionCode"]["enum"])
    labelled = {name: body for name, body in SCHEMAS.items()
                if "enum" in body and name not in ("ProblemCode", "CautionCode")}
    assert set(MESSAGES["labels"]) == {snake(n) for n in labelled}
    for name, body in labelled.items():
        assert set(MESSAGES["labels"][snake(name)]) == set(body["enum"]), name
    for section in ("problems", "cautions", "notes", "client"):
        assert all(isinstance(v, str) and v.strip() for v in MESSAGES[section].values()), section
    text = (HERE / "messages.yaml").read_text(encoding="utf-8").lower()
    body = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    assert not re.search(r"\bfires?\b", body), 'messages must say "hotspots", never "fires"'


def test_regions_match_meta_coverage():
    regions = json.loads((HERE / "regions.geojson").read_text(encoding="utf-8"))
    props = {f["properties"]["region_id"]: f["properties"] for f in regions["features"]}
    coverage = {r["region_id"]: r for r in FIXTURES["meta.json"]["coverage"]["regions"]}
    assert set(props) == set(coverage) and len(props) == 7
    for rid, p in props.items():
        assert p["evidence_class"] == coverage[rid]["evidence_class"] and p["name"] == coverage[rid]["name"]
    assert [rid for rid, p in props.items() if p["default"]] == ["sumatra"]
    for f in regions["features"]:
        ring = f["geometry"]["coordinates"][0]
        assert f["geometry"]["type"] == "Polygon" and ring[0] == ring[-1]


def test_csv_spec_names_every_hotspot_column():
    spec = (HERE / "CSV_SPEC.md").read_text(encoding="utf-8")
    for column in SCHEMAS["HotspotRow"]["properties"]:
        assert f"`{column}`" in spec, column


def test_evidence_schema_is_a_valid_schema():
    schema = json.loads((HERE / "evidence.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    empty = {"schema_version": "0.1.0", "sources": [], "claims": [], "tables": []}
    assert not list(Draft202012Validator(schema).iter_errors(empty))
