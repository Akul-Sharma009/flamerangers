"""Wording check (Story 5.2): fails if the README or the built site claims C1 beat the
baselines, or makes an equivalent claim listed below.

    uv run python evidence/wording.py                 README.md and web/dist
    uv run python evidence/wording.py PATH [PATH ...]  files or folders

Build the site first (`cd web && npm run build`); a missing path is an error, so the
check cannot pass by finding nothing. Use the sentences in evidence/claims.yaml instead."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PATHS = [ROOT / "README.md", ROOT / "web" / "dist"]
TEXT_SUFFIXES = {".md", ".html", ".htm", ".js", ".mjs", ".css", ".json", ".txt", ".ts", ".tsx", ".yaml", ".yml", ".svg"}

# Claims that C1 did better than all the baselines, in the words a page might use. The
# scores do not support any of them: C1 failed the flag-precision test against (b).
_GROUP = r"(?:the|all(?: the)?|both(?: the)?|each(?: of the)?|every one of the|the two|the three)"
BANNED = [
    r"\bbeat(?:s|ing)? " + _GROUP + r" baselines?\b",
    r"\bbeat(?:s|ing)? (?:all|every|each) (?:other )?(?:baseline|method|approach)",
    r"\bevery baseline\b",
    r"\ball (?:the )?baselines\b",
    r"\b(?:outperform(?:s|ed|ing)?|outdid|outdoes|surpass(?:es|ed|ing)?|exceed(?:s|ed|ing)?|dominat(?:es|ed|ing)) " + _GROUP + r" baselines?\b",
    r"\b(?:better|lower error|more accurate|less error) than (?:any|" + _GROUP + r") baselines?\b",
    r"\bbest of (?:all|every)\b",
    r"\b(?:won|wins) against " + _GROUP + r" baselines\b",
]
PATTERNS = [re.compile(p, re.IGNORECASE) for p in BANNED]


def files_under(path):
    if path.is_dir():
        return sorted(p for p in path.rglob("*") if p.is_file() and p.suffix.lower() in TEXT_SUFFIXES and "node_modules" not in p.parts)
    return [path]


def find(text):
    """(pattern, matched text) for every banned claim in `text`."""
    flat = " ".join(text.split())
    return [(p.pattern, m.group(0)) for p in PATTERNS for m in p.finditer(flat)]


def check(paths):
    problems = []
    for path in map(Path, paths):
        if not path.exists():
            problems.append(f"{path}: does not exist")
            continue
        for f in files_under(path):
            text = f.read_text(encoding="utf-8", errors="replace")
            for _, hit in find(text):
                problems.append(f"{f}: {hit!r}")
    return problems


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    problems = check(argv or DEFAULT_PATHS)
    if problems:
        print("\n".join(problems), file=sys.stderr)
        print("Wording check FAILED. Use the sentences in evidence/claims.yaml.", file=sys.stderr)
        return 1
    print("Wording check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
