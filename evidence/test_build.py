"""Story 5.2 checks: the evidence build, the figure check and the wording check."""
import copy
import importlib.util
import json
from pathlib import Path

import pytest
import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def _load(name):
    spec = importlib.util.spec_from_file_location(f"evidence_{name}", HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = _load("build")
wording = _load("wording")
DOC = json.loads(build.OUT.read_text(encoding="utf-8"))
TABLES = {t["id"]: t for t in DOC["tables"]}


def _write(tmp_path, doc):
    path = tmp_path / "evidence.json"
    path.write_text(build.dumps(doc), encoding="utf-8")
    return path


def _first_table_figure(doc, table_id, column):
    for row in next(t for t in doc["tables"] if t["id"] == table_id)["rows"]:
        if row["cells"].get(column) is not None:
            return row["cells"][column]
    raise AssertionError(f"no figure in {table_id}.{column}")


# --- AC1: evidence.json holds every number the view shows, each traced to a field ---

def test_5_2_ac1_written_file_is_current_valid_and_true():
    """Schema, manifest hashes, every figure against its source, and a fresh build."""
    assert build.check() == []


def test_5_2_ac1_every_figure_names_a_field_in_a_listed_scoring_file():
    manifest = json.loads((build.SCORING / "MANIFEST.json").read_text(encoding="utf-8"))["files"]
    listed = {s["file"] for s in DOC["sources"]}
    assert listed <= set(manifest)
    figures = list(build.iter_figures(DOC))
    assert len(figures) > 1000
    for where, fig in figures:
        assert fig["source"]["file"] in listed, where
        assert fig["source"]["pointer"].startswith("/"), where
    assert build.check_figures(DOC) == []


def test_5_2_ac1_sources_are_the_three_sets():
    # Story 2.10's NOAA-20 file (reported only) joined them on 15 Nov; it is not a scored set.
    sets = {s["set"]: s for s in DOC["sources"]}
    assert set(sets) == {"selection", "final", "reported_only", "noaa20_check"}
    final = json.loads((build.SCORING / build.FINAL).read_text(encoding="utf-8"))
    assert sets["selection"]["file"] == Path(final["meta"]["selection_result"]).name
    assert "used once" in sets["final"]["label"]
    assert sets["reported_only"]["run_id"] == "9d5e7bf1d0d6"  # Story 5.6 names this run


def test_5_2_ac1_claims_are_claims_yaml_word_for_word():
    claims = yaml.safe_load(build.CLAIMS_FILE.read_text(encoding="utf-8"))["claims"]
    assert [c["id"] for c in DOC["claims"]] == [c["id"] for c in claims]
    for built, source in zip(DOC["claims"], claims):
        assert built["text"] == " ".join(source["text"].split())
        assert built["used_for_pick"] is source["used_for_pick"]
        assert [f["display"] for f in built["figures"]] == [f["display"] for f in source["figures"]]


@pytest.mark.parametrize("set_key", ["final", "selection", "reported_only"])
def test_5_2_ac1_head_to_head_tables_cover_story_5_4(set_key):
    """C1, 4A, 1A, (a), (b) and the comparator, per region and pooled, at each scale,
    with error, bias, precision with flag counts, rank, top months and years, peak
    month and season length."""
    source = next(s for s in DOC["sources"] if s["set"] == set_key)
    regions = [r for r in json.loads((build.SCORING / source["file"]).read_text(encoding="utf-8"))["blocks"] if r != "total"]
    for scale in ("0.25", "1", "region"):
        for region in ["pooled"] + regions:
            table = TABLES[f"{set_key}.approaches.{scale}.{region}"]
            assert [r["key"] for r in table["rows"]] == build.APPROACHES
            c1 = next(r for r in table["rows"] if r["key"] == "C1")["cells"]
            wanted = ["flags_raised", "flags_true", "precision", "spearman", "topk_overlap", "year_pair_share", "peak_month_error", "season_length_diff"]
            wanted += ["mae", "bias"] if region != "pooled" else ["abs_bias_median"]
            for key in wanted:
                if key == "precision" and c1["flags_raised"]["value"] == 0:
                    assert c1[key] is None  # no flags raised: precision is undefined in the file
                else:
                    assert c1[key] is not None, (table["id"], key)
    comparator = next(r for r in TABLES[f"{set_key}.approaches.1.pooled"]["rows"] if r["key"] == "cmp")
    assert comparator["label"] == "comparator, never picked"


@pytest.mark.parametrize("set_key", ["final", "selection", "reported_only"])
def test_5_2_ac1_differences_carry_interval_and_beyond_noise(set_key):
    table = TABLES[f"{set_key}.comparisons"]
    keys = {r["key"] for r in table["rows"]}
    assert {"C1 vs b", "C1 vs a", "C1 vs 4A", "C1 vs 1A", "C1 vs cmp", "4A vs b", "1A vs b"} <= keys
    assert "intervals may be somewhat narrow on close calls" in table["note"].lower()
    for row in table["rows"]:
        for fig in row["cells"].values():
            if fig is not None:
                assert fig["interval"] is not None and isinstance(fig["beyond_noise"], bool)
    blocks = TABLES[f"{set_key}.run"]
    assert any(r["key"] == "/blocks/total" for r in blocks["rows"])


@pytest.mark.parametrize("set_key", ["final", "selection", "reported_only"])
def test_5_2_ac1_aqua_only_against_the_terra_referee_covers_story_5_5(set_key):
    pooled = TABLES[f"{set_key}.terra.1.pooled"]
    assert [r["key"] for r in pooled["rows"]] == build.APPROACHES + ["c"]
    comparisons = TABLES[f"{set_key}.comparisons.terra"]
    assert {r["key"] for r in comparisons["rows"]} == {f"{a} vs c (Terra referee)" for a in build.APPROACHES}
    decisions = {r["key"] for r in TABLES[f"{set_key}.decisions"]["rows"]}
    assert any("non_inferior_to_c" in k and k.endswith("/C1/checks/precision") for k in decisions)


def test_5_2_ac1_final_decisions_include_the_pick_rule_and_gwis():
    rows = {r["key"]: r["cells"]["value"] for r in TABLES["final.decisions"]["rows"]}
    assert rows["/decisions/final/margin/pass"]["display"] == "no"
    assert rows["/decisions/final/margin/single"]["value"] == "4A"
    assert rows["/decisions/final/beats_b/C1/pass"]["display"] == "no"
    assert "can't be scored" in rows["/decisions/final/gwis"]["value"]


def test_5_2_ac1_years_are_shown_by_period_without_totals():
    """Story 5.4 asks for 2014–2017 and 2018–2021 separately. The files give each year
    with its period and no period totals, so the build shows the years, labelled."""
    rows = TABLES["final.by_year"]["rows"]
    periods = {r["cells"]["period"]["value"] for r in rows}
    assert periods == {"early", "late"}
    for row in rows:
        year = int(row["key"].rsplit("/", 1)[1])
        assert row["cells"]["period"]["value"] == ("early" if year <= 2017 else "late")


# --- AC2: a number that differs from its source fails the build -------------------

@pytest.mark.parametrize("where", ["table value", "claim value", "interval", "beyond noise", "display", "pointer"])
def test_5_2_ac2_a_figure_that_differs_from_its_source_fails(tmp_path, where):
    doc = copy.deepcopy(DOC)
    if where == "table value":
        _first_table_figure(doc, "final.approaches.1.pooled", "precision")["value"] += 1e-9
    elif where == "claim value":
        doc["claims"][0]["figures"][0]["value"] = 0.28
    elif where == "interval":
        _first_table_figure(doc, "final.comparisons", "error")["interval"]["lo"] = 0.0
    elif where == "beyond noise":
        fig = _first_table_figure(doc, "final.comparisons", "spearman")
        fig["beyond_noise"] = not fig["beyond_noise"]
    elif where == "display":
        doc["claims"][0]["figures"][0]["display"] = "28.0%"
    elif where == "pointer":
        _first_table_figure(doc, "final.approaches.1.pooled", "recall")["source"]["pointer"] = "/approaches/C1/1/pooled/flags/nothing"
    problems = build.check(_write(tmp_path, doc))
    assert problems, where


def test_5_2_ac2_the_cli_exits_nonzero_on_a_tampered_file(tmp_path, monkeypatch, capsys):
    doc = copy.deepcopy(DOC)
    _first_table_figure(doc, "selection.approaches.1.pooled", "precision")["value"] = 0.5
    monkeypatch.setattr(build, "OUT", _write(tmp_path, doc))
    assert build.main(["--check"]) == 1
    assert "FAILED" in capsys.readouterr().err


def test_5_2_ac2_a_claim_that_differs_from_its_source_fails_the_build():
    claims = yaml.safe_load(build.CLAIMS_FILE.read_text(encoding="utf-8"))
    files = set(claims["files"].values())
    docs = {f: build.load_scoring(f) for f in files}
    bad = copy.deepcopy(claims)
    bad["claims"][0]["figures"][0]["display"] = "28.0%"
    with pytest.raises(build.EvidenceError):
        build.build_claims(docs, bad)
    bad = copy.deepcopy(claims)
    bad["claims"][1]["figures"][3]["expect"] = True  # C1 passed against (b): it did not
    with pytest.raises(build.EvidenceError):
        build.build_claims(docs, bad)
    bad = copy.deepcopy(claims)
    bad["claims"][0]["figures"][0]["interval"]["lo"]["pointer"] = "/comparisons/C1 vs a/error/lo"
    with pytest.raises(build.EvidenceError):
        build.build_claims(docs, bad)


def test_5_2_ac2_a_changed_scoring_file_fails(tmp_path, monkeypatch):
    for f in build.SCORING.iterdir():
        (tmp_path / f.name).write_bytes(f.read_bytes())
    changed = tmp_path / build.FINAL
    changed.write_bytes(changed.read_bytes().replace(b"0.27869164593375073", b"0.27869164593375074", 1))
    monkeypatch.setattr(build, "SCORING", tmp_path)
    with pytest.raises(build.EvidenceError, match="manifest hash"):
        build.build()
    assert build.check()  # the written file no longer matches its sources


def test_5_2_ac2_no_nan_reaches_the_file():
    with pytest.raises(ValueError):
        build.dumps({"x": float("nan")})


# --- AC3: the wording check -------------------------------------------------------

def test_5_2_ac3_readme_and_site_pass_the_wording_check():
    paths = [ROOT / "README.md", ROOT / "web" / "src", ROOT / "docs" / "pitch" / "storyline.md"]
    if (ROOT / "web" / "dist").exists():
        paths.append(ROOT / "web" / "dist")
    assert wording.check(paths) == []


@pytest.mark.parametrize("sentence", [
    "C1 beat the baselines.",
    "C1 beats all the baselines on count error.",
    "It had lower error than every baseline.",
    "C1 outperformed both baselines.",
    "C1 outperforms all baselines.",
    "C1 is better than any baseline.",
    "C1 is more accurate than the baselines.",
    "C1 surpassed the three baselines.",
    "C1 beat every other method.",
    "the best of all methods",
    "C1 won against all the baselines",
])
def test_5_2_ac3_wording_check_fails_on_each_listed_claim(tmp_path, sentence):
    site = tmp_path / "dist"
    site.mkdir()
    (site / "index.html").write_text(f"<p>{sentence}</p>", encoding="utf-8")
    assert wording.check([site])
    assert wording.main([str(site)]) == 1


def test_5_2_ac3_the_fixed_claims_pass_the_wording_check():
    for claim in DOC["claims"]:
        assert wording.find(claim["text"]) == [], claim["id"]


def test_5_2_ac3_phrase_split_across_lines_is_caught(tmp_path):
    (tmp_path / "README.md").write_text("C1 beat\nthe   baselines", encoding="utf-8")
    assert wording.check([tmp_path / "README.md"])


def test_5_2_ac3_a_missing_path_fails():
    assert wording.check([ROOT / "web" / "no-such-build"])
