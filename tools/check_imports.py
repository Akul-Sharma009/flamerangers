"""Import check (Story 1.1). Fails if core imports pipeline, service or tests,
or if anything imports tests. Run: uv run python tools/check_imports.py"""
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORBIDDEN_FOR_CORE = ("burncal.pipeline", "burncal.service", "tests")
FORBIDDEN_EVERYWHERE = ("tests",)


def imported_names(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            yield node.module


def matches(name, prefixes):
    return any(name == p or name.startswith(p + ".") for p in prefixes)


def main():
    failures = []
    for path in sorted(ROOT.rglob("*.py")):
        if any(part in {".venv", ".git"} for part in path.parts):
            continue
        rel = path.relative_to(ROOT)
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(rel))
        is_core = rel.parts[:2] == ("burncal", "core")
        for name in imported_names(tree):
            if matches(name, FORBIDDEN_EVERYWHERE):
                failures.append(f"{rel}: imports {name} (nothing may import tests)")
            elif is_core and matches(name, FORBIDDEN_FOR_CORE):
                failures.append(f"{rel}: core imports {name}")
    if failures:
        print("\n".join(failures))
        return 1
    print("Import check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
