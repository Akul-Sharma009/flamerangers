"""Story 2.2: the pipeline reads C1's parameters and checks them against the frozen hash."""
import pytest

from burncal.pipeline.c1_params import HASH_FILE, PARAMS_FILE, read_c1_params


def test_2_2_reads_the_frozen_params():
    params = read_c1_params()
    assert params["w_season"] == 0.7 and params["w_off"] == 0.3
    assert set(params["season"]) == {"sumatra", "australia_grassland", "amazon_forest"}


def test_2_2_a_changed_params_file_is_refused(tmp_path):
    changed = tmp_path / "c1_params.json"
    changed.write_bytes(PARAMS_FILE.read_bytes() + b"\n")
    with pytest.raises(ValueError, match="does not match"):
        read_c1_params(changed, HASH_FILE)
