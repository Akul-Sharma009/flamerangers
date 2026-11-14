# Handoff

Short running status for the next session. Facts only; decisions and their status are in `DECISIONS.md`, story status in `sprint-status.yaml`.

Updated: Sat 14 Nov 2026, afternoon SGT (Story 1.5).

## Where things stand

| Story | Status | Notes |
| --- | --- | --- |
| 1.1 Repo scaffold | Done | Reviewed by the lead |
| 1.2 Contract and fixture | Done | Contract 0.2.0 is frozen (14 Nov). A change needs both owners and a version bump. |
| 1.4 UI concept | Done | `UI-CONCEPT.md` in the planning record |
| 1.3 Service stub | Review | On contract 0.2.0; Vercel trial measured (see below) |
| 2.1 C1 parameters | Done | In `burncal/core/params/`; Story 2.2 is unblocked |
| 1.5 Web shell | Review | Draws Sumatra from the fixture; not committed yet. See below. |

Branches: `teammate/1.1-scaffold`, then `teammate/1.2-contract`, then `lead/1.1-setup` on top. Nothing is merged to `master` yet.

## What exists

- **Scaffold.** Pinned Python environment (`uv sync`), pinned web app in `web/` (Node 26, Vite, React, TypeScript 7), gitleaks hook, import check (`tools/check_imports.py`), stack smoke tests. Every pin in the plan's Stack table held.
- **Frozen inputs.** `burncal/core/params/` (C1 parameters, parity targets, flag thresholds, Sumatra tuning counts) and `evidence/scoring/` (four scoring runs). Hashes are in each folder's `MANIFEST.json`.
- **Contract 0.2.0** in `contract/`: `openapi.yaml`, fixtures, `messages.yaml`, `regions.geojson`, `CSV_SPEC.md`, `evidence.schema.json`. See `contract/README.md`.
- **Generated files.** `contract/fixture/` comes from `tools/build_fixture.py`. `web/src/api/schema.d.ts` comes from `npm run gen:types` (needs the network; see `DECISIONS.md`). Regenerate both after any contract change.

## How to check everything

```bash
uv sync
uv run pytest
uv run python tools/check_imports.py
cd web && npm install && npm run typecheck && npm run test && npm run build
```

## Story 1.3: service stub (branch `teammate/1.3-service-stub`, on top of `lead/1.1-setup`)

- `burncal/service/app.py` answers every contract 0.2.0 endpoint from `contract/fixture/` when there is no store: `GET /meta`, and `POST /calendar`, `/cells`, `/hotspots.csv`, `/analytics.csv` with JSON bodies. Run: `uv run uvicorn burncal.service.app:app --port 8000`, then open `http://localhost:8000/meta`.
- An old `record_version` gets `410` with `problems/version_superseded.json`. A malformed body gets `400` problem+json, never `422` (see `DECISIONS.md`).
- Both CSVs follow `contract/CSV_SPEC.md`: header block, column line, rows; `null` is an empty cell. `counting_limits` and `citation` are stand-ins until Stories 5.7 and 6.1 (see `DECISIONS.md`).
- CORS: exact origins from `CORS_ORIGINS` (comma-separated, not a secret), default `http://localhost:5173`, GET and POST. The service reads no other environment variable.
- `Dockerfile` for a container host: non-root user, listens on `$PORT` (default 7860), `.env` kept out by `.dockerignore`.
- Checks: `uv run pytest` 56 passed (13 of them service tests); import check passed.
- The hosted trial below still runs the contract 0.1.0 stub.

### Hosted trial: Vercel (Hobby, free), 14 Nov

Trial only; the lead chooses and owns the final host. Public URL: `https://burncal-stub.vercel.app` (the per-deployment URLs sit behind Vercel's sign-in). Deployed as a Python function (not a container): Python 3.14, the pinned runtime dependencies from `pyproject.toml`, region iad1.

| Measure | Result |
| --- | --- |
| Build | 12 s; bundle 343 MB, over Vercel's standard size, so dependencies are installed when an instance starts |
| Cold start | 4.9 s for the first request after 20 idle minutes, from Singapore (then 0.28 s). Of that, 2.8 s is the dependency install on each new instance (runtime log) |
| Warm request from Singapore | 0.28 to 0.59 s (mostly the round trip to iad1) |
| Memory | about 2.2 GB available, 2 vCPU; 156 MB used with fastapi, duckdb, pyarrow, pandas, shapely and numpy loaded |
| Disk | `/tmp` 525 MB, of which 158 MB free after the dependency install; everything else is read-only |
| Endpoints | all five answer `200`; old `record_version` gives `410`; `placeholder: true` |
| CORS | `http://localhost:5173` allowed; other origins get no CORS header |
| Secrets | no environment variables set on the project |

What it means for the real service: the store (5 to 15 GB) cannot sit on this host's disk. It would need object storage read over the network, and the bundle is already close to the 500 MB limit. A container host with a mounted disk avoids both.

Not in the repo: the Vercel trial used a two-line `index.py` entrypoint and a `requirements.txt` with the same pins. A throwaway project `burncal-probe` measured the limits.

| Criterion | Test or evidence |
| --- | --- |
| AC1 answers every endpoint from the fixture | `test_1_3_ac1_every_contract_path_is_answered`, `..._meta_is_the_fixture_and_a_placeholder`, `..._calendar_is_the_fixture_and_valid`, `..._cells_is_the_fixture_and_valid`, `..._analytics_csv_follows_the_spec`, `..._hotspots_csv_follows_the_spec` |
| AC1 contract tests pass | `uv run pytest contract`, plus schema checks inside the service tests; `..._old_record_version_gets_410_problem`, `..._malformed_request_gets_400_problem_not_422` |
| AC2 cold start, memory, disk on a host | Hosted trial table above (Vercel) |
| AC3 CORS web origin and localhost only | `test_1_3_ac3_cors_allows_each_listed_origin`, `..._cors_refuses_unlisted_origins`, `..._cors_defaults_to_local_web_only`; checked on the hosted URL |
| AC3 no secret on the host | `test_1_3_ac3_service_reads_no_secret`; hosted project has no environment variables |

## Story 1.5: the web shell

- `cd web && npm run dev` opens the calendar page: placeholder banner, top navigation (calendar, evidence stub, about stub), Sumatra's year × month grid drawn with D3, and the legend.
- With `VITE_SERVICE_BASE_URL` unset the app reads `contract/fixture/`. Set it to the service's address to use the real service; nothing else changes.
- Words for states, cautions and problems come from `contract/messages.yaml`, parsed at build time (`yaml` devDependency, see `DECISIONS.md`).
- Checked in the browser at 1280 px and 375 px: newest year at the top, the 2021/2022 rule with its note, hatching for months outside the record, the month to date outlined, and no horizontal scroll at 375 px.
- Not done: hero sentence and ruler (Story 3.7), plain-table view, colour-vision check (Story 3.10), and a legend label for an incomplete year's hollow bar, which `messages.yaml` lacks. There is also no sentence for "service unreachable"; the page shows interim words, marked TODO in `web/src/pages/CalendarPage.tsx`.

## Contract 0.2.0: what changed from the first draft

The first draft passed its tests but an independent review found it could not carry the product. The rewrite:

- `POST` with a JSON body for `/calendar`, `/cells` and both CSVs; `record_version` required in each; `aoi_id` returned.
- A `current_month` object for the card: count to date, same-days median, ratio, difference, the day, the reference years and each year's same-days count.
- Year totals, calendar-month medians, rankings with values and ranks, colour and anomaly class breaks, and each month's class, all served.
- Two periods served separately: `reference_period` and `flag_reference_years`.
- Structured provenance: `source`, `inputs` (satellite, quality, days, feeds the record) and evidence-class counts.
- Errors as `application/problem+json` with the plan's six codes; scale cautions inside the answer.
- The plan's names: `cells_flagged_strong`, `cells_flagged_marginal`, `cells_total`; `AQUA`, `TERRA`, `SNPP`, `NOAA20`, `NOAA21`; cells by `sw_lon`, `sw_lat`.
- Closed schemas, so a misspelt field fails, and tests that scan every enum in the document.

The points where the plan left room are listed in `DECISIONS.md` ("Contract 0.2.0"). Both owners have agreed to them.

## Next

1. Data owner: Story 1.3 (service stub answering from `contract/fixture/`) and Story 2.2 (C1 in `core`, parity within 1e-6).
2. Lead: review and commit Story 1.5, then the evidence track from Story 5.1.

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

## Things to keep in mind

- The scoring harness ran on Python 3.12.15, numpy 2.5.4 and pandas 3.1.1; the product pins Python 3.14. Check this first if the parity check misses.
- No converted count is published until the parity check passes.
- Product tests sit beside the code. The scoring harness stays in the planning record and nothing here imports it.
- Starlette warns that `httpx` in its test client is deprecated in favour of `httpx2`. Not acted on.
