"""Story 6.4: the hosted service installs only the runtime dependencies, so every third-party module the
service imports at run time must be one of them (a dev-only package would stop the service starting)."""
import ast
import re
import sys
import tomllib
from importlib.metadata import packages_distributions
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = [ROOT / "burncal" / d for d in ("service", "core")]


def _runtime_imports() -> set:
    names = set()
    for d in RUNTIME:
        for path in d.rglob("*.py"):
            if path.name.startswith("test_") or path.name == "conftest.py":
                continue
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Import):
                    names |= {a.name.split(".")[0] for a in node.names}
                elif isinstance(node, ast.ImportFrom) and not node.level and node.module:
                    names.add(node.module.split(".")[0])
    return {n for n in names if n not in sys.stdlib_module_names and n != "burncal"}


def _norm(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def test_6_4_every_runtime_import_of_the_service_is_a_runtime_dependency():
    deps = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]["dependencies"]
    declared = {_norm(re.split(r"[<>=!~\[ ;]", d, maxsplit=1)[0]) for d in deps}
    dists = packages_distributions()
    missing = {m: dists.get(m) for m in _runtime_imports()
               if not any(_norm(dist) in declared for dist in dists.get(m, [m]))}
    assert not missing, f"imported at run time but not a runtime dependency: {missing}"
