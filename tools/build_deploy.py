"""Build the Vercel deploy folder: code, contract files and ONE store version.
Run: uv run python tools/build_deploy.py <store root> <out dir> [--part-mb 55]"""
import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / "deploy"
MAX_FILE_BYTES = 100 * 2**20
REQUIRED = ("duckdb", "pyyaml", "pydantic")
CONTRACT_PATHS = ("contract/messages.yaml", "contract/regions.geojson", "contract/fixture/problems")


def _archive(paths, out_dir, keep):
    data = subprocess.run(["git", "archive", "HEAD", *paths], cwd=ROOT, check=True,
                          capture_output=True).stdout
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        for m in tar.getmembers():
            if m.isfile() and keep(m.name):
                dest = out_dir / m.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(tar.extractfile(m).read())


def export_code(out_dir):
    def keep_code(name):
        p = Path(name)
        return (name.startswith("burncal/") and "__pycache__" not in p.parts
                and not p.name.startswith("test_") and p.name != "conftest.py")

    _archive(["burncal"], out_dir, keep_code)
    _archive(list(CONTRACT_PATHS), out_dir,
             lambda n: not n.startswith("contract/fixture/problems/") or n.endswith(".json"))


def export_requirements():
    out = subprocess.run(
        ["uv", "export", "--frozen", "--no-dev", "--no-hashes", "--no-emit-project",
         "--format", "requirements-txt"], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return out


def filter_requirements(text):
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if line and re.match(r"^[A-Za-z]", line):
            name = re.split(r"[=<>!~ ;\[]", line, maxsplit=1)[0]
            lines.append(name.lower() + line[len(name):])
    names = {re.split(r"[=<>!~ ;\[]", x, maxsplit=1)[0] for x in lines}
    missing = [r for r in REQUIRED if r not in names]
    if missing:
        raise SystemExit(f"requirements.txt is missing: {', '.join(missing)}")
    return "\n".join(lines) + "\n"


def _copy(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def split_points(src, dest_dir, part_bytes):
    """Split by row groups: same rows, same order, zstd. Returns the part count."""
    pf = pq.ParquetFile(src)
    dest_dir.mkdir(parents=True, exist_ok=True)
    meta = pf.metadata
    parts, writer, size = 0, None, 0
    for i in range(meta.num_row_groups):
        rg = meta.row_group(i)
        rg_size = sum(rg.column(c).total_compressed_size for c in range(rg.num_columns))
        if writer is not None and size + rg_size > part_bytes:
            writer.close()
            writer = None
        if writer is None:
            writer = pq.ParquetWriter(dest_dir / f"part-{parts:03d}.parquet", pf.schema_arrow,
                                      compression="zstd")
            parts, size = parts + 1, 0
        writer.write_table(pf.read_row_group(i))
        size += rg_size
    if writer is not None:
        writer.close()
    return parts


def build(store_root, out_dir, part_mb=55, code_exporter=export_code, requirements_exporter=export_requirements):
    store_root, out_dir = Path(store_root), Path(out_dir)
    if out_dir.exists():
        raise SystemExit(f"refusing: {out_dir} already exists")
    current = json.loads((store_root / "CURRENT.json").read_text())
    v = current["record_version"]
    src_version = store_root / "versions" / v
    if not src_version.is_dir():
        raise SystemExit(f"current version folder missing: {src_version}")
    out_dir.mkdir(parents=True)
    code_exporter(out_dir)
    shutil.copy2(DEPLOY / "index.py", out_dir / "index.py")
    shutil.copy2(DEPLOY / ".python-version", out_dir / ".python-version")
    shutil.copy2(DEPLOY / ".vercelignore", out_dir / ".vercelignore")
    (out_dir / "requirements.txt").write_text(filter_requirements(requirements_exporter()))
    (out_dir / "store").mkdir(exist_ok=True)
    shutil.copy2(store_root / "CURRENT.json", out_dir / "store" / "CURRENT.json")
    dest_version = out_dir / "store" / "versions" / v
    parts = 0
    for f in sorted(src_version.rglob("*")):
        if not f.is_file():
            continue
        rel = f.relative_to(src_version)
        if rel.as_posix() == "points.parquet":
            parts = split_points(f, dest_version / "points", int(part_mb * 2**20))
        else:
            _copy(f, dest_version / rel)
    files = [p for p in out_dir.rglob("*") if p.is_file()]
    big = [p for p in files if p.stat().st_size >= MAX_FILE_BYTES]
    if big:
        raise SystemExit(f"file(s) of 100 MB or more: {', '.join(str(p.relative_to(out_dir)) for p in big)}")
    total = sum(p.stat().st_size for p in files) / 2**20
    return {"version": v, "parts": parts, "total_mb": round(total, 1)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("store_root")
    ap.add_argument("out_dir")
    ap.add_argument("--part-mb", type=float, default=55)
    a = ap.parse_args(argv)
    r = build(a.store_root, a.out_dir, a.part_mb)
    print(f"deploy folder: version {r['version']}, {r['parts']} points parts, {r['total_mb']} MB")


if __name__ == "__main__":
    sys.exit(main())
