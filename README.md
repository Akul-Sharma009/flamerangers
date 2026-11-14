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

## Frozen inputs

`burncal/core/params/` holds the conversion method's frozen parameters and the targets the code is checked against:

- `c1_params.json` and its hash in `c1_params.sha256`
- `parity/`: saved predictions that `burncal/core` must reproduce within 1e-6 before any converted count is published
- `thresholds_1deg.*`: the 1° anomaly-flag thresholds
- `sumatra_aqua_tuning_counts*`: Sumatra's Aqua counts for the tuning years

`burncal/core/params/MANIFEST.json` lists a hash for each of these. It also lists two intermediate CSVs (`intermediate/rows_sumatra_201509.csv` and `intermediate/footprints_sumatra_201509.csv`, with their `README.txt`). Those are 37 MB of debugging aids that stay in the planning repo; they are not part of this repo.

`evidence/scoring/` holds the scoring outputs, copied unchanged, with hashes in its own `MANIFEST.json`. They contain scores only. Never edit files in either folder.

## Status

See [docs/handoff.md](docs/handoff.md).
