"""Story 2.9 AC2: the hosted refresh publishes on a recorded parity pass, never without one."""
import json
import os
from datetime import date

import pytest

from burncal.pipeline import parity, publish

CASE = os.environ.get("BURNCAL_PARITY_CASE_DIR")


def _write(path, **over):
    rec = {"passed": True, "misses": {"C1 1deg": 1e-10}, "params_sha256": publish.params_sha256(),
           "core_sha256": parity.core_sha256(), **over}
    path.write_text(json.dumps(rec))
    return path


def test_2_9_ac2_a_recorded_pass_on_this_code_and_params_passes(tmp_path):
    got = parity.check_recorded(_write(tmp_path / "p.json"))
    assert got["passed"] and got["params_sha256"] == publish.params_sha256()
    assert got["recorded_pass"] == parity.core_sha256()


@pytest.mark.parametrize("over", [{"core_sha256": "0" * 64}, {"params_sha256": "0" * 64}, {"misses": {"C1 1deg": 1e-3}},
                                  {"passed": False}])
def test_2_9_ac2_a_recorded_pass_for_other_code_params_or_a_miss_is_refused(tmp_path, over):
    assert not parity.check_recorded(_write(tmp_path / "p.json", **over))["passed"]


def test_2_9_ac2_no_recorded_pass_means_no_converted_counts(tmp_path):
    assert parity.check_recorded(tmp_path / "missing.json") == {"passed": False, "reason": "no recorded parity pass", "misses": {}}


def test_2_9_ac2_the_core_hash_changes_with_core_code_and_params_not_tests(tmp_path):
    core = tmp_path / "core"
    (core / "params").mkdir(parents=True)
    (core / "c1.py").write_text("a = 1\n")
    (core / "params" / "c1_params.json").write_text("{}")
    h = parity.core_sha256(core)
    (core / "test_c1.py").write_text("def test(): pass\n")
    assert parity.core_sha256(core) == h
    (core / "params" / "c1_params.json").write_text('{"x": 1}')
    assert parity.core_sha256(core) != h
    h2 = parity.core_sha256(core)
    (core / "c1.py").write_text("a = 2\n")
    assert parity.core_sha256(core) != h2


def test_2_9_ac2_check_uses_the_recorded_pass_only_without_the_case(monkeypatch):
    monkeypatch.setattr(parity, "check_case", lambda case_dir=None: {"passed": "case"})
    monkeypatch.setattr(parity, "check_recorded", lambda path=parity.RECORDED: {"passed": "recorded"})
    monkeypatch.delenv("BURNCAL_PARITY_CASE_DIR", raising=False)
    assert parity.check()["passed"] == "recorded"
    monkeypatch.setenv("BURNCAL_PARITY_CASE_DIR", "/x")
    assert parity.check()["passed"] == "case"


def test_2_9_ac2_the_manifest_says_when_a_recorded_pass_was_used():
    rec = {"passed": True, "misses": {}, "params_sha256": publish.params_sha256(), "recorded_pass": "abc"}
    gate = publish._parity_gate(date(2026, 11, 14), lambda: rec, "rev")
    assert gate["recorded_pass_core_sha256"] == "abc" and gate["code_revision"] == "rev"


@pytest.mark.skipif(not CASE, reason="needs the parity case (BURNCAL_PARITY_CASE_DIR)")
def test_2_9_ac2_the_committed_recorded_pass_matches_this_code():
    got = parity.check_recorded()
    assert got["passed"], got.get("reason")
    assert parity.check_case()["passed"]
