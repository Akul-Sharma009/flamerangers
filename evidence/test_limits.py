"""Story 5.6 checks on the evidence build: evidence.json holds every figure the "What the
scores can't show" section quotes, each equal to its field, and the scoring files hold
what the section's limits say about them. The page itself is checked in
web/src/evidence/limits.test.tsx."""
import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


def _load(name):
    spec = importlib.util.spec_from_file_location(f"evidence_{name}_56", HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = _load("build")
DOC = json.loads(build.OUT.read_text(encoding="utf-8"))
TABLES = {t["id"]: t for t in DOC["tables"]}
SOURCES = {s["set"]: s["file"] for s in DOC["sources"]}
FILES = {k: build.load_scoring(v) for k, v in SOURCES.items()}
TUNING = ["sumatra", "australia_grassland", "amazon_forest"]
LOCKED = ["southern_africa", "siberia"]
APPROACHES = ["C1", "4A", "1A", "b", "a", "cmp"]


def _row(table_id, key):
    return next(r for r in TABLES[table_id]["rows"] if r["key"] == key)


def _years(table_id, key):
    return [c["value"] for c in _row(table_id, key)["cells"].values() if c is not None]


# --- the years each set scored, as figures ---------------------------------------------

@pytest.mark.parametrize("set_key", ["selection", "final", "reported_only"])
def test_5_6_years_scored_are_figures_in_the_files_order(set_key):
    years = FILES[set_key]["years"]
    table = TABLES[f"{set_key}.years"]
    if isinstance(years, list):
        assert [r["key"] for r in table["rows"]] == ["/years"]
        assert _years(table["id"], "/years") == years
    else:
        assert [r["key"] for r in table["rows"]] == [f"/years/{r}" for r in years]
        for region, ys in years.items():
            assert _years(table["id"], f"/years/{region}") == ys
    for row in table["rows"]:
        for cell in row["cells"].values():
            if cell is not None:
                assert cell["display"] == str(cell["value"])  # a year, with no thousands comma
                assert cell["source"]["pointer"].startswith(row["key"] + "/")


def test_5_6_the_reported_only_run_is_named_by_its_own_fields():
    about = {r["key"]: r["cells"]["value"] for r in TABLES["reported_only.about"]["rows"]}
    meta = FILES["reported_only"]["meta"]
    assert about["/meta/run_id"]["value"] == meta["run_id"] == "9d5e7bf1d0d6"
    assert about["/meta/final_run_id"]["value"] == FILES["final"]["meta"]["run_id"]
    assert about["/meta/last_standard_date"]["value"] == meta["last_standard_date"]
    assert about["/meta/note"]["value"] == meta["note"]
    assert build.check_figures(DOC) == []


# --- what the limits say about the scoring files --------------------------------------

def test_5_6_limit_drift_the_scored_years_stop_where_the_section_says():
    """The scored years stop at the final set's last Sumatra year (the figure the section
    quotes); later years are only in the reported-only run."""
    stop = FILES["final"]["years"]["sumatra"][-1]
    scored = FILES["selection"]["years"] + [y for ys in FILES["final"]["years"].values() for y in ys]
    assert max(scored) == stop
    later = [y for ys in FILES["reported_only"]["years"].values() for y in ys if y > stop]
    assert later


def test_5_6_limit_small_selection_set():
    sel = FILES["selection"]
    assert list(sel["blocks"]) == TUNING + ["total"]
    assert _row("selection.run", "/blocks/total")["cells"]["value"]["value"] == sel["blocks"]["total"]
    # One pair of years per region, for every approach shown: the figure the section quotes.
    quoted = TABLES["selection.approaches.region.sumatra"]
    assert next(r for r in quoted["rows"] if r["key"] == "C1")["cells"]["year_pairs"]["value"] == 1
    for region in TUNING:
        for a in APPROACHES:
            assert sel["approaches"][a]["region"]["regions"][region]["year_pairs"] == 1, (region, a)


def test_5_6_limit_final_set_tuning_regions_have_late_years_only():
    years = FILES["final"]["years"]
    late = set(range(2018, 2022))  # the test plan's late overlap, 2018 to 2021
    for region in TUNING:
        assert set(years[region]) <= late, region
        assert years[region] == years["sumatra"], region
    for region in LOCKED:
        assert set(years[region]) - late, region  # the early years come from these alone


def test_5_6_limit_no_cropland_region_is_scored_and_punjab_is_reported_only():
    for set_key in ("selection", "final"):
        assert "punjab" not in FILES[set_key]["blocks"]
        assert not any(t.startswith(f"{set_key}.") and t.endswith(".punjab") for t in TABLES)
    assert "punjab" in FILES["reported_only"]["years"]
    assert "reported_only.approaches.1.punjab" in TABLES


# --- the reported-only result ---------------------------------------------------------

def test_5_6_reported_only_4a_alone_passed_the_b_test():
    shown = FILES["reported_only"]["decisions"]["shown only"]["beats_b"]
    passed = [a for a, r in shown.items() if r["pass"]]
    assert passed == ["4A"]
    rows = {r["key"]: r["cells"]["value"] for r in TABLES["reported_only.decisions"]["rows"]}
    assert rows["/decisions/shown only/beats_b/4A/pass"]["value"] is True
    assert rows["/decisions/shown only/beats_b/C1/pass"]["value"] is False


@pytest.mark.parametrize("region,best", [("southern_africa", "4A"), ("punjab", "1A")])
def test_5_6_reported_only_regions_where_c1_was_not_the_best(region, best):
    errors = {a: FILES["reported_only"]["approaches"][a]["1"]["regions"][region]["mae"] for a in ("C1", "4A", "1A")}
    assert min(errors, key=errors.get) == best
    assert errors["C1"] > errors[best]


def test_5_6_reported_only_claims_are_marked_not_used_for_the_pick():
    claims = {c["id"]: c for c in DOC["claims"]}
    for cid in ("reported-only-vs-b", "reported-only-4a", "reported-only-regions"):
        assert claims[cid]["used_for_pick"] is False
        assert {f["source"]["file"] for f in claims[cid]["figures"]} == {SOURCES["reported_only"]}


# --- NOAA-20 (Story 2.10) -------------------------------------------------------------

def test_5_6_noaa20_has_no_result_file_yet():
    assert build.noaa20_file(build.manifest_hashes()) is None
    assert "noaa20_check" not in SOURCES
    assert not any(t["set"] == "noaa20_check" for t in DOC["tables"])


def _with_noaa20(tmp_path, monkeypatch, label):
    for f in build.SCORING.iterdir():
        shutil.copy(f, tmp_path / f.name)
    name = "noaa20_check_20261115T000000Z.json"
    body = {"label": label, "meta": {"run_id": "abc123"}, "pooled": {"bias": -0.02, "mae": 1.5, "months": 58}}
    data = json.dumps(body).encode()
    (tmp_path / name).write_bytes(data)
    manifest = json.loads((tmp_path / "MANIFEST.json").read_text(encoding="utf-8"))
    manifest["files"][name] = {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    (tmp_path / "MANIFEST.json").write_text(json.dumps(manifest), encoding="utf-8")
    monkeypatch.setattr(build, "SCORING", tmp_path)
    return name, body


def test_5_6_noaa20_result_file_is_read_once_it_exists(tmp_path, monkeypatch):
    name, body = _with_noaa20(tmp_path, monkeypatch, "reported only, not a validation against Aqua")
    doc = build.build()
    source = next(s for s in doc["sources"] if s["set"] == "noaa20_check")
    assert source["file"] == name and source["label"] == body["label"] and source["run_id"] == "abc123"
    table = next(t for t in doc["tables"] if t["id"] == "noaa20_check.figures")
    values = {r["key"]: r["cells"]["value"]["value"] for r in table["rows"]}
    assert values == {"/meta/run_id": "abc123", "/pooled/bias": -0.02, "/pooled/mae": 1.5, "/pooled/months": 58}
    assert build.check_figures(doc) == []


def test_5_6_noaa20_result_file_must_be_labelled_reported_only(tmp_path, monkeypatch):
    _with_noaa20(tmp_path, monkeypatch, "NOAA-20 against Suomi NPP")
    with pytest.raises(build.EvidenceError, match="not a validation against Aqua"):
        build.build()
