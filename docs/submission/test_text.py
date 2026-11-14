"""Story 6.5 checks: the submission text quotes claims.yaml word for word, uses no banned
wording, states each field's word count correctly and keeps the summary's required claims."""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
TEXT = (HERE / "text.md").read_text(encoding="utf-8")
ASSETS = (HERE / "demo-assets.md").read_text(encoding="utf-8")
CLAIMS = {c["id"]: c["text"] for c in yaml.safe_load((ROOT / "evidence" / "claims.yaml").read_text(encoding="utf-8"))["claims"]}

sys.path.insert(0, str(ROOT / "evidence"))
import wording  # noqa: E402

QUOTE = re.compile(r"^> \*\*\[([a-z0-9-]+)\]\*\* (.+)$", re.MULTILINE)
FIELD = re.compile(r"<!-- field:([a-z-]+) -->\n(.*?)\n<!-- /field:\1 -->\n\nWords: (\d+)\.", re.DOTALL)
BANNED = [r"beat the baselines", r"beats the baselines", r"every baseline", r"all (the )?baselines", r"\bfires?\b"]
FIELDS = {"name", "challenge", "summary", "demo", "link", "details", "nasa-data", "references"}


def norm(text):
    return " ".join(text.split())


def pasted(text):
    """The field as pasted: quote markers and claim labels dropped."""
    text = re.sub(r"^> \*\*\[[a-z0-9-]+\]\*\* ", "", text, flags=re.MULTILINE)
    return norm(text)


def fields():
    return {name: (body, int(count)) for name, body, count in FIELD.findall(TEXT)}


def test_6_5_every_field_is_there():
    assert set(fields()) == FIELDS


def test_6_5_every_quoted_claim_is_word_for_word():
    found = QUOTE.findall(TEXT)
    assert found, "no claims quoted"
    for claim_id, text in found:
        assert claim_id in CLAIMS, f"unknown claim id {claim_id}"
        assert norm(text) == norm(CLAIMS[claim_id]), f"{claim_id} differs from claims.yaml"


def test_6_5_summary_and_details_state_the_failed_test():
    f = fields()
    for name in ("summary", "details"):
        ids = {i for i, _ in QUOTE.findall(f[name][0])}
        assert {"count-error-vs-b", "flag-precision-vs-b"} <= ids, name
    assert "southern-africa-flags" in {i for i, _ in QUOTE.findall(f["details"][0])}


def test_6_5_word_counts_are_stated_correctly():
    for name, (body, count) in fields().items():
        assert len(pasted(body).split()) == count, f"{name}: {len(pasted(body).split())} words, stated {count}"


def test_6_5_no_banned_wording():
    for doc in (TEXT, ASSETS):
        outside = QUOTE.sub("", doc)
        for pattern in BANNED:
            assert not re.search(pattern, outside, re.IGNORECASE), pattern
        assert not wording.find(outside)
