import shutil
import time
from pathlib import Path

_t0 = time.monotonic()
from burncal.service.app import create_app  # noqa: E402

_t1 = time.monotonic()
_root = Path(__file__).resolve().parent / "store"


def _points(v):
    """Hobby uploads files of at most 100 MB, so points.parquet ships split into parts (same rows, same order)."""
    d = _root / "versions" / v / "points"
    return (d / "*.parquet").as_posix() if d.is_dir() else None


app = create_app(_root, points_location=_points)
_t2 = time.monotonic()


def _status(key):
    try:
        for line in open("/proc/self/status"):
            if line.startswith(key):
                return int(line.split()[1]) // 1024
    except OSError:
        return -1
    return -1


print(f"burncal startup: imports {_t1 - _t0:.2f}s sync 0.00s load {_t2 - _t1:.2f}s "
      f"rss_mb {_status('VmRSS')} peak_mb {_status('VmHWM')} tmp_free_mb {shutil.disk_usage('/tmp').free // 2**20}",
      flush=True)
