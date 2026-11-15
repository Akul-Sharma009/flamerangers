"""Story 7.8 checks: the all-candidates table and the evidence check's cover of its numbers."""
import copy
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _load(name):
    spec = importlib.util.spec_from_file_location(f"evidence_{name}", HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = _load("build")
DOC = json.loads(build.OUT.read_text(encoding="utf-8"))
TABLE = next(t for t in DOC["tables"] if t["id"] == "selection.candidates")
SINGLES = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "M1", "M2", "M3", "M4", "M5"]
COMBINED = ["C1", "C2", "C3"]


def _scoring(name):
    return json.loads((build.SCORING / name).read_text(encoding="utf-8"))


def test_7_8_ac1_one_row_for_each_of_13_candidates_and_3_combinations():
    assert [r["key"] for r in TABLE["rows"]] == SINGLES + COMBINED
    singles = _scoring(build.SELECTION_SINGLES)
    assert set(SINGLES) <= set(singles["approaches"])
    sources = {s["file"] for s in DOC["sources"]}
    assert build.SELECTION_SINGLES in sources
    for r in TABLE["rows"]:
        assert set(r["cells"]) == {"error_vs_b", "precision", "recall"}
        assert all(c is not None for c in r["cells"].values()), r["key"]


def test_7_8_ac2_every_number_is_the_field_it_names():
    for r in TABLE["rows"]:
        file = build.SELECTION_SINGLES if r["key"] in SINGLES else Path(
            json.loads((build.SCORING / build.FINAL).read_text())["meta"]["selection_result"]
        ).name
        doc = _scoring(file)
        for key, fig in r["cells"].items():
            assert fig["source"]["file"] == file
            assert build.resolve(doc, fig["source"]["pointer"]) == fig["value"]
    assert build.check_figures(DOC) == []


def test_7_8_ac2_the_check_catches_a_changed_candidate_number():
    bad = copy.deepcopy(DOC)
    next(t for t in bad["tables"] if t["id"] == "selection.candidates")["rows"][5]["cells"]["precision"]["value"] = 0.999
    problems = build.check_figures(bad)
    assert any("selection.candidates" in p and "3B" in p for p in problems)


def test_7_8_ac2_the_check_catches_a_pointer_to_another_candidate():
    bad = copy.deepcopy(DOC)
    cell = next(t for t in bad["tables"] if t["id"] == "selection.candidates")["rows"][0]["cells"]["recall"]
    cell["source"]["pointer"] = cell["source"]["pointer"].replace("1A", "1B")
    assert any("selection.candidates" in p for p in build.check_figures(bad))
