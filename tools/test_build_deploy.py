"""Story 6.4 deploy-folder builder tests."""
import json
import sys
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_deploy  # noqa: E402

V = "20260101-abcd1234"


def _stub_code(out_dir):
    (out_dir / "burncal").mkdir()
    (out_dir / "burncal" / "x.py").write_text("x = 1\n")
    (out_dir / "contract").mkdir()
    (out_dir / "contract" / "messages.yaml").write_text("a: b\n")


def _stub_reqs():
    return "duckdb==2.0.0\nPyYAML==6.0.3\npydantic==2.14.3\n# comment\n-e .\n"


@pytest.fixture
def store(tmp_path):
    root = tmp_path / "store"
    vdir = root / "versions" / V
    (vdir / "records").mkdir(parents=True)
    df = pd.DataFrame({"a": range(1000), "b": [f"s{i % 7}" for i in range(1000)]})
    pq.write_table(pa.Table.from_pandas(df, preserve_index=False), vdir / "points.parquet",
                   row_group_size=100)
    (vdir / "manifest.json").write_text("{}")
    (vdir / "records" / "r.json").write_text("{}")
    (root / "CURRENT.json").write_text(json.dumps({"record_version": V, "previous": "old"}))
    (root / "versions" / "old").mkdir()
    return root, df


def _build(store, tmp_path, part_mb=55):
    out = tmp_path / "out"
    r = build_deploy.build(store[0], out, part_mb, _stub_code, _stub_reqs)
    return out, r


def test_6_4_ac1_layout(store, tmp_path):
    out, r = _build(store, tmp_path)
    for f in ("burncal/x.py", "contract/messages.yaml", "index.py", "requirements.txt",
              ".python-version", ".vercelignore", "store/CURRENT.json",
              f"store/versions/{V}/manifest.json", f"store/versions/{V}/records/r.json",
              f"store/versions/{V}/points/part-000.parquet"):
        assert (out / f).is_file(), f
    assert not (out / "store" / "versions" / V / "points.parquet").exists()
    assert not (out / "store" / "versions" / "old").exists()
    assert (out / ".python-version").read_text().strip() == "3.14"
    assert (out / "store" / "CURRENT.json").read_bytes() == (store[0] / "CURRENT.json").read_bytes()
    assert r["version"] == V and r["parts"] == 1


def test_6_4_ac2_split_same_rows_same_order(store, tmp_path):
    out, r = _build(store, tmp_path, part_mb=0.0001)
    parts = sorted((out / "store" / "versions" / V / "points").glob("part-*.parquet"))
    assert len(parts) == r["parts"] > 1
    assert [p.name for p in parts] == [f"part-{i:03d}.parquet" for i in range(len(parts))]
    got = pd.concat([pq.read_table(p).to_pandas() for p in parts], ignore_index=True)
    want = pq.read_table(store[0] / "versions" / V / "points.parquet").to_pandas()
    pd.testing.assert_frame_equal(got, want)


def test_6_4_ac3_no_env_files_and_ignore_list(store, tmp_path):
    out, _ = _build(store, tmp_path)
    assert not [p for p in out.rglob("*") if p.name.startswith(".env")]
    assert (out / ".vercelignore").read_text().split() == [".env*", ".vercel", "__pycache__"]


def test_6_4_ac4_refuses_existing_out_dir(store, tmp_path):
    out = tmp_path / "out"
    out.mkdir()
    with pytest.raises(SystemExit):
        build_deploy.build(store[0], out, 55, _stub_code, _stub_reqs)


def test_6_4_ac5_requirements(store, tmp_path):
    out, _ = _build(store, tmp_path)
    lines = (out / "requirements.txt").read_text().split()
    names = {x.split("==")[0] for x in lines}
    assert {"duckdb", "pyyaml", "pydantic"} <= names
    assert all(x[0].islower() for x in lines)
    with pytest.raises(SystemExit):
        build_deploy.filter_requirements("duckdb==2.0.0\n")


def test_6_4_ac6_real_code_export_is_clean(tmp_path):
    build_deploy.export_code(tmp_path)
    files = [p for p in tmp_path.rglob("*") if p.is_file()]
    assert (tmp_path / "burncal" / "service" / "app.py").is_file()
    assert (tmp_path / "contract" / "messages.yaml").is_file()
    assert not [p for p in files if "__pycache__" in p.parts or p.name.startswith("test_")
                or p.name == "conftest.py"]
