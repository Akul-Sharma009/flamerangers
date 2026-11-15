"""Hosting: copy a published store version from public storage (a URL prefix) onto local disk.

At start, sync() copies the pointer and, for the current version, everything a calendar needs (about
22 MB for Sumatra). The previous version's files are fetched the first time a request names it, and
hotspot record files the first time a request needs them; /tmp is the tight limit on the host.
Public URLs only; no credentials. urllib handles https:// and file:// alike.
"""
import json
import shutil
import urllib.error
import urllib.request
from pathlib import Path

from burncal.service.store import SERVING


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


def sync(base_url: str, local_root, with_points: bool = True) -> Path:
    """Copy the pointer and the serving files of the current version. Returns the local root.
    with_points False: leave points.parquet at the URL; the service reads it by range requests (Story 2.8)."""
    root, base = Path(local_root), base_url.rstrip("/")
    root.mkdir(parents=True, exist_ok=True)
    tmp = root / "CURRENT.json.download"
    tmp.unlink(missing_ok=True)
    if not _get(f"{base}/CURRENT.json", tmp):
        raise FileNotFoundError("no CURRENT.json at the store URL")
    pointer = json.loads(tmp.read_text(encoding="utf-8"))
    v = pointer["record_version"]
    for rel in SERVING:
        if with_points or rel != "points.parquet":
            _get(f"{base}/versions/{v}/{rel}", root / "versions" / v / rel)
    new = tmp.read_text(encoding="utf-8")
    cur = root / "CURRENT.json"
    if not cur.exists() or cur.read_text(encoding="utf-8") != new:
        tmp.replace(cur)  # switch only after every serving file is on disk
    else:
        tmp.unlink()
    return root


def points_url(base_url: str):
    """version -> the URL of its points.parquet, for create_app(points_location=...)."""
    base = base_url.rstrip("/")
    return lambda version: f"{base}/versions/{version}/points.parquet"


def fetcher(base_url: str, local_root):
    """fetch(local_path) -> bool: download one file of the store on first use."""
    root, base = Path(local_root), base_url.rstrip("/")

    def fetch(path) -> bool:
        rel = Path(path).relative_to(root).as_posix()
        return _get(f"{base}/{rel}", root / rel)
    return fetch
