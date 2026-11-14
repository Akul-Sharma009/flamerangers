"""FIRMS area-API client. The only code that reads FIRMS_MAP_KEY.

The key travels in the URL path, so URLs are never logged and errors are scrubbed.
"""
from os import environ
from pathlib import Path
from urllib.request import Request, urlopen

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
SOURCES = ("MODIS_SP", "VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT", "VIIRS_SNPP_NRT", "MODIS_NRT")


def map_key(env_file: Path = ENV_FILE) -> str:
    """FIRMS_MAP_KEY from the environment, else from the git-ignored env file. Never printed."""
    key = environ.get("FIRMS_MAP_KEY", "").strip()
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "FIRMS_MAP_KEY":
                key = value.strip().strip('"').strip("'")
    if not key:
        raise RuntimeError("FIRMS_MAP_KEY is not set (environment or .env)")
    return key


def area_csv(source: str, bbox: tuple[float, float, float, float], date: str, days: int) -> str:
    """CSV text for one area request. bbox: west, south, east, north. days: 1 to 5."""
    if source not in SOURCES or not 1 <= days <= 5:
        raise ValueError("unknown source or days outside 1-5")
    w, s, e, n = bbox
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key()}/{source}/{w},{s},{e},{n}/{days}/{date}"
    try:
        with urlopen(Request(url, headers={"User-Agent": "burncal-pipeline"}), timeout=120) as r:
            text = r.read().decode("utf-8")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"FIRMS request failed ({type(exc).__name__}); URL withheld") from None
    if not text.lower().startswith("latitude"):
        raise RuntimeError("FIRMS returned no CSV (bad key, limit reached or bad request)")
    return text
