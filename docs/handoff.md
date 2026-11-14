# Handoff (public-safe)

## Story 1.1: scaffold (branch `teammate/1.1-scaffold`, not yet merged)

- Layout, pins (Python 3.14, uv, FastAPI, DuckDB, pyarrow, Shapely, numpy, pandas), `.env.example` with an empty `FIRMS_MAP_KEY`, gitleaks hook (v8.30.1), import check at `tools/check_imports.py`.
- Open: whether `tests/` lives in this repo. The planning notes say it stays in the planning repo; Story 1.1's text says the folder is unchanged. Decide with Akul.

## Build log

- **14 Nov, 12:30 SGT.** Story 1.1 done on `teammate/1.1-scaffold`, commit `6fde700`, pushed.
  - Checks run: pinned dependencies install, import check passes and catches a bad import, gitleaks hook passes, gitleaks finds no secrets in the repo and flags a planted fake key.
  - Open for Akul: where `tests/` lives. Story 1.1 says the folder stays unchanged; the planning notes keep the tests in the planning record. Until he decides, test code sits under each package.
  - Next: Story 1.2 (contract and fixture), co-written with Akul.

## Story 1.2: contract and fixture (branch `teammate/1.2-contract`, DRAFT)

- Written: `contract/openapi.yaml` (endpoints `/meta`, `/calendar`, `/cells`, `/hotspots.csv`, `/analytics.csv`), Sumatra fixtures in `contract/fixture/`, and `contract/test_contract.py`.
- Checks: `uv run pytest contract` passes 12 of 12. The spec is valid, each fixture validates, and every enum value and the named problem codes appear in a fixture.
- Not yet written, so Story 1.2 is not finished: `contract/CSV_SPEC.md` (CSV columns), `messages.yaml`, `regions.geojson`, and the `evidence.json` schema.
- Needs Akul to agree before freezing: the problem codes marked PROPOSED in `openapi.yaml`, and the response shapes, which he has not reviewed.
