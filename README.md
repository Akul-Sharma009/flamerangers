# Harmonized burning activity calendar

A public calendar of satellite hotspots for any land area, from July 2002 to now, on one consistent scale across the MODIS and VIIRS record.

A hotspot is one satellite detection of heat. Hotspot counts measure burning activity, not the number of burns.

## Setup (fresh clone)

Requirements: Python 3.14 and [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env          # then add your own FIRMS_MAP_KEY to .env (never commit it)
uv sync                       # installs the pinned Python dependencies
uv run python tools/check_imports.py
uv run pytest
```

The web app needs Node 26:

```bash
cd web
npm install
npm run test
npm run build
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

The parity check also needs its input case, which is kept in the planning record and is not public. So a fresh clone can build and serve the Aqua counts through December 2021, but cannot publish converted counts from January 2022; the published record holds those.

`evidence/scoring/` holds the scoring outputs, copied unchanged, with hashes in its own `MANIFEST.json`. They contain scores only. Never edit files in either folder.

## Run the web against the fixture

The web needs no service to run. With `VITE_SERVICE_BASE_URL` unset or empty, it reads the contract fixture in `contract/fixture/` directly: a placeholder Sumatra record, under a banner saying the numbers are invented. The two CSV downloads need the service.

```bash
cd web
npm install
npm run dev                   # http://localhost:5173
```

Don't copy `web/.env.example` for this: it sets `VITE_SERVICE_BASE_URL=http://localhost:8000`, which points the web at a running service instead.

To run the web against the service answering from the same fixture, start the service with no store (see "Run the service", or `uv run uvicorn burncal.service.app:app --port 8000` from the repo root), then:

```bash
cd web
VITE_SERVICE_BASE_URL=http://localhost:8000 npm run dev
```

The service allows `http://localhost:5173` by default (`CORS_ORIGINS`). In fixture mode it answers every area with the fixture's placeholder Sumatra record, including the CSV downloads, and refuses any other record version.

The pages are `#/` (the calendar), `#/evidence` (how the conversion was chosen and tested) and `#/about` (about the data).

## Rebuild the evidence

`evidence/build.py` writes `web/src/evidence/evidence.json`, everything the evidence page shows. It reads each number from a field in the scoring files in `evidence/scoring/` (copied unchanged; hashes in `evidence/scoring/MANIFEST.json`), and from the fixed sentences in `evidence/claims.yaml`. Nothing is typed in or recomputed, and no data download or key is needed.

```bash
uv run python evidence/build.py            # write web/src/evidence/evidence.json
uv run python evidence/build.py --check    # fail if it is stale, breaks contract/evidence.schema.json, or any figure differs from its source
uv run pytest evidence                     # the claims and the build, checked against the scoring files
```

Then rebuild the web and check its words:

```bash
cd web && npm run build && cd ..
uv run python evidence/wording.py          # fail on banned wording in README.md or web/dist
```

Run the build after any change to `claims.yaml`. The scoring files are never edited. They come unchanged from the run that chose and tested the conversion, which is kept in the planning record.

## Status

See [docs/handoff.md](docs/handoff.md).
