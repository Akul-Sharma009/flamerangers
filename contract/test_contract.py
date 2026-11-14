"""Story 1.2 contract tests.

1. The OpenAPI document is valid.
2. Every fixture validates against its schema.
3. The fixtures hold at least one instance of every enum value and problem code,
   plus the special cases the story names.
"""
import json
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

HERE = Path(__file__).parent
SPEC = yaml.safe_load((HERE / "openapi.yaml").read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("urn:contract", Resource(contents=SPEC, specification=DRAFT202012))

FIXTURE_SCHEMAS = {
    "meta.json": "Meta",
    "calendar.json": "Calendar",
    "calendar_no_land.json": "Calendar",
    "superseded.json": "VersionSuperseded",
    "cells.json": "Cells",
    "hotspot_rows.json": "HotspotRowList",
}


def load(name):
    return json.loads((HERE / "fixture" / name).read_text(encoding="utf-8"))


def validator(schema_name):
    return Draft202012Validator({"$ref": f"urn:contract#/components/schemas/{schema_name}"}, registry=REGISTRY)


def enum_values(schema_name):
    return set(SPEC["components"]["schemas"][schema_name]["enum"])


def all_fixtures():
    return {name: load(name) for name in FIXTURE_SCHEMAS}


def walk(obj):
    """Yield every (key, value) pair in a nested JSON object."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k, v
            yield from walk(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk(item)


def test_openapi_document_is_valid():
    validate(SPEC)


@pytest.mark.parametrize("fixture_name,schema_name", FIXTURE_SCHEMAS.items())
def test_fixture_validates_against_contract(fixture_name, schema_name):
    errors = sorted(validator(schema_name).iter_errors(load(fixture_name)), key=lambda e: e.path)
    assert not errors, "\n".join(f"{fixture_name}: {list(e.path)}: {e.message}" for e in errors)


def test_every_problem_code_appears_in_a_fixture():
    seen = {p["code"] for doc in all_fixtures().values() for p in doc.get("problems", [])}
    missing = enum_values("ProblemCode") - seen
    assert not missing, f"problem codes missing from fixtures: {sorted(missing)}"


def test_every_flag_state_evidence_class_partial_reason_quality_and_excluded_value_appears():
    fixtures = all_fixtures()
    seen = {}
    for name, doc in fixtures.items():
        for key, value in walk(doc):
            if isinstance(value, str):
                seen.setdefault(key, set()).add(value)
            if isinstance(value, list) and key == "partial_reasons":
                seen.setdefault("partial_reasons", set()).update(value)
    checks = {
        "flag_state": enum_values("FlagState"),
        "evidence_class": enum_values("EvidenceClass"),
        "partial_reasons": enum_values("PartialReason"),
        "quality": enum_values("Quality"),
        "excluded_reason": enum_values("Excluded"),
    }
    for key, values in checks.items():
        missing = values - seen.get(key, set())
        assert not missing, f"{key} values missing from fixtures: {sorted(missing)}"


def test_fixture_has_partial_current_month_null_before_2002_zero_month_and_zero_median():
    months = load("calendar.json")["months"]
    assert any(m["month"] == "2026-11" and "data_through" in m["partial_reasons"] for m in months)
    assert any(m["month"] < "2002-07" and m["count"] is None for m in months)
    assert any(m["count"] == 0 for m in months)
    assert any(m["median"] == 0 for m in months)


def test_fixture_has_a_noaa20_month():
    months = load("calendar.json")["months"]
    assert any(m["raw"]["noaa20"] is not None for m in months)


def test_meta_is_placeholder_and_states_no_validation_for_noaa20():
    meta = load("meta.json")
    assert meta["placeholder"] is True
    assert meta["noaa20_check"] is None
