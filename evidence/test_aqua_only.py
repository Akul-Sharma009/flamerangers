"""Story 5.5 checks on the evidence build: evidence.json holds every figure the Aqua-only
section reads, each equal to its field in the scoring file. The page itself is checked
in web/src/evidence/aquaOnly.test.tsx."""
import importlib.util
import json
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


def _load(name):
    spec = importlib.util.spec_from_file_location(f"evidence_{name}_55", HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = _load("build")
DOC = json.loads(build.OUT.read_text(encoding="utf-8"))
TABLES = {t["id"]: t for t in DOC["tables"]}
SOURCES = {s["set"]: s["file"] for s in DOC["sources"]}
TESTED = ["C1", "4A", "1A", "b", "a", "cmp"]
CHECKS = ["precision", "spearman", "peak_month", "season_length"]
# Where each set keeps its non-inferiority results (web/src/evidence/aquaOnly.ts).
PREFIXES = {
    "final": {"C1": "/decisions/final", "4A": "/decisions/final", "1A": "/decisions/final",
              "b": "/decisions/not used for the pick", "a": "/decisions/not used for the pick",
              "cmp": "/decisions/not used for the pick"},
    "selection": {a: "/decisions" for a in TESTED},
}


def _decisions(set_key):
    return {r["key"]: r["cells"]["value"] for r in TABLES[f"{set_key}.decisions"]["rows"]}


@pytest.mark.parametrize("set_key", ["final", "selection"])
def test_5_5_ac1_every_non_inferiority_check_is_in_evidence_json_as_its_file_holds_it(set_key):
    doc = build.load_scoring(SOURCES[set_key])
    held = _decisions(set_key)
    for a in TESTED:
        base = f"{PREFIXES[set_key][a]}/non_inferior_to_c/{a}"
        for ptr in [f"{base}/pass"] + [f"{base}/checks/{c}" for c in CHECKS]:
            fig = held[ptr]
            assert fig["source"] == {"file": SOURCES[set_key], "pointer": ptr}
            assert fig["value"] is build.resolve(doc, ptr)
            assert fig["display"] == ("yes" if fig["value"] else "no")


def test_5_5_ac1_on_the_final_set_every_method_failed_on_precision_alone():
    held = _decisions("final")
    for a in TESTED:
        base = f"{PREFIXES['final'][a]}/non_inferior_to_c/{a}"
        assert held[f"{base}/pass"]["value"] is False, a
        assert held[f"{base}/checks/precision"]["value"] is False, a
        for c in ["spearman", "peak_month", "season_length"]:
            assert held[f"{base}/checks/{c}"]["value"] is True, (a, c)


@pytest.mark.parametrize("set_key", ["final", "selection"])
def test_5_5_ac1_each_check_has_its_difference_against_c_with_interval(set_key):
    rows = {r["key"]: r["cells"] for r in TABLES[f"{set_key}.comparisons.terra"]["rows"]}
    for a in TESTED:
        for c in CHECKS:
            fig = rows[f"{a} vs c (Terra referee)"][c]
            assert fig["interval"] is not None and isinstance(fig["beyond_noise"], bool)
            assert fig["source"]["pointer"] == f"/comparisons/{a} vs c (Terra referee)/{c}/diff"


@pytest.mark.parametrize("set_key", ["final", "selection"])
def test_5_5_ac1_c_is_reported_in_full_at_every_scale_and_region(set_key):
    ids = [i for i in TABLES if i.startswith(f"{set_key}.terra.")]
    scales = {i.split(".")[2] if not i.startswith(f"{set_key}.terra.0.25") else "0.25" for i in ids}
    assert scales == {"0.25", "1", "region"}
    for i in ids:
        row = next(r for r in TABLES[i]["rows"] if r["key"] == "c")
        for key in ["precision", "recall", "spearman", "topk_overlap", "year_pair_share", "peak_month_error", "season_length_diff"]:
            assert row["cells"][key] is not None, (i, key)
        assert row["cells"]["mae"] is None  # (c) is not scored on count error
        assert "not scored on count error" in TABLES[i]["note"]


def test_5_5_ac2_gwis_is_recorded_as_cant_be_scored():
    fig = _decisions("final")["/decisions/final/gwis"]
    assert fig["source"] == {"file": SOURCES["final"], "pointer": "/decisions/final/gwis"}
    assert fig["value"].startswith("can't be scored")
    assert fig["display"] == fig["value"]
