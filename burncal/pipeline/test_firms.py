"""FIRMS area client: the key is read from .env or the environment and never leaks."""
import pytest

from burncal.pipeline import firms


def test_key_comes_from_dotenv_file(tmp_path, monkeypatch):
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    (tmp_path / ".env").write_text("# comment\nFIRMS_MAP_KEY=abc123\nOTHER=x\n")
    assert firms.map_key(tmp_path / ".env") == "abc123"


def test_missing_key_is_a_clear_error(tmp_path, monkeypatch):
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    with pytest.raises(RuntimeError, match="FIRMS_MAP_KEY is not set"):
        firms.map_key(tmp_path / ".env")


def test_failed_request_never_shows_the_key(monkeypatch):
    monkeypatch.setenv("FIRMS_MAP_KEY", "SECRETKEY123")

    def boom(*a, **k):
        raise OSError("connection to https://firms.example/api/area/csv/SECRETKEY123/x failed")

    monkeypatch.setattr(firms, "urlopen", boom)
    with pytest.raises(RuntimeError) as e:
        firms.area_csv("MODIS_SP", (101, -1, 102, 0), "2024-01-01", 5)
    assert "SECRETKEY123" not in str(e.value) and "api/area" not in str(e.value)
    assert e.value.__cause__ is None and e.value.__suppress_context__


def test_non_csv_answer_is_refused(monkeypatch):
    monkeypatch.setenv("FIRMS_MAP_KEY", "SECRETKEY123")

    class Reply:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return b"Invalid MAP_KEY."

    monkeypatch.setattr(firms, "urlopen", lambda *a, **k: Reply())
    with pytest.raises(RuntimeError, match="no CSV"):
        firms.area_csv("MODIS_SP", (101, -1, 102, 0), "2024-01-01", 5)
