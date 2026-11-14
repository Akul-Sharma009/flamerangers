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

## Run the service

Without a store, the service answers every endpoint from the contract fixture (placeholder data):

```bash
uv run uvicorn burncal.service.app:app --port 8000
curl http://localhost:8000/meta
```

With a published store in `store/published/` (or any folder named by `BURNCAL_STORE_ROOT`), `/meta`, `/calendar`, `/cells` and both CSVs answer from the record and `/meta` says `placeholder: false`. Point the web at it with `VITE_SERVICE_BASE_URL=http://localhost:8000` and allow the web's origin with `CORS_ORIGINS` (default `http://localhost:5173`).

## Rebuild the store for one region

Each step prints counts only and never prints the key. Regions are the `region_id`s in `contract/regions.geojson`; every build covers whole 5° tiles around the region. `<dt>` is the store's data-through date (for example `2026-11-13`).

1. **Land layer** (once): Natural Earth 1:10m land v5.1.1 as GeoJSON, sha256 `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416`.

   ```bash
   mkdir -p store/static
   curl -L -o store/static/ne_10m_land_v5.1.1.geojson \
     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_land.geojson
   shasum -a 256 store/static/ne_10m_land_v5.1.1.geojson
   ```

2. **Download** from FIRMS (needs `FIRMS_MAP_KEY` in `.env`). Rerun until it reports no failed years; it skips what it already has.

   ```bash
   uv run python -m burncal.pipeline.download punjab store/raw/punjab <dt>
   ```

3. **Clean** (marks offshore and static rows; refuses to run without every static-mask year), **convert** (weights) and **aggregate** (grids and flags):

   ```bash
   uv run python -m burncal.pipeline.build_extent store/raw/punjab store/static/ne_10m_land_v5.1.1.geojson store/clean/punjab
   uv run python -m burncal.pipeline.convert store/clean/punjab store/record/punjab store/raw/punjab/coverage.json
   uv run python -m burncal.pipeline.aggregate store/record/punjab store/grids/punjab <dt>
   ```

4. **Publish** a version and switch the pointer. Converted counts (from January 2022) are published only if the C1 parity check passes, which needs `BURNCAL_PARITY_CASE_DIR` pointing at the parity case kept in the planning record. Several regions go into one version by listing each `record,grids,raw` triple.

   ```bash
   uv run python -m burncal.pipeline.publish store/published <dt> store/record/punjab,store/grids/punjab,store/raw/punjab
   ```

5. **Check** that the calendar, both CSVs and the hotspot rows agree:

   ```bash
   uv run python tools/check_numbers.py store/published
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
