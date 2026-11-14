"""Reads C1's frozen parameters for burncal.core.c1, which reads no files itself.

The file is checked against its committed SHA-256 before it is used, so a changed
copy fails loudly instead of converting counts with different numbers.
"""
import hashlib
import json
from pathlib import Path

from burncal.core import c1

PARAMS_DIR = Path(__file__).resolve().parents[1] / "core" / "params"
PARAMS_FILE = PARAMS_DIR / "c1_params.json"
HASH_FILE = PARAMS_DIR / "c1_params.sha256"


def read_c1_params(path: Path = PARAMS_FILE, hash_file: Path = HASH_FILE) -> dict:
    data = path.read_bytes()
    want = hash_file.read_text(encoding="utf-8").split()[0]
    got = hashlib.sha256(data).hexdigest()
    if got != want:
        raise ValueError(f"{path.name}: sha256 {got} does not match the frozen {want}")
    return c1.load_params(json.loads(data))
