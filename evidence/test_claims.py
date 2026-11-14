"""Story 5.1 checks: the scoring copies match their manifest, and every figure in
claims.yaml resolves to a field in a scoring file and matches the sentence.

Story 5.2's evidence build (build.py) runs the same checks when it writes evidence.json;
these keep claims.yaml honest on its own."""
import hashlib
import importlib.util
import json
import re
from pathlib import Path

import pytest
import yaml

HERE = Path(__file__).resolve().parent
SCORING = HERE / "scoring"
CLAIMS = yaml.safe_load((HERE / "claims.yaml").read_text(encoding="utf-8"))
MANIFEST = json.loads((SCORING / "MANIFEST.json").read_text(encoding="utf-8"))

# Wording the claims must never use (CLAUDE.md, Story 5.1).
BANNED = [r"beat the baselines", r"beats the baselines", r"every baseline", r"all (the )?baselines", r"\bfires?\b"]

REPORTED_ONLY = {"reported_only_20261113T205827Z.json", "reported_only_20261113T205827Z.txt"}

# One formatting implementation: the evidence build's (Story 5.2).
_spec = importlib.util.spec_from_file_location("evidence_build_formats", HERE / "build.py")
_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_build)
FORMATS = _build.FORMATS


def resolve(ref):
    """Read the value an RFC 6901 pointer names in a scoring file."""
    doc = json.loads((SCORING / CLAIMS["files"][ref["file"]]).read_text(encoding="utf-8"))
    for token in ref["pointer"].split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        doc = doc[int(token)] if isinstance(doc, list) else doc[token]
    return doc


FIGURES = [(c["id"], i, f) for c in CLAIMS["claims"] for i, f in enumerate(c["figures"])]


def test_manifest_lists_every_scoring_file_with_its_hash():
    on_disk = {p.name for p in SCORING.iterdir() if p.name != "MANIFEST.json"}
    assert on_disk == set(MANIFEST["files"])
    for name, entry in MANIFEST["files"].items():
        data = (SCORING / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry["sha256"], name
        assert len(data) == entry["bytes"], name


def test_reported_only_files_are_listed():
    assert REPORTED_ONLY <= set(MANIFEST["files"])


def test_scoring_json_holds_aggregates_only():
    """No per-cell or per-hotspot rows: no coordinates and no long lists."""
    for name in MANIFEST["files"]:
        if not name.endswith(".json"):
            continue
        doc = json.loads((SCORING / name).read_text(encoding="utf-8"))
        stack = [doc]
        while stack:
            x = stack.pop()
            if isinstance(x, dict):
                assert not {"lat", "lon", "latitude", "longitude", "sw_lat", "sw_lon"} & set(x), name
                stack.extend(x.values())
            elif isinstance(x, list):
                assert len(x) <= 50, f"{name}: list of {len(x)}"
                stack.extend(x)


def test_claim_files_are_in_the_manifest():
    assert set(CLAIMS["files"].values()) <= set(MANIFEST["files"])


def test_claim_ids_are_unique():
    ids = [c["id"] for c in CLAIMS["claims"]]
    assert len(ids) == len(set(ids))


def test_reported_only_claims_are_not_used_for_pick():
    for c in CLAIMS["claims"]:
        uses_reported = any(f["source"]["file"] == "reported_only" for f in c["figures"])
        assert not (uses_reported and c["used_for_pick"]), c["id"]


@pytest.mark.parametrize("claim", CLAIMS["claims"], ids=lambda c: c["id"])
def test_claim_wording(claim):
    text = " ".join(claim["text"].split())
    for pattern in BANNED:
        assert not re.search(pattern, text, re.IGNORECASE), (claim["id"], pattern)
    # Every number in the sentence is backed by a figure, except years, method and
    # satellite names, and the "95% interval" label.
    shown = {f["display"] for f in claim["figures"]}
    for interval in (f.get("interval") for f in claim["figures"]):
        if interval:
            shown.update(interval["display"].split(" to "))
    stripped = re.sub(r"95% interval|\b(19|20)\d\d\b|NOAA-20|\b[14]A\b|C1|\(\w\)", "", text)
    for number in re.findall(r"\d+(?:\.\d+)?%?", stripped):
        assert number in shown, (claim["id"], number)


@pytest.mark.parametrize("claim_id,index,fig", FIGURES, ids=lambda x: str(x) if not isinstance(x, dict) else "")
def test_figure_matches_its_source(claim_id, index, fig):
    claim = next(c for c in CLAIMS["claims"] if c["id"] == claim_id)
    text = " ".join(claim["text"].split())
    value = resolve(fig["source"])
    kind = fig["format"]
    if kind == "bool":
        assert isinstance(value, bool) and value is fig["expect"]
        assert fig["display"] == str(value).lower()
        return
    if kind == "string":
        assert value == fig["expect"] == fig["display"]
        return
    assert isinstance(value, (int, float)) and not isinstance(value, bool)
    assert FORMATS[kind](value) == fig["display"]
    assert fig["display"] in text
    if kind.endswith("_abs"):
        assert (value < 0) == (fig["sign"] == "negative")
    if "interval" in fig:
        lo, hi = resolve(fig["interval"]["lo"]), resolve(fig["interval"]["hi"])
        assert f"{FORMATS[kind](lo)} to {FORMATS[kind](hi)}" == fig["interval"]["display"]
        assert fig["interval"]["display"] in text
    if "beyond_noise" in fig:
        assert resolve(fig["beyond_noise"]) is True
