"""Story 6.6 checks: the pitch storyline quotes claims.yaml word for word and uses no
banned wording."""
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
STORYLINE = (Path(__file__).resolve().parent / "storyline.md").read_text(encoding="utf-8")
CLAIMS = {c["id"]: c["text"] for c in yaml.safe_load((ROOT / "evidence" / "claims.yaml").read_text(encoding="utf-8"))["claims"]}

QUOTE = re.compile(r"^> \*\*\[([a-z0-9-]+)\]\*\* (.+)$", re.MULTILINE)
BANNED = [r"beat the baselines", r"beats the baselines", r"every baseline", r"all (the )?baselines", r"\bfires?\b"]


def norm(text):
    return " ".join(text.split())


def quotes():
    return QUOTE.findall(STORYLINE)


def test_6_6_every_quoted_claim_is_word_for_word():
    found = quotes()
    assert found, "no claims quoted"
    for claim_id, text in found:
        assert claim_id in CLAIMS, f"unknown claim id {claim_id}"
        assert norm(text) == norm(CLAIMS[claim_id]), f"{claim_id} differs from claims.yaml"


def test_6_6_failed_test_and_savanna_weakness_are_stated():
    ids = {claim_id for claim_id, _ in quotes()}
    assert {"flag-precision-vs-b", "southern-africa-flags", "count-error-vs-b"} <= ids


def test_6_6_no_banned_wording():
    for pattern in BANNED:
        # The banned phrases may appear only inside quoted claims, which are checked above.
        outside = QUOTE.sub("", STORYLINE)
        assert not re.search(pattern, outside, re.IGNORECASE), pattern


def test_6_6_one_line_per_judging_criterion():
    for criterion in ["Influence", "Creativity", "Validity", "Relevance", "Presentation"]:
        rows = [line for line in STORYLINE.splitlines() if line.startswith(f"| {criterion}")]
        assert len(rows) == 1, criterion
