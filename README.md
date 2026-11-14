# Harmonized burning activity calendar

A public calendar of satellite fire hotspots for any land area, from July 2002 to now, on one consistent scale across the MODIS and VIIRS record.

## Setup (fresh clone)

Requirements: Python 3.14 and [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env          # then add your own FIRMS_MAP_KEY to .env (never commit it)
uv sync                       # installs the pinned Python dependencies
uv run python tools/check_imports.py
uv run pytest
```

Install the secret-scan hook once:

```bash
brew install gitleaks
uvx pre-commit install
```

## Layout

- `contract/`: the API contract and the Sumatra fixture (written first, changed only by both owners).
- `burncal/core/`: pure functions (cleaning, C1, grids, statistics, flags). No file, network or clock access.
- `burncal/pipeline/`: ingest, clean, convert, aggregate, publish. The only code that reads a key.
- `burncal/service/`: read-only API over one store version.
- `evidence/`: scoring outputs and the evidence pages.
- `web/`: the frontend.

## Status

See [docs/handoff.md](docs/handoff.md).
