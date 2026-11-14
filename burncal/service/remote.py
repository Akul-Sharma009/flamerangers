"""Hosting: copy a published store version from public storage (a URL prefix) onto local disk.

At start, sync() copies the pointer and, for the current and previous versions, everything a calendar
needs (about 31 MB for Sumatra). Hotspot record files are fetched the first time a request needs them.
Public URLs only; no credentials. urllib handles https:// and file:// alike.
"""
import json
import shutil
import urllib.error
import urllib.request
from pathlib import Path

SERVING = ["manifest.json", "coverage_days.parquet", "missing_days.parquet", "points.parquet",
           "grids/cells_1deg.parquet", "grids/cells_025deg.parquet", "grids/thresholds_1deg.parquet",
           "grids/flags_1deg.parquet", "records/evidence_1deg.parquet"]


def _get(url: str, dest: Path) -> bool:
    """Download url to dest (atomically). False when the file does not exist there."""
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    try:
        with urllib.request.urlopen(url, timeout=60) as r, open(tmp, "wb") as f:
            shutil.copyfileobj(r, f)
    except (urllib.error.HTTPError, FileNotFoundError, urllib.error.URLError) as exc:
        tmp.unlink(missing_ok=True)
        if isinstance(exc, urllib.error.HTTPError) and exc.code != 404:
            raise
        return False
    tmp.replace(dest)
    return True


def sync(base_url: str, local_root) -> Path:
    """Copy the pointer and the serving files of the versions it names. Returns the local root."""
    root, base = Path(local_root), base_url.rstrip("/")
    root.mkdir(parents=True, exist_ok=True)
    tmp = root / "CURRENT.json.download"
    tmp.unlink(missing_ok=True)
    if not _get(f"{base}/CURRENT.json", tmp):
        raise FileNotFoundError("no CURRENT.json at the store URL")
    pointer = json.loads(tmp.read_text(encoding="utf-8"))
    for v in {pointer["record_version"], pointer.get("previous")} - {None}:
        for rel in SERVING:
            _get(f"{base}/versions/{v}/{rel}", root / "versions" / v / rel)
    new = tmp.read_text(encoding="utf-8")
    cur = root / "CURRENT.json"
    if not cur.exists() or cur.read_text(encoding="utf-8") != new:
        tmp.replace(cur)  # switch only after every serving file is on disk
    else:
        tmp.unlink()
    return root


def fetcher(base_url: str, local_root):
    """fetch(local_path) -> bool: download one file of the store on first use."""
    root, base = Path(local_root), base_url.rstrip("/")

    def fetch(path) -> bool:
        rel = Path(path).relative_to(root).as_posix()
        return _get(f"{base}/{rel}", root / rel)
    return fetch
