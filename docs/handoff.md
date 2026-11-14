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

## Lead setup (branch `lead/1.1-setup`, on top of `teammate/1.2-contract`)

- `burncal/core/params/`: C1's frozen parameters (`c1_params.json`, verified against `c1_params.sha256`), the parity targets (`parity/`), the 1° flag thresholds and Sumatra's Aqua tuning-year counts. All 16 files match the hashes in `MANIFEST.json`. That manifest also lists three files under `intermediate/` that stay in the planning repo. Story 2.2 is no longer blocked on these.
- `evidence/scoring/`: four scoring runs (two selection, final, reported-only), `.json` and `.txt` each, copied unchanged, with a `MANIFEST.json` of SHA-256 hashes. Checked: aggregate scores only.
- `sprint-status.yaml` at the repo root is now the live copy. `DECISIONS.md` holds build-time decisions. `CLAUDE.md` holds the project rules.
- `.gitignore` now covers `store/` and `CLAUDE.local.md`.
- `tools/check_imports.py` now resolves relative imports, so `from ..pipeline import x` inside `core` fails the check.
- Answer to the open question on `tests/`: the architecture's convention is that product tests sit beside the code (`test_*.py`, `*.test.ts`); the scoring harness stays in the planning repo and nothing here imports it.
- The scoring harness ran on Python 3.12.15, numpy 2.5.4 and pandas 3.1.1; the product pins Python 3.14. Check this first if the parity check misses.

## Still open in Story 1.1

- The web scaffold with pinned versions, and the stack smoke test (web types generated from a two-field OpenAPI file, one FastAPI route on the pinned versions).

## Checkpoints (flags, not deadlines; times in SGT)

| When | What should be true | Flag to |
| --- | --- | --- |
| Sat 12:00 | Story 1.3's measurements are in and a host is chosen | Lead |
| Sat 18:00 | Story 2.2's parity check passes for 4A, 1A and the blend | Data owner, then lead |
| Sat 21:00 | Sumatra works end to end on the hosted link (Story 2.6) | Data owner |
| Sat 21:00 | The pitch storyline is drafted (Story 6.6) | Lead |
| Sun 09:00 | The six evaluated regions are published (Story 2.8) | Data owner |
| Before any global run | One global year is measured for size, download time and quota | Lead |
| Sun 15:00 | Stories 6.5 and 6.1 are started | Lead, data owner |
| Sun 15:00 | The planning documents the evidence view links to are copied into `docs/planning/`, after the lead has read each | Lead |
