# Handoff

Short running status for the next session. Facts only; decisions and their status are in `DECISIONS.md`, story status in `sprint-status.yaml`.

Updated: Sat 14 Nov 2026, late evening SGT (PRs 3 to 11 merged; the lead's review list is under Next).

## Where things stand

| Story | Status | Notes |
| --- | --- | --- |
| 1.1 Repo scaffold | Done | Reviewed by the lead |
| 1.2 Contract and fixture | Done | Contract 0.2.0 is frozen (14 Nov). A change needs both owners and a version bump. |
| 1.4 UI concept | Done | `UI-CONCEPT.md` in the planning record |
| 1.3 Service stub | Done | On contract 0.2.0; Vercel trial measured (see below). Merged (PR 1) |
| 2.1 C1 parameters | Done | In `burncal/core/params/` |
| 2.2 C1 in core | Done | Full parity PASS on the lead's machine (worst miss 2.1e-9). Merged (PR 2) |
| 1.5 Web shell | Done | Acceptance criteria checked on the live site (15 Nov): https://burncal-web-eight.vercel.app. See below. |
| 5.1 Scoring files and claims | Done | `evidence/claims.yaml` written and checked; the lead approved the wording. See below. |
| 6.2 README and fresh-clone run | In progress | Lead's sections (web against the fixture, evidence rebuild) on `lead/6-2-readme`; the data owner's (run the service, rebuild one region) on `teammate/2.8-coverage` (6384b21). See below. |
| 6.6 Pitch storyline | Done | Drafted in `docs/pitch/storyline.md` as a 7-slide deck. See below. |
| 5.2 Evidence build and checks | Done | Merged to `master`. See below. |
| 5.3 The outcome in plain words | Done | Merged to `master`. See below. |
| 5.4 Head-to-head table | Done | Reviewed by the lead and merged to master. See below. |
| 5.5 Aqua only and the incumbent | Done | Merged 15 Nov. The claim `aqua-only-every-method-failed-precision` was approved and added; the section's copy was approved with it. See below. |
| 5.6 What the scores can't show | Done | Merged 15 Nov. The lead approved the copy and the tiers claim `tiers-not-checked-everywhere`. NOAA-20 says "not yet run" until Story 2.10 writes its file. See below. |
| 5.7 About-the-data page | Done | Merged 15 Nov. The lead approved the copy. The counting limits switch to the contract's `counting_limits` list once 0.4.0 merges (the CSV headers too). The four `[pending: Story 6.1]` citation marks show on the public page and must be replaced before submission. See below. |
| 3.3 Select an area | Done | Reviewed by the lead and merged to master. See below. |
| 3.5 The burning activity calendar | Done | Merged 14 Nov. See below. |
| 3.4 Select a date range | Done | Merged 14 Nov. Its refused-range sentences and the reference-period note arrived with contract 0.4.0 (merged 15 Nov). |
| 3.7 Current-month card | Done | Merged 14 Nov. Its sentences and the missing-days note arrived with contract 0.4.0 (merged 15 Nov); the NOAA-20 comparison waits for Story 2.10 (see below). |
| 3.6 Provenance and evidence caveats | Done | Merged 15 Nov. The caveat claims are approved and in use; `notes.month_complete` is approved and in the contract 0.4.0 draft, so complete months show no sentence until 0.4.0 merges. The caveat on an untuned area was checked in the browser before the claims were reworded, not after. See below. |
| 3.8 Anomaly view and flags | Done | Merged 15 Nov. The lead approved flags per tier out of M, marks on both tiers, and six sentences now in the contract 0.4.0 draft; labels show until 0.4.0 merges. The 1° cell panel is not yet checked against a live service. See below. |
| 3.9 Most active months and years | Done | Merged 15 Nov. The lead approved the left-column placement (a recorded change from UI-CONCEPT.md), the "=" tie mark and the phone scroll; its four sentences are in the 0.4.0 draft. See below. |
| 4.3 Picture downloads | Done | Merged 15 Nov. The calendar and the current-month ruler download as PNG or SVG with their provenance. The lead approved the web's own source line, title and two error lines, marked for a later contract. See below. |
| 4.4 Download controls | Done | Merged 15 Nov. One Downloads block (analytics CSV, hotspot CSV with all-satellites and the 413 one-year fallback, both pictures). Its web-worded lines are approved by the lead (see `DECISIONS.md`, Story 4.4). A real CSV download and a live 413 are not yet tried against a service. See below. |
| 2.3 Ingest and cleaning | Done | PR 3, merged 14 Nov |
| 2.4 Weights and the record | Done | PR 4, merged 14 Nov, with the weaker-class tie rule (225 / 570 / 6 / 38); full C1 parity PASS |
| 2.5 Grids, thresholds, flags | In progress | PR 5, merged 14 Nov. Open: AC2 results for Australia and Amazon not recorded; static-input check (Next) |
| 2.6 Publish and serve | In progress | PR 6, merged 14 Nov. Open: AD-2 publish gate, AC6 hosted p95 (Next) |
| 3.1 Statistics | Done | PR 7, merged 14 Nov |
| 3.2 Flags and current month | Done | PR 8, merged 14 Nov |
| 2.7 and 4.2 Hotspots and CSV | Done | PR 9, merged 14 Nov; an empty search now gives a header and no rows (was a 500) |
| 4.1 Analytics CSV | Done | PR 10, merged 14 Nov |
| 4.5 Numbers-agree check | Done | PR 11, merged 14 Nov |
| 6.5 Demo assets and submission text | In progress | Text draft merged 15 Nov (`docs/submission/`); the lead approved its choices. Its "still to come" list predates 3.6 and 5.5. Demo assets wait for the deployed app. See below. |

`master` holds every story above. The teammate's branches 2.3 to 4.5 are merged; new work branches from `master`.

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
uv run python evidence/build.py --check
uv run python evidence/wording.py   # after npm run build
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

## Story 2.2: C1 in core (branch `teammate/2.2-c1-core`)

- `burncal/core/c1.py` rebuilds C1 from `burncal/core/params/c1_params.json` alone: the 4A table per row, the 1A view angle, footprints, logistic and miss term, and the season blend. Numpy only; it reads no file, clock or network. `burncal/pipeline/c1_params.py` reads `c1_params.json`, checks its SHA-256 and passes the parsed JSON to `c1.load_params`.
- Row weight = (1 − w) × r4A, plus w × (k × p + miss) on the row that anchors its 1A footprint. Excluded rows form no footprint and weigh 0.
- **Parity, Sumatra September 2015 (the exported case):**

| Method | 1° max abs miss | 0.25° max abs miss | Region-month total |
| --- | --- | --- | --- |
| 4A | 2.9e-10 | 3.1e-11 | 11,656.6 |
| 1A | 4.5e-13 | 8.5e-14 | 11,536.7 |
| C1 | 1.5e-10 | 5.2e-11 | 11,572.7 |

  All are within the 1e-6 tolerance. Footprints, anchors and view angles also match the harness row for row.
- **Full parity (lead runs it, option 1):** the other 23 Sumatra months and Australian grassland and Amazon forest for 2015 and 2018 need the selection-year inputs, which stay on the lead's machine. Command:
  `uv run python tools/parity_full.py --snpp-dir <planning repo>/data/heldout/inputs/processed/snpp`
  It prints aggregate misses only and exits 0 on PASS. **Result on the lead's machine, 14 Nov: PASS** for 4A, 1A and C1 in all three tuning regions at 1° and 0.25°, every month of 2015 and 2018. Worst miss 2.1e-9 (4A, Sumatra, 1°); tolerance 1e-6.
- The parity case is never copied here. To run those tests, set `BURNCAL_PARITY_CASE_DIR` to the planning record's `exports/c1/out/intermediate` folder; without it they are skipped.
- Season rule: `c1.season_months` applies the frozen rule (a month is fire season if it holds at least 10% of the 2003–2011 Aqua annual total). It reproduces the stored seasons for Sumatra, Australian grassland and Amazon forest from `history_aqua_month_totals_2003_2011_by_region`. Other regions get their seasons from their own 2003–2011 Aqua history in Stories 2.4/2.5; until then `blend_weight` refuses them.
- Checks: with the case path set, all 14 Story 2.2 tests pass; without it the 9 case tests are skipped. Import check passed.

| Criterion | Test |
| --- | --- |
| AC1 parity within 1e-6 at 1° and 0.25° for 4A, 1A, C1 | `test_2_2_ac1_parity_sumatra_201509[*]` (6 cases), `..._footprints_match_the_harness`, `..._view_angle_matches_the_harness` |
| AC2 only feeding, non-excluded rows form footprints; 1A term on the anchor | `test_2_2_ac2_excluded_rows_form_no_footprints_and_weigh_nothing` |
| AC3 weight formula; weights sum to the gridded prediction | `test_2_2_ac3_row_weight_formula`, `..._weights_of_a_region_month_sum_to_the_gridded_prediction` |
| AC4 imports nothing from tests; core reads no file | `test_2_2_ac4_c1_imports_no_tests_and_reads_no_file`, `burncal/pipeline/test_c1_params.py`, `tools/check_imports.py` |
| Season rule reproduces the stored seasons (lead's request) | `test_2_2_season_rule_reproduces_the_stored_seasons`, `test_2_2_season_rule_edges` |
| AC5 Sat 18:00 checkpoint report | This entry; full parity by `tools/parity_full.py` on the lead's machine |

## Story 2.3: ingest and cleaning, Sumatra (branch `teammate/2.3-ingest`)

- Run: `uv run python -m burncal.pipeline.build_extent <raw CSV dir> <land GeoJSON> <out dir>`. Prints counts only.
- `burncal/pipeline/ingest.py` normalizes FIRMS area-API CSVs for Aqua, Terra, Suomi NPP, NOAA-20 and NOAA-21. It keeps every FIRMS column (FIRMS's own satellite code as `satellite_firms`) and adds `satellite` (contract enum), `quality` (SP/NRT) and the UTC time. Standard rows replace NRT rows per satellite-day.
- `burncal/core/clean.py` (pure) holds the solar zenith angle and day/night rule (day when the angle is below 85°), the 30 arc-second static cells and `excluded_reason`. `burncal/pipeline/clean.py` handles the land layer. Rows are marked `offshore` (not on Natural Earth 1:10m land, v5.1.1) or `static` (30 arc-second cell with hotspots on 50 or more days in one tuning year, 2014, 2016, 2017 or 2020, from MODIS and Suomi NPP rows on land: the scored rule, lead's decision), never deleted.
- **Sumatra store** (bounding box of the contract polygon, July 2002 to 14 Nov 2026): 2,737,022 rows in, 3,949 NRT rows replaced by standard rows, **2,733,073 rows stored**, 79 MB of Parquet with every column, 77 files. By reason: none 2,603,794; offshore 88,621; static 40,658.
- Known gap, accepted by the lead: NOAA-20 standard data for 7 five-day windows of 2024 (FIRMS errors on every retry; NRT does not cover 2024). NOAA-20 does not feed 2024. To do: `inputs[].days` shows the true day count (2.6), retry once before 2.10, and 2.10 drops those days from both satellites. See `DECISIONS.md`.
- **Comparison with the harness (AC4):** cleaned Aqua counts match the harness exactly: 41,377 detections over 3,600 tuning-year cell-months, 0 differences. Details: `docs/cleaning-differences.md`.
- Checks: `uv run pytest` passes; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 every row kept with FIRMS attributes, `quality`, recomputed `daynight`, `excluded_reason` | `test_2_3_ac1_*` in `burncal/pipeline/test_ingest.py`, `test_build_extent.py`, `burncal/core/test_clean.py`, `burncal/pipeline/test_clean.py`; Sumatra build above |
| AC2 offshore and static rows marked, not deleted | `test_2_3_ac2_*` in the clean tests; `test_2_3_ac1_every_row_kept_with_quality_daynight_and_reason` |
| AC3 standard beats NRT per satellite-day | `test_2_3_ac3_*` in `test_ingest.py` and `test_build_extent.py`; 3,949 NRT rows replaced in the Sumatra build |
| AC4 tuning-year Aqua counts agree, or differences listed with causes | `test_2_3_ac4_*` in `test_compare_tuning.py`; `uv run python -m burncal.pipeline.compare_tuning`; `docs/cleaning-differences.md` |

## Story 6.2: README and fresh-clone run, data side (15 Nov)

- README gains "Run the service" and "Rebuild the store for one region" (land layer, download, clean, convert, aggregate, publish, check). New `burncal/pipeline/download.py` (`uv run python -m burncal.pipeline.download <region_id> <raw dir> <data_through>`) downloads one region on whole tiles, resumably, and writes `coverage.json`; before this the download lived only in throwaway scripts.
- **Fresh clone on the data owner's machine (15 Nov):** `uv sync`, import check, `uv run pytest` (317 passed, 13 skipped for want of a local store); the service in fixture mode answered `/meta`; the land layer downloaded with the stated hash; clean, convert, aggregate, publish and `tools/check_numbers.py` ran for Amazon forest from its downloaded files (Aqua through 2020, so no parity case needed): 1,316,333 rows, 0 disagreements over 228 months; `web/`: `npm ci`, 71 tests passed, build passed (npm notes that some packages' install scripts were not run).
- Not checked from the clone: the download step itself (its plan and coverage file are unit-tested; a whole region takes hours), and publishing converted counts (needs the parity case from the planning record).
- The web-against-fixture and evidence-rebuild sections are the lead's.

## Story 6.3: data-side security checks (15 Nov; Story 6.3 is the lead's)

| Check | Result |
| --- | --- |
| gitleaks, full history (`gitleaks git . --log-opts=--all`) | 54 commits, all branches: no leaks |
| gitleaks, working tree (`gitleaks dir .`) | 1 hit: `.env` (the FIRMS key), git-ignored and never committed |
| `pip-audit` on every pinned Python package (`uv export --all-groups`) | No known vulnerabilities |
| `npm audit` in `web/` | 0 vulnerabilities (with and without dev dependencies) |
| Notebooks | None in the repo |
| Local paths (`/Users/`, `/private/tmp`, `/home/`) in any pushed branch | None |
| Keys | `FIRMS_MAP_KEY` appears only empty in `.env.example` and as a dummy in a test |
| Hosted service (Vercel `burncal-stub`) | No environment variables; the service reads no secret |

- For the lead before the repo goes public: the data owner's Hugging Face account name appears in old, already-merged story branches (`teammate/1.3`, `2.3` to `2.7`) and so in git history, in the trial dataset's name; not in master or any current file. `LICENSE` names the lead's account as copyright holder. Deleting the merged branches, or leaving history as it is, is the lead's call.
- Not run by the data owner (the lead runs reviews): `/security-review`, `/codex:review`, copying the three planning files, ticking `GUARDRAILS.md`.

## Story 2.6 AC6 and hosting: the real service on Vercel (15 Nov)

- Live at `https://burncal-stub.vercel.app` (Vercel Hobby, Python 3.14, the lead's choice). Serving version `20261113-3d2a8f8c` (Sumatra, built before the 15 Nov review fixes; the whole-tile rebuild replaces it). No environment variables yet: `CORS_ORIGINS` waits for the web's origin.
- **How the store gets there:** copied from a public Hugging Face dataset into `/tmp` when an instance starts (`burncal/service/remote.py`): the pointer, then for the current and previous versions everything a calendar needs (31 MB for Sumatra). Hotspot record files (81 MB for Sumatra) are fetched the first time a request needs them. The deployment itself carries only code and contract files; its entry point (`index.py`, which names the dataset URL) and `requirements.txt` live outside the repo.
- **Measured (15 Nov, from Singapore; the function ran in sin1):**

| Measure | Result |
| --- | --- |
| Memory, current version loaded | 643 MB steady, 880 MB peak (runtime log). Two Sumatra versions locally: 1,025 MB steady, 1,172 MB peak; on Vercel expected about 1.1 GB and 1.3 GB, under the 2 GB limit. |
| `/tmp` free after sync | 194 MB |
| Cold start | 8.3 s for the first request to a new deployment (inside: imports 1.3 s, store sync 1.0–1.2 s, loading 1.5 s; the rest is the dependency install on a new instance) |
| **2.6 AC6**: 20 Sumatra calendars | p50 0.82 s, **p95 1.09 s** against 3 s; max 1.11 s |

- **Redeployed 14 Nov, whole-tile Sumatra** (`20261113-9cedd502`, built only from the planned files; see `DECISIONS.md`): parity PASS (worst 2.9e-10), `check_numbers` 0 failures over 300 months, threshold parity 899/900 (the known September cell). Hosted: `/meta` placeholder false; 20 calendars p50 0.88 s, **p95 1.12 s**, max 1.17 s; start-up log RSS 275 MB, `/tmp` free 106 MB with two versions synced (53 MB); cold first request 8.1 s. The deploy folder (code, `contract/messages.yaml`, `regions.geojson`, fixture problems, `index.py`, pinned `requirements.txt` with duckdb, `.python-version` 3.14, `.vercelignore`) is rebuilt outside the repo for each deploy.
- **Codex review items** (14 Nov, `DECISIONS.md`): the parity pass carries the params hash and code revision, and publish refuses uncommitted `burncal/` code; publish loads a version before the pointer names it; the service loads (and the host syncs) the previous version only when a request names it. Deployed 15 Nov (code `ec595a1`): start-up sync 0.5 s, RSS 250 MB, `/tmp` free 137 MB (was 1.7–2.1 s, 275 MB, 106 MB); 20 Sumatra calendars p50 0.82 s, p95 1.07 s; a request naming the previous version 4.8 s the first time (fetch and load), then about 2.8 s (older format, key computed in the query).
- **Six regions: fixed.** The service now reads hotspots from disk with DuckDB (`DECISIONS.md`, 15 Nov), so memory no longer grows with the area: two Sumatra versions take 217 MB steady (was 1,025 MB). Not yet deployed: the next deploy needs `duckdb` in the deploy requirements and a version published in the new format.

## Story 2.8: coverage for the six evaluated regions (branch `teammate/2.8-coverage`; six regions done, world waits for the lead)

- All six regions downloaded on whole 5° tiles (every planned file; Southern Africa and Australia needed 2 and 3 passes), staged from the planned files only, built, and published together as `20261113-d6f8b9e6` in the local store. **Not deployed:** the start-up sync would be 901 MB against the 120 MB gate. Sizes per region and four options for the lead are in `DECISIONS.md` (Story 2.8, 15 Nov). The hosted service still serves Sumatra only.
- `tools/check_numbers.py` now checks every region the version holds: 0 failures for all six and the Amazon polygon. Threshold parity: Sumatra 899/900, Amazon 672/672, Australia 967/972. Australia's 5 misses are not the static mask (rebuilt with Suomi NPP 2016); a coastline difference is likelier, not yet checked.
- Largest area served locally: Southern Africa's whole 15×15° extent, p50 1.15 s (target 10 s). Hosted, add about 0.8 s.
- Option 1 measured (points read remotely from the public dataset, from Singapore): exact counts; first request 5–43 s, 9 of 12 areas over 10 s; repeats 0.35–0.67 s. Details in `DECISIONS.md` (Story 2.8).
- **Option 1 chosen by the lead (15 Nov).** The service can read points from the store URL (`create_app(points_location=...)`, `remote.sync(with_points=False)`), with 16 DuckDB threads for remote reads. The 1° block re-sort was tried and dropped (worst first request 92 s at 2 threads, 19.6 s at 16, against 10.8 s for the old layout at 16). Adopted: region polygons 3.0–8.6 s first request, whole extents 3.4–10.8 s (Siberia's whole extent the one over 10 s), repeats 0.3–0.7 s; counts identical before and after over all 12 areas. Deployed 15 Nov and **rolled back**: Hugging Face rate-limited the host's range requests (429, 3,000 requests per 5 minutes per IP, anonymous), so first requests took 4–32 s and one request failed with a 500. Live again on Sumatra (p95 0.95 s). The next step needs the lead: a token (a secret), another object store (a new account), or serving the regions that fit. The `/tmp` cache fallback is not built (it cannot speed up a cold first request). The host bundle needs `duckdb_ext/httpfs.duckdb_extension` for linux.
- To rebuild: download each region (`burncal.pipeline.download`), link its planned files into `store/staged/<region_id>/` (the extent's name in the version is that folder's name), then clean, convert, aggregate as in the README with outputs under `store/build/`, and publish all six triples in one command. Peak memory 4.4 GB (Southern Africa).

### 2.8 AC2: global history planned from a measured sample (15 Nov; no global download made)

- **Country files (no key):** the last year is **2025**, complete to 31 December 2025, standard processing (MODIS version 61.03, VIIRS version 2), for MODIS (`modis`), Suomi NPP (`viirs-snpp`) and NOAA-20 (`viirs-jpss1`). There is no 2026 file, and NOAA-21 (`viirs-jpss2`) has no country files at all. Each year also exists as one all-countries zip (`data/country/zips/<source>_<year>_all_countries.zip`): MODIS 65–90 MB a year (2002–2025), Suomi NPP 307–385 MB (2012–2025), NOAA-20 260–401 MB (2018–2025). Checked with HEAD and byte-range requests only.
- **Area API (key):** quota 5,000 transactions per 10 minutes. Measured: a request costs **2 transactions per day of range**, whatever the area (100 to 525 deg²) or the rows (294 to 27,641). Whether a world-sized request costs the same is not measured.
- **Rows:** our CSVs compress to 16.3–17.5 bytes a row (zip), so the all-countries zips hold about 4.7M MODIS and about 21M rows a year for each VIIRS satellite (Southern Africa's 4.3 GB raw folder checks out at this rate: 54M rows).
- **Estimates, July 2002 to 13 November 2026, area API, world:**

| Scope | 5-day requests | Transactions | Quota-bound time | Rows | CSV | Download at 0.6–2 MB/s | Store version (six-region ratios) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| All five satellites, every day | 3,763 | 37,612 | 1.3 h | about 680M | about 54 GB | 25 h to 7.5 h | about 25 GB (points 8 GB) |
| The product's plan (as the six regions) | 2,785 | 27,818 | 0.9 h | about 400M | about 31 GB | 14 h to 4 h | about 15 GB (points 4 GB) |

- The download rate was measured on Southern Africa (4.3 GB in 1.9 h, 0.62 MB/s with 4 workers while other downloads ran); smaller regions were slower per byte because each request is small. A world request carries about 290,000 VIIRS rows (23 MB) per 5 days, so the rate is likelier bandwidth-bound; the upper figure is not measured.
- **What it means:** the raw CSVs alone (31–54 GB) do not fit on the data owner's disk (29 GB free), and the store version (15–25 GB) does not fit any host measured so far. A world run needs either a pipeline that drops each raw year after building it, or a bigger machine, and a store read by range from object storage. These are the lead's calls (AC3); nothing needs money yet.
- **To confirm before any world run (needs the lead's go-ahead, it is a global download):** one day of each source for the world (8 requests, about 20 MB) measures the weight of a world request and its time.

| Criterion | Test or evidence |
| --- | --- |
| AC1 each region's calendar loads | `test_2_8_ac1_each_region_calendar_loads` (6 regions, every record month non-null) |
| AC1 extents are whole tiles | `test_2_8_ac1_each_region_has_its_own_whole_tile_extent` |
| AC1 outside coverage is `outside_coverage`, never zeros | `test_2_8_ac1_an_area_outside_every_extent_is_outside_coverage_never_zero`; synthetic `test_2_6_outside_coverage_is_404` |
| AC1 numbers agree in every region | `tools/check_numbers.py store/published`; `test_2_8_check_numbers_searches_every_region_the_version_holds` |
| AC1 thresholds | `test_2_5_ac2_*` on the whole-tile builds |
| One version holds several extents | `test_2_8_one_version_holds_several_extents`; `test_2_8_build_one_satellite_year_at_a_time_equals_the_whole_extent` |
| AC2 global plan from a measured sample | 2.8 AC2 above: country files end in 2025; transactions, time and size estimated from regional requests and the all-countries zips. Open: the weight of a world request (needs a one-day world sample) |
| AC3 one global year measured, the lead sees it first | Not done (no global download without the lead) |
| AC4 world run, continental areas against 10 s | Not done; largest served area so far 1.15 s locally |
| AC5 too-large areas reported | Size finding above reported to the lead; no limit added |

## Story 4.5: numbers-agree check (branch `teammate/4.5-numbers-agree`, on top of 4.1)

- `uv run python tools/check_numbers.py [store root]` exits 1 on any disagreement. For Sumatra, an Amazon polygon and the Punjab box over the whole record: every analytics CSV row equals its `/calendar` month field by field, and for every complete month up to December 2021 the hotspot CSV's feeding, kept rows number exactly the harmonized count. A search outside the store's coverage is reported as not loaded.
- `uv run pytest` runs the same check on the synthetic store for all three searches, so a failing check fails the build.
- Published Sumatra version: 0 failures; 300 months and 233 hotspot months compared, in 4 s. Amazon and Punjab are not loaded until Story 2.8.
- Checks: `uv run pytest` 298 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 calendar equals analytics CSV; hotspot rows equal complete months' counts to 2021, three searches | `test_4_5_ac1_*` (3 searches) in `burncal/service/test_store_service.py`; `tools/check_numbers.py` on Sumatra |
| AC2 a failing check fails the build | `test_4_5_ac2_a_failing_check_fails`; the script exits 1 |

## Story 4.1: analytics CSV (branch `teammate/4.1-analytics-csv`, on top of 2.7)

- `/analytics.csv` answers from the store: one row per month of the calendar, built by flattening the same object `/calendar` returns, so every number is identical. Header as `CSV_SPEC.md`. The `citation` line is still a stand-in until Story 6.1.
- Sumatra, July 2002 to 13 Nov 2026: 0.07 s locally.
- Checks: `uv run pytest` 294 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 one row per month with every column; header with query, version, switch, unit, reference period, data-through, limits, citations | `test_4_1_ac1_*` in `burncal/service/test_store_service.py` (citations are a stand-in until Story 6.1) |
| AC2 every number identical to `/calendar` | `test_4_1_ac2_*` |

## Stories 2.7 and 4.2: hotspots for any search, as CSV (branch `teammate/2.7-hotspots`, on top of 3.2)

- `/hotspots.csv` now answers from the store: rows inside the area and the exact dates, every column of `HotspotRow`, header as `CSV_SPEC.md`. Rows of feeding satellites by default, every satellite with `all_satellites: true`. Above 250,000 rows the answer is `413 too_large_for_sync` with the estimate and the years; the web then asks year by year. `/analytics.csv` still answers from the fixture (Story 4.1).
- Sumatra: September 2015 has 12,147 rows, 12,120 of them feeding and kept, equal to the calendar count. Whole record, all satellites: 2,409,453 rows, 413 in 0.25 s. 2019 alone: 24.5 MB in 1.0 s.
- Checks: `uv run pytest` 248 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| 2.7 AC1 every column for rows inside the area and exact dates | `test_2_7_ac1_*` in `burncal/service/test_store_service.py` |
| 2.7 AC2 feeding, kept rows of a complete month up to 2021 equal its count | `test_2_7_ac2_*`; Sumatra September 2015 |
| 4.2 AC1 default feeding rows, option for every satellite, each row states satellite, `feeds_record`, `excluded_reason`, `weight` | `test_4_2_ac1_*` |
| 4.2 AC2 estimate first, then by year; no search refused | `test_4_2_ac2_*` |
| 4.2 AC3 header: row-count note, weight sums to the count, counting limits | `test_4_2_ac3_*` |

## Story 3.2: flags per area and the current-month card (branch `teammate/3.2-flags-current-month`, on top of 3.1)

- `/calendar` serves `current_month`: days 1 to *d* against the median of the same days in each complete reference year, with the ratio (none when the median is 0), the difference, *d*, the reference period, each year's same-days count for the ruler, `quality`, `validated_satellite` and `monthly_validation_only: true`.
- Area flags (`cells_flagged_strong`, `cells_flagged_marginal`, `cells_total`) and `/cells` came with Story 2.6; this story adds their tests.
- Sumatra, data through 13 Nov 2026: 231.4 to date, same-days median 77.0, ratio 3.01, 2 strong cells of 113; NRT, not validated (NOAA-20 feeds from 3 Nov). Calendar p95 locally 0.079 s over 20 requests.
- Checks: `uv run pytest` 243 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 strong, marginal and total over every overlapping 1° cell; no flag on the total | `test_3_2_ac1_*` in `burncal/service/test_store_service.py` |
| AC2 `/cells`: flag state, count, threshold, partly inside, evidence class | `test_3_2_ac2_*`, `test_2_6_cells_answer_from_the_store` |
| AC3 days 1 to *d* against the same-days median; *d*, ratio, difference, monthly-only; each reference year's count | `test_3_2_ac3_*` in `burncal/core/test_stats.py` and `test_store_service.py` |

## Story 3.1: statistics for the calendar (branch `teammate/3.1-statistics`, on top of 2.6)

- `burncal/core/stats.py`: reference median and mean per calendar month (complete months of the reference period only), ratio to the median (none when the median is 0, with `no_typical_activity`), anomaly as a count and a percentage, per-area colour breaks, fixed anomaly breaks, competition ranks with ties, top 5 months and years, busiest calendar months, year totals and the record high. Methods are those of the frozen fixture (`DECISIONS.md`, Story 3.1).
- `/calendar` now serves all of these from the store. The service rounds once (counts 1 decimal, ratios and percentages 2) and states the reference period. The current-month card is still null (Story 3.2).
- Sumatra: record high September 2015 (12,120.0, 5.0 × the September median of 2,424.0); top years 2006 (39,244.0) and 2015 (36,027.0); September is the busiest calendar month. Calendar answer in 0.05 s locally.
- Checks: `uv run pytest` 238 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 median and reference mean over complete prior years, anomaly count and %, year totals, medians, breaks, area, top 5 months and years, busiest months, ties as ties | `test_3_1_ac1_*` in `burncal/core/test_stats.py` |
| AC2 cut, July 2002, current and missing-days months keep whole-month counts; only complete months and years ranked or in the reference | `test_3_1_ac2_*` in `burncal/service/test_store_service.py`, `test_3_1_ac1_reference_*` |
| AC3 zero median: no ratio, and the answer says so | `test_3_1_ac3_*` (core and service) |
| AC4 rounded once from unrounded values; reference period stated | `test_3_1_ac4_*` |

## Story 2.6: publish a version and serve real counts (branch `teammate/2.6-publish-serve`, on top of 2.5)

- Publish: `uv run python -m burncal.pipeline.publish <record dir> <grids dir> <raw dir> store/published <data_through>`. The raw dir needs `coverage.json` (extent and downloaded date ranges per FIRMS source). Prints the new `record_version`.
- Serve: `uv run uvicorn burncal.service.app:app --port 8000`. With `store/published/CURRENT.json` present (or `BURNCAL_STORE_ROOT` set), `/meta`, `/calendar` and `/cells` answer from the record and `/meta` has `placeholder: false`. Without it, every endpoint answers from the fixture as before. The CSVs still come from the fixture.
- **Sumatra version `20261113-3d2a8f8c`:** data through 13 Nov 2026, 111 MB, published in 2 s. The service starts in 1.6 s. 20 Sumatra calendars from a local client: p50 0.042 s, p95 0.046 s. The hosted p95 against the 3 s target is not measured yet (the hosted stub still runs contract 0.1.0).
- Examples from the Sumatra calendar: September 2015 12,120.0 (real Aqua); September 2023 2,165.6 (converted Suomi NPP); November 2026 231.4 to the 13th, partial `data_through`, `validated_satellite` false. All 113 of Sumatra's 1° cells are `tuned`.
- Statistics fields, `rank` and the current-month card are null or empty until Stories 3.1 and 3.2.
- Checks: `uv run pytest` 228 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 version with manifest, coverage and `record_version`; one pointer; previous answered, older `version_superseded` | `test_2_6_ac1_*` in `burncal/pipeline/test_publish.py`, `burncal/service/test_store_service.py` |
| AC2 `/meta` gives the current month, *d* and reference period from `data_through`; core reads no clock | `test_2_6_ac2_*` in `burncal/core/test_record.py`, `test_store_service.py` |
| AC3 Sumatra calendar: count, raw per satellite, provenance; `placeholder: false`; `record_version` and `data_through` everywhere | `test_2_6_ac3_*`; Sumatra version above |
| AC4 fast path equals the brute-force point sum on Sumatra, an Amazon polygon and a Punjab box | `test_2_6_ac4_fast_path_equals_brute_force_point_sum[*]`; real Sumatra version, largest difference 9.6e-10 |
| AC5 scale cautions below 1° and 0.25° | `test_2_6_ac5_*` in `burncal/core/test_aoi.py`, `test_store_service.py` |
| AC6 hosted p95 of 20 Sumatra requests against 3 s | Not done: needs the hosted service redeployed. Local p95 0.046 s. |

## Story 2.5: grids, thresholds and flags (branch `teammate/2.5-grids-flags`, on top of 2.4)

- Run: `uv run python -m burncal.pipeline.aggregate <record dir> <out dir> [data_through]`. Prints counts only. Writes `cells_1deg`, `cells_025deg`, `thresholds_1deg` and `flags_1deg`.
- `burncal/core/grids.py`: cell corners, the 90th-percentile threshold (linear interpolation over 2003–2011), and `flag_state` (strictly above the threshold and at least 10, both rounded to 6 decimals; strong at 1.5 × the threshold, display tier only).
- **Sumatra grids** (data through 13 Nov 2026), built in 2 s, 0.8 MB: 196 1° cells, 21,530 1° and 129,782 0.25° cell-months with hotspots. The grid totals equal the record's weight sum (404,146.653) at both scales. Flag states: strong 681, marginal 614, none 3,850, not_flaggable 52,283, outside_record 1,372.
- **Threshold parity:** Sumatra matches in 899 of 900 cell-months. The miss (September, 105°E 6°S, 21.0 against 20.6) comes from two Aqua rows that FIRMS has for September 2006 and the harness history does not; open with the lead (`DECISIONS.md`). Australian grassland and Amazon forest need their 2003–2011 Aqua data first.
- Checks: `uv run pytest` 210 passed, 9 skipped; import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 0.25° and 1° cell-month sums for the count and each satellite's raw count | `test_2_5_ac1_*` in `burncal/core/test_grids.py`, `burncal/pipeline/test_aggregate.py`; Sumatra totals above |
| AC2 linear 90th percentile of nine years; tuning-region thresholds match the parity targets | `test_2_5_ac2_*`; Sumatra 899/900 (one known miss); Australia and Amazon not yet run |
| AC3 flag rule, five states, `provisional` and `reference_year` | `test_2_5_ac3_*` |

## Story 2.4: weights and the harmonized record (branch `teammate/2.4-weights`, on top of 2.3)

- Run: `uv run python -m burncal.pipeline.convert <clean dir> <out dir>`. Prints counts only.
- `burncal/core/record.py`: which rows feed the record (Aqua through 2021-12-31; Suomi NPP 2022-01-01 to 2026-11-02; NOAA-20 from 2026-11-03, `validated_satellite` false; Terra and NOAA-21 never), each row's weight (1, the C1 weight, or 0; always 0 when excluded), and `month_state` (null before July 2002, July 2002 partial `record_start`, data-through month partial).
- `burncal/core/regions.py`: tuning-region rules per row, the 5° season tiles and `evidence_class` per 1° cell. `c1.row_weights_mixed` applies C1 when rows lie in different areas. The choices are in `DECISIONS.md` (Story 2.4, ASSUMED).
- `burncal/pipeline/convert.py` adds `region_id`, `rules_region`, `in_season`, `feeds_record`, `validated_satellite` and `weight` to every row, and writes `evidence_1deg.parquet`.
- **Sumatra record:** 2,733,073 rows in 13 s (2.3 GB peak memory), 81 MB. 586,172 rows feed and count. Weight sums: Aqua 374,490.0, Suomi NPP 29,439.7, NOAA-20 216.9 (1,460 rows from 3 Nov 2026). No excluded or non-feeding row has weight. Rules: 2,409,453 rows Sumatra, 323,620 pooled (bounding box outside the polygon).
- Checks: `uv run pytest` 201 passed, 9 skipped (C1 parity passes with the case set); import check passed.

| Criterion | Test or evidence |
| --- | --- |
| AC1 Aqua weight 1 through 2021, feeding VIIRS the C1 weight from 2022, others 0 | `test_2_4_ac1_*` in `burncal/core/test_record.py` and `burncal/pipeline/test_convert.py`; Sumatra record above |
| AC2 Suomi NPP through 2 Nov 2026, NOAA-20 from 3 Nov unvalidated, NOAA-21 never | `test_2_4_ac2_*` in `test_record.py` and `test_convert.py` |
| AC3 tuning-region rules inside, pooled outside, `evidence_class` per 1° cell | `test_2_4_ac3_*` in `burncal/core/test_c1.py`, `burncal/core/test_regions.py`, `test_convert.py` |
| AC4 null before July 2002, July 2002 partial | `test_2_4_ac4_*` in `test_record.py` (served by Story 2.6) |

## Store size probe (14 Nov, branch `teammate/2.3-ingest`)

One year (2024) of FIRMS standard data, MODIS_SP (Aqua and Terra rows) and VIIRS_SNPP_SP, over the bounding boxes of Sumatra and Southern African savanna (`contract/regions.geojson`). 2024 is outside the tuning, selection and final years. Client: `burncal/pipeline/firms.py`. The files sit in `store/probe/` (git-ignored).

| Region, source, 2024 | Rows | CSV | Parquet, all columns | Parquet, lean | Lean bytes/row |
| --- | --- | --- | --- | --- | --- |
| Southern Africa, MODIS_SP (406,125 Aqua, 92,891 Terra) | 499,016 | 37.9 MB | 6.2 MB | 3.9 MB | 8.3 |
| Southern Africa, VIIRS_SNPP_SP | 1,833,804 | 138.1 MB | 33.4 MB | 17.1 MB | 9.8 |
| Sumatra, MODIS_SP (4,728 Aqua, 2,625 Terra) | 7,353 | 0.5 MB | 0.15 MB | 0.10 MB | 14.2 |
| Sumatra, VIIRS_SNPP_SP | 26,845 | 2.0 MB | 0.6 MB | 0.33 MB | 13.0 |

- Parquet with zstd compression, sorted by time. "Lean" keeps only the columns a hotspot row needs: latitude and longitude as float32, time, satellite, confidence, frp, daynight and type, plus feeds_record, excluded_reason and weight. In the probe those last three hold constant values, so real lean files will be somewhat larger.
- Download: 296 requests (5-day windows, 4 at a time), 0 failures, 193 s, 186 MB of CSV.
- The 5 to 15 GB store figure in the planning notes is an estimate, not a measurement.

### Object-storage timing: cold Sumatra calendar (14 Nov)

- Store: Sumatra 2002-07 to 2026-08 from FIRMS standard data (Suomi NPP 2023 missing: FIRMS kept returning errors for those dates), 1,925,775 rows, one lean Parquet file of 17.0 MB (9.3 bytes/row), on a public Hugging Face dataset (trial only). `weight` and `feeds_record` are placeholders until Story 2.4.
- Query: monthly `SUM(weight)` of feeding rows inside Sumatra's bounding box, all 290 months, DuckDB reading the Parquet where it sits (`hf://`, range requests). Nothing is downloaded first.
- Service bundle with FastAPI and DuckDB only: under Vercel's standard size, so no dependency install at instance start (the full set with pyarrow and pandas installs for 2.8 s).

| Where | Cold (new instance or process) | Warm |
| --- | --- | --- |
| Vercel Hobby function, iad1, request from Singapore, after 20 idle minutes | 4.07 s end to end; inside: imports 0.57 s, DuckDB httpfs install 0.82 s, query 1.34 s | 0.37–0.40 s end to end; query 0.10 s |
| Laptop in Singapore, fresh process | 2.8–5.6 s (httpfs 0.9–1.6 s, query 1.6–3.7 s) | query 0.29 s |

## Story 1.5: the web shell

- `cd web && npm run dev` opens the calendar page: placeholder banner, top navigation (calendar, evidence stub, about stub), Sumatra's year × month grid drawn with D3, and the legend.
- With `VITE_SERVICE_BASE_URL` unset the app reads `contract/fixture/`. Set it to the service's address to use the real service; nothing else changes.
- Words for states, cautions and problems come from `contract/messages.yaml`, parsed at build time (`yaml` devDependency, see `DECISIONS.md`).
- Checked in the browser at 1280 px and 375 px: newest year at the top, the 2021/2022 rule with its note, hatching for months outside the record, the month to date outlined, and no horizontal scroll at 375 px.
- Not done: hero sentence and ruler (Story 3.7), plain-table view, colour-vision check (Story 3.10), and a legend label for an incomplete year's hollow bar, which `messages.yaml` lacks. There is also no sentence for "service unreachable"; the page shows interim words, marked TODO in `web/src/pages/CalendarPage.tsx`.

## Story 5.1: scoring files and fixed claims

- `evidence/scoring/` was already copied and committed with Story 2.1's inputs. Rechecked: all eight files match the planning record byte for byte and their manifest hashes, and hold aggregate scores only (no coordinates, no per-cell rows).
- `evidence/claims.yaml` holds the fixed sentences (eleven from Story 5.1, two added in Story 6.6). Each number in a sentence is a figure with a pointer into a scoring file; no value is typed in. Format and fields are described at the top of the file.
- `evidence/test_claims.py` resolves every pointer and checks the formatted value against the sentence, the banned wording, the manifest and the reported-only labelling. Story 5.2's build should reuse the same figure list.
- Two of the story's sentences were wrong against the files and were corrected (see `DECISIONS.md`): Punjab 1A is 29.45, not 29.46; and southern Africa flags were under half right for the candidates and baselines, but the region-month comparator reached 0.510.
- For the lead: on the final set the comparator (`cmp`) passed the (b) test, and C1 missed the fixed margin against 4A (3.9% lower error, below the 5% bar). No claim mentions either. Stories 5.3 to 5.5 will need to.

## Story 6.6: pitch storyline

- `docs/pitch/storyline.md`: one line per judging criterion, the five-beat story, the 7-slide deck (content and speaker line per slide), the haze may and may-not lists, PRD Q8, and what is still open.
- The lead chose the deck over the 30-second video on 14 Nov, which narrows Story 6.6 AC1 and Story 6.5's 30-second recording (see `DECISIONS.md`).
- Q8 (Creativity) is answered in direction: argued against existing tools (FIRMS, Worldview, GWIS, INPE's rule), not other teams. Their links are still needed (Story 6.1).
- Claims are quoted from `evidence/claims.yaml` with their ids; `uv run pytest docs/pitch` checks them word for word.
- It holds no numbers from the app. Counts and standout years are to be read from the live app after Story 2.6.
- Two claims added to `evidence/claims.yaml` with the lead's approval: `comparator-vs-b` (the region-month comparator passed the (b) test that C1 failed) and `margin-vs-4a` (C1's error against 4A fell short of the margin, so the rule preferred 4A). Slide 5 quotes both. The margin's size is not in the scoring file, so the sentence does not quote it.
- Story 5.2 onwards: the evidence page should show these two as well; `claims.yaml` now has thirteen sentences.

| Criterion | Where it is met |
| --- | --- |
| AC1 one line per judging criterion (deck only, by the lead's choice) | "One line per judging criterion" table, slide per line; `test_6_6_one_line_per_judging_criterion` |
| AC2 Sumatra and Singapore haze framing, no unsupported haze claim | Beat 1, slide 1; "Haze: what we may and may not say" |
| AC3 result in `claims.yaml` sentences, with the failed flag-precision test and the savanna weakness | Slides 5 and 6; `test_6_6_every_quoted_claim_is_word_for_word`, `test_6_6_failed_test_and_savanna_weakness_are_stated`, `test_6_6_no_banned_wording` |
| AC4 PRD Q8 answered or listed as open | "Creativity: PRD Q8": answered in direction by the lead, wording ASSUMED |

## Story 5.2: evidence build and its checks (branch `lead/5.2-evidence-build`)

- `uv run python evidence/build.py` writes `web/src/evidence/evidence.json` (committed, 2.3 MB, 167 KB gzipped) from three scoring files: the final run, the selection run it names, and the reported-only run. `--check` fails if the file is stale, breaks `contract/evidence.schema.json`, or any figure differs from the field it names. Run the build after any change to `claims.yaml`.
- Contents: the 13 fixed claims word for word with their figures; for each set, approach tables ((a), (b), comparator, 4A, 1A, C1) at 0.25°, 1° and whole region, pooled and per region; the same against the Terra referee with (c); paired differences with interval and beyond noise; every test result in `decisions`; blocks and draws; count error and bias by year with the period label. Every cell is a figure with its source; the web prints `display`.
- `uv run python evidence/wording.py` checks `README.md` and `web/dist` (build the site first) for "beat the baselines", "every baseline" and the equivalents listed in the file.
- `evidence/test_claims.py` now uses the build's formats, so there is one formatting implementation.
- Checks: `uv run pytest` 176 passed, 9 skipped (parity case not set); import check passed; evidence check passed; wording check passed on a fresh `npm run build`.
- For the lead: Story 5.4 asks for 2014–2017 and 2018–2021 separately, but the files give only per-year results labelled `early`/`late`, no period totals. The build lists the years and computes no totals (see `DECISIONS.md`). NOAA-20 (Story 2.10) has no result file yet, so `evidence.json` has nothing for it and Story 5.6 should say "not yet run".
- Not done: nothing in the web app reads `evidence.json` yet (Stories 5.3 to 5.6). The view should load it with a dynamic `import()`.

| Criterion | Test or evidence |
| --- | --- |
| AC1 `evidence.json` with every number the view shows, each traceable to a field | `test_5_2_ac1_written_file_is_current_valid_and_true`, `..._every_figure_names_a_field_in_a_listed_scoring_file`, `..._sources_are_the_three_sets`, `..._claims_are_claims_yaml_word_for_word`, `..._head_to_head_tables_cover_story_5_4`, `..._differences_carry_interval_and_beyond_noise`, `..._aqua_only_against_the_terra_referee_covers_story_5_5`, `..._final_decisions_include_the_pick_rule_and_gwis`, `..._years_are_shown_by_period_without_totals` |
| AC2 a number that differs from its source fails the build | `test_5_2_ac2_a_figure_that_differs_from_its_source_fails[*]` (value, claim, interval, beyond noise, display, pointer), `..._the_cli_exits_nonzero_on_a_tampered_file`, `..._a_claim_that_differs_from_its_source_fails_the_build`, `..._a_changed_scoring_file_fails` |
| AC3 wording check on the built site and the README | `test_5_2_ac3_readme_and_site_pass_the_wording_check`, `..._wording_check_fails_on_each_listed_claim[*]`, `..._the_fixed_claims_pass_the_wording_check`, `..._phrase_split_across_lines_is_caught`, `..._a_missing_path_fails`; `evidence/wording.py` on a fresh build |

## Story 5.3: the outcome in plain words (branch `lead/5.3-outcome`)

- `#/evidence` now opens the evidence view's first screen: the outcome (claim `flag-precision-vs-b`) in large serif, "What it means for the record" (`aqua-through-2021` and one typed sentence), "The scores behind it" (`count-error-vs-b`, `trade-off-recall`, `margin-vs-4a`, `best-of-three`), then a right column with C1 in plain words and the three planning files. On a phone the columns stack.
- `evidence.json` loads with a dynamic `import()` when the view opens; the build puts it in its own chunk (`evidence-*.js`, 2.1 MB, 156 KB gzipped), so the calendar's bundle stays as it was. Vite warns about the chunk's size; not acted on.
- Claims are printed word for word from `evidence.json`. The page's own words are in `web/src/evidence/outcome.ts` and hold no number; the switch dates come from `messages.yaml` (`record_switch`).
- Links to the planning files need `VITE_REPO_URL` (the public repository's address, e.g. `https://github.com/<owner>/<repo>`) at build time. Without it the page names the files and does not link them. The links 404 until Story 6.3 copies `GUARDRAILS.md`, `research/test-plan.md` and the planning `DECISIONS.md` into `docs/planning/`.
- If `evidence.json` fails to load, the page shows interim words, marked TODO in `web/src/pages/EvidencePage.tsx` (no sentence for it in `messages.yaml`).
- Checks: `npm run typecheck`, `npm run test` (25 passed, 10 of them Story 5.3), `npm run build`; `uv run pytest` 176 passed, 9 skipped; evidence check, wording check (on a fresh build) and import check passed. Looked at in the built-in browser at 1280 px and 375 px: no horizontal scroll, no console errors, outcome above the fold at 1280 × 800.
- For the lead: the copy (headings, the method paragraph, the typed record sentence) and the choice of claims are ASSUMED and need your OK (see `DECISIONS.md`).

| Criterion | Test or evidence |
| --- | --- |
| AC1 opened from the top navigation; the top states the outcome row, the deviation and what it means for the record, from `claims.yaml` | `outcome.test.tsx`: "the evidence view is in the top navigation", "the top states the outcome row and the recorded deviation…", "it says what the outcome means for the record", "every claim on the page is printed word for word…"; browser check |
| AC2 C1 in plain language (transfer table, per-footprint detection model, weighted by fire season), changes only months from January 2022 | "the method is explained in plain words…" |
| AC3 links to the guardrails, the test plan and the selection record in the public repo | "it links to the guardrails…", "with no repository address the files are named, not linked"; browser check of the three hrefs. The copies themselves are Story 6.3 (lead). |

## Story 5.4: head-to-head table

- The evidence view now has a full-width "Head to head" section under the first screen (`web/src/components/HeadToHead.tsx`, `HeadToHead.css`; view model in `web/src/evidence/headToHead.ts`). The reader picks the set (final, selection), the region (pooled or one region) and the scale (0.25°, 1°, whole region). The section shows:
  - the scores for C1, 4A, 1A, (b), (a) and the comparator;
  - count error and bias by year, under the file's early/late periods;
  - the pooled paired differences, each with its 95% interval and a ◆/◇ beyond-noise mark;
  - the blocks behind the intervals;
  - on the final set, "used once", the best-of-three note and the rule the pick used.
- Everything is read from `evidence.json`: no change to `evidence/build.py`, `claims.yaml` or the scoring files. Each figure's tooltip is its scoring-file pointer.
- Periods: the scoring files hold no 2014–2017 / 2018–2021 totals. The lead chose per-year rows under the file's period tag (see `DECISIONS.md`), so that criterion is met only in part.
- Checks: `npm run test` (38 passed, 13 of them Story 5.4), `npm run build`, `uv run pytest` (176 passed, 9 skipped), evidence check, wording check (fresh build), import check. Looked at in the built-in browser at 1280 × 800 and 375 × 812: no horizontal page scroll, controls work, the set switch falls back to pooled, no console errors.
- For the lead: the table's layout and the typed rule sentence are ASSUMED and need your OK (see `DECISIONS.md`, Story 5.4 entries).

| Criterion | Test or evidence |
| --- | --- |
| AC1 C1, 4A, 1A, (a), (b) on the final and the selection set, for error and bias, flag precision with counts, rank correlation, top months and years, peak month, season length | `headToHead.test.tsx`: "AC1: C1, 4A, 1A, (b), (a) and the comparator…", "AC1: error and bias, flag precision with flag counts…", "AC1 / AD-8: every number shown is a figure from evidence.json…" |
| AC2 per region, at 0.25°, 1° and whole region, and for 2014–2017 and 2018–2021 separately | "AC2: per region, at 0.25°, 1° and whole region, for each set", "AC2: an unknown region or scale falls back…", "AC2: years are shown under the file's early and late periods, without totals" (partly met; lead's choice); browser check of the controls |
| AC3 each difference with its 95% interval and a beyond-noise mark, blocks stated, the close-call note | "AC3: every difference has its interval and a beyond-noise mark", "AC3: the number of blocks is stated…" |
| AC4 final set: "used once", best-of-three, "comparator, never picked", the rule the final pick used | "AC4: final-set results carry…", "AC4: those final-set notes are not shown on the selection set…" |

## Story 5.5: Aqua only and the incumbent (branch `claude/5-5-aqua-incumbent-10b884`)

- The evidence view has a new full-width section under the head-to-head table (`web/src/components/AquaOnly.tsx`, `AquaOnly.css`; view model in `web/src/evidence/aquaOnly.ts`). It shows:
  - (c) as today's practice (INPE Queimadas's rule) and the fixed claim `aqua-through-2021`, with why the record does not use Aqua only after the switch;
  - why (c) is tested for non-inferiority (Aqua would be the answer key; Terra, the referee, shares Aqua's instrument, so the test asks "no worse", not "beat");
  - the test against (c): every approach's overall result and its four checks (flag precision, month-rank correlation, peak month, season length) as yes/no, each with its paired difference against (c), interval and beyond-noise mark. On the final set every method reads "no" on precision and "yes" on the rest;
  - (c) in full: the Terra-referee scores for (c) and every approach, with the same set, region and scale choice as the head-to-head table;
  - the other incumbents: GWIS "can't be scored (check D5)" with the reason (its files hold burned area and fire events, not hotspot counts), and NASA FIRMS (inputs, not a series).
- No change to `evidence/build.py`, `claims.yaml`, the schema or the scoring files: `evidence.json` already held everything. `headToHead.ts` gained an optional table family (`approaches` or `terra`) for the set, region and scale options, and exports `scoresOf`; `HeadToHead.tsx` exports its figure, mark, choice and score-table parts. Story 5.4's markup is unchanged (its tests pass as before).
- On the selection set every approach except (a) passed the test against (c). The section shows that as it is and says the final pick used the final set.
- Checks: `uv run python evidence/build.py --check` passed; `uv run pytest evidence` 117 passed (8 of them Story 5.5, in `evidence/test_aqua_only.py`); `uv run pytest` 310 passed, 10 skipped (parity case not set in the worktree); `npm run test` 146 passed (9 of them Story 5.5); `npm run build`; wording check on the fresh build; import check. Looked at in the built-in browser at 1280 × 800 and 375 × 812: no horizontal page scroll (tables scroll inside their box), the set, region and scale choice works and is separate from the head-to-head one, no console errors.
- Claims: the lead approved three on 15 Nov, added to the end of `claims.yaml` (now sixteen): `aqua-only-every-method-failed-precision`, printed at the top of the "test against (c)" block; and `caveat-untuned-region` and `caveat-southern-africa`, for Story 3.6, which reads them by id (not shown in 5.5). After adding them: evidence check passed, `uv run pytest evidence` 148 passed, `uv run pytest` 341 passed and 10 skipped, `npm run test` 146 passed, `npm run build`, wording check passed.
- For the lead: the section's copy is ASSUMED and needs your OK (see `DECISIONS.md`).

| Criterion | Test or evidence |
| --- | --- |
| AC1 (c) against the Terra referee in full | `aquaOnly.test.tsx`: "AC1: (c) leads a full table against the Terra referee, for every set, scale and region", "AC1: an unknown region or scale falls back…", "AD-8: every number shown is a figure from evidence.json…"; `test_5_5_ac1_c_is_reported_in_full_at_every_scale_and_region`; browser check |
| AC1 including that every method failed on precision | "AC1: on the final set it shows that every method failed on precision…", "AC1: each set's test is shown check by check…", "AC1: on the final set the candidates' results are the pick rule's…"; `test_5_5_ac1_every_non_inferiority_check_is_in_evidence_json_as_its_file_holds_it`, `..._on_the_final_set_every_method_failed_on_precision_alone`, `..._each_check_has_its_difference_against_c_with_interval`. Shown as data, with the claims `aqua-through-2021` and `aqua-only-every-method-failed-precision` |
| AC1 explains why (c) is tested for non-inferiority | "AC1: it explains why (c) is tested for non-inferiority" |
| AC2 GWIS reads "can't be scored" with the reason | "AC2: GWIS reads "can't be scored" with the reason"; `test_5_5_ac2_gwis_is_recorded_as_cant_be_scored` |

## Story 5.6: what the scores can't show (branch `claude/5-6-scores-cant-show-d2b4b9`)

- The evidence view has two new full-width sections under "Aqua only and the incumbent" (`web/src/components/ScoresLimits.tsx`, `ScoresLimits.css`; view model in `web/src/evidence/limits.ts`):
  - **What the scores can't show:** the eight limits of test plan section 12, numbered, in its order. Their few numbers are figures from `evidence.json` (last scored year, the selection set's years, its 28 blocks, one pair of years per region; the final set's years per region are listed). Limit 3 prints the claim `noaa20-untested`.
  - **The two flag tiers:** one typed sentence (the calendar shows strong and marginal flags), then the claim `tiers-not-checked-everywhere`: checked on selection years only, not in southern Africa or Siberia, added after the final-set scores had been seen.
  - **NOAA-20 against Suomi NPP:** "The NOAA-20 comparison has not been run yet." (`notes.noaa20_check_not_run`) until a `noaa20_check_*.json` is listed in `evidence/scoring/MANIFEST.json`; then `notes.noaa20_check`, the file's label and every figure in it.
  - **The reported-only run** (`9d5e7bf1d0d6`), labelled "Not used for the pick": the run's own fields, the three reported-only claims, its years, every approach's test results (against (a), (b) and (c)), and Story 5.4's score, by-year, paired-difference and block tables with its own region and scale choice.
- `evidence/build.py`: a `year` format; per-set tables `{set}.years` and `{set}.about`; the NOAA-20 file is read when the manifest lists it, and the build fails if its label does not say "reported only" and "not a validation against Aqua". `evidence.json` rebuilt (123 tables, 17 claims). No change to the schema or the scoring files.
- `claims.yaml`: the lead approved one claim on 15 Nov, added at the end: `tiers-not-checked-everywhere` (not used for the pick, no figures). `tiers-selection-only` stays for other pages.
- `HeadToHead.tsx` exports its by-year and paired-difference tables as `ByYear` and `Pairs` (same markup); `headToHead.ts` exports `pairsOf` and `byYearOf` and accepts any set key in `scaleOptions`, `regionOptions` and `normalise`.
- Checks: `uv run python evidence/build.py --check` passed; `uv run pytest evidence` 163 passed (15 of them Story 5.6, in `evidence/test_limits.py`); `uv run pytest` 361 passed, 10 skipped; `npm run test` 185 passed (11 of them Story 5.6); `npm run build`; wording check on the fresh build; import check; gitleaks `dir` found no leaks. Looked at in the built-in browser at 1280 × 800 and 375 × 812: no horizontal page scroll, the reported-only region choice works and is separate from the head-to-head one, no console errors. One fix from that look: the run's note line was cut off at 1280 px; it now wraps.
- The lead approved the section's copy and the tiers claim on 15 Nov. After adding the claim: evidence check passed, `uv run pytest evidence` 164 passed, `npm run test` 185 passed, `npm run build`, wording check passed. The structure choices (the reported-only section's layout, how the NOAA-20 file is read) stay ASSUMED in `DECISIONS.md`.

| Criterion | Test or evidence |
| --- | --- |
| AC1 all eight limits of test plan section 12 are in its text | `limits.test.tsx`: "AC1: all eight limits of test plan section 12 are present in its text, in its order" (a checklist kept apart from the copy), "AC1: the numbers in the limits are figures read from the scoring files"; `test_5_6_limit_*` in `evidence/test_limits.py` |
| AC2 tiers: checked on selection years only, not in southern Africa or Siberia | "AC2: the anomaly tiers were checked on selection years only and not in southern Africa or Siberia" |
| AC3 reported-only run labelled "not used for the pick"; 4A alone passed (b), C1 did not; southern Africa and Punjab | "AC3: the reported-only run is labelled not used for the pick…", "AC3: 4A alone passed the (b) test…", "AC3: the southern Africa and Punjab results are shown…", "AC3: an unknown region or scale falls back…"; `test_5_6_reported_only_*`; browser check |
| AC4 NOAA-20: labelled once its file exists; "not yet run" until then, for that comparison only | "AC4: until Story 2.10's file exists…", "AC4: once the file exists…" (made-up file); `test_5_6_noaa20_*`. **Real figures wait for Story 2.10.** |

## Story 5.7: about the data (branch `claude/5-7-about-the-data-b91a8f`)

- `#/about` is built (`web/src/pages/AboutPage.tsx` loads `/meta` and the evidence chunk; `web/src/about/` holds the view, its copy, its view model, its CSS and its tests). It has the evidence view's page form: a reading column and a margin.
- **Reading column:** the contract's hotspot sentence as the lead; what a hotspot is (and is not), the count unit from `/meta`; where the data come from, with each satellite's part by served dates; the sensor change (`notes.record_switch`, the claim `aqua-through-2021`, orbit drift, `notes.satellite_switch`); cleaning rules and where they differ from the validation's; standard against NRT (the contract's quality sentences); what the validation does not cover (the claim `noaa20-untested`, NOAA-21, `notes.validated_satellite_false`, `notes.monthly_validation_only`); what a satellite can't see (cloud, smoke, small burns); the six counting limits, numbered.
- **Margin:** the record's facts from `/meta` (record version, record start, switch dates, satellite switch dates, data through, unit); four data sources with `[pending: Story 6.1]` where each citation goes; a link to the evidence view.
- No change to the contract, `evidence/`, other pages or shared CSS. The page's CSS is its own file.
- **Approved by the lead on 15 Nov:** all of the copy in `web/src/about/copy.ts` and the `counting_limits` plan (`DECISIONS.md`, "Story 5.7"). The page reads the contract's `counting_limits` list when present and shows `copy.ts`'s six otherwise; master's contract has none, so the fallback shows until contract 0.4.0 merges. The draft's list was checked against the page: same six, same words.
- **Done 15 Nov:** the `[pending: Story 6.1]` marks are replaced by the 6.1 citations and links, with the FIRMS acknowledgement; NOAA-21 is described as not used (see `DECISIONS.md`, "Story 6.1 on the site and in the submission text").
- Checks (after the counting-limits change): `npm run test` 241 passed (21 of them Story 5.7); `npm run build`; wording check on the fresh build; import check. Nothing in `evidence/` changed, so its checks were not rerun. Looked at in the built-in browser at 1280 × 900 and 375 × 812 (fixture mode): no horizontal page scroll, no console errors. One fix from that look: the "Not counted" labels got a lead-in line.

| Criterion | Test or evidence |
| --- | --- |
| AC1 linked from every view | `about.test.tsx` "every view's masthead links to the page" |
| AC1 sources | "explains the sources: FIRMS, MODIS and VIIRS, and each satellite's part by the served dates" |
| AC1 record switch and why at end of 2021 | "explains the record switch and why it sits at the end of 2021, quoting the fixed claim" |
| AC1 count unit; a hotspot is not a fire | "explains the count unit and that a hotspot is not a fire" |
| AC1 cleaning rules and differences from the validation's | "states the cleaning rules and where they differ from the validation's" |
| AC1 standard against NRT | "explains standard against near-real-time data…" |
| AC1 NOAA-20 and NOAA-21 not covered | "says NOAA-20 and NOAA-21 are not covered by the validation" |
| AC1 cloud and smoke | "explains detection limits under cloud and smoke" |
| AC2 all six counting limits | "lists all six counting limits from the PRD, numbered" |
| AC2 record version | "states the record version served by /meta" |
| AC2 every data source and its citation | "lists every data source, each with a visible citation mark…". **Citations wait for Story 6.1.** |
| AC2 link to the evidence view | "links to the evidence view" |
| Counting limits from the contract's list when present, the page's six otherwise | "with a list in the contract, the page shows exactly those items, in order", "without one, the page shows its own six, filled from /meta", "by default the page reads the contract it was built with" |
| Numbers from `/meta`, no other digits typed; "hotspots" not "fires"; only fixed claims | "every date, version and unit on the page comes from /meta", "the copy types no digit beyond the fixed rules it names", "says "hotspots", never "fires"", "quotes only the two fixed claims about results, word for word" |

## Story 3.3: select an area

- The calendar page's left column opens with a small locator: the area on a still map (Natural Earth 1:110m), its served name and km², and "Change area". That opens a picker with three tabs: featured areas from `contract/regions.geojson`, drawing (rectangle or polygon, MapLibre + terra-draw on a 1:50m map), and typed coordinates (box corners or polygon vertices). Sumatra is selected on first load.
- Code is in `web/src/area/` (`AreaLocator`, `AreaPicker`, `MapView`, `typed.ts`, `load.ts`, `featured.ts`, `basemap.ts`, `words.ts`, styles in `area.css`). `web/src/pages/CalendarPage.tsx` now keeps the selected area and its answer; `loadDefaultCalendar` in `client.ts` is no longer used by the page.
- A refused area (`no_land`, `outside_coverage`, ...) shows its `messages.yaml` sentence and no calendar. Scale cautions show from the served `cautions`.
- New packages, exact pins: `world-atlas` 2.0.2, `topojson-client` 3.1.0; dev `@types/topojson-client` 3.1.5, `@types/geojson` 7946.0.16. Map code and land data load on demand (own chunks; MapLibre 1.1 MB, 300 KB gzipped).
- MapLibre needs its worker URL set explicitly under Vite (done in `MapView`); without it no map draws in dev.
- The built-in browser pane pauses map rendering while it is hidden, so the maps were checked with a headless Chrome script instead (Playwright's installed Chromium 1243 via `executablePath`; Playwright 1.65 expects a newer build that is not downloaded). Steps: first load, open the picker, type a bad box, a good box, draw a rectangle, draw a polygon, type an open polygon, pick Punjab; at 1366 px and 375 px, against `vite` and `vite preview`.
- Checks: `npm run typecheck`, `npm run test` (57 passed, 32 of them Story 3.3), `npm run build`, `uv run python evidence/wording.py` passed.
- Typed boxes with west greater than east cross 180° and are sent as a MultiPolygon split at the antimeridian (the lead's decision); "out of order" is south ≥ north only.
- Missing sentences, for the lead's contract 0.3.0 bump: typed coordinates out of range, out of order (latitude) and not closed, and possibly a box with no width. Each shows `invalid_aoi` for now, with the fields at fault marked.
- For the lead: the decisions headed "Story 3.3" in `DECISIONS.md` (five ASSUMED, four TESTED).

| Criterion | Test or evidence |
| --- | --- |
| AC1 draw, type or pick; the area shows on the map with its km² and the calendar loads; Sumatra on first load | `area.test.tsx` AC1 block: featured list and default, first request is Sumatra, fixture mode, picked and typed requests, served km² shown, no km² before the answer, locator and picker render, draw tab. Drawing by mouse: headless Chrome check (rectangle and polygon). |
| AC2 out of range, out of order, not closed give a clear message | `area.test.tsx` AC2 block (parsers, corner marking, vertex lines); headless check of both forms |
| AC3 no land / outside coverage show their sentence, never a calendar of zeros | `area.test.tsx` AC3 block (both codes, no grid, no size; version retry) |
| AC4 cautions below 1° and 0.25° | `area.test.tsx` AC4 block (both, one, none served) |

## Story 3.5: the burning activity calendar

- The grid in `web/src/grid/` is now drawn by React from a pure model (`model.ts`) and layout (`layout.ts`); `CalendarGrid.tsx` holds the grid, the cell card and a Grid/Table switch, `CalendarTable.tsx` the table view, `GridLegend.tsx` the key. `web/src/pages/CalendarPage.tsx` is unchanged; `web/src/styles.css` changed one line (the one-column layout is `minmax(0, 1fr)`).
- Marks that are not colour: hatching (outside the record), dots (not loaded), dashed outline (month to date), triangle and circle (strong and marginal flags), and letters after the count: `n` near real time, `*` incomplete month, `c` cut by the date range. Story 3.4's cut label is the `c` mark, read from the served `range_cut` partial reason.
- Every month, year total and median is focusable (one tab stop, then arrow keys, Home, End, Escape) and shows a card on hover, focus or tap with the exact served count and its provenance; the same text is the cell's accessible name.
- Checks: `npm run typecheck`, `npm run test` (94 passed; 23 in `grid.test.tsx`, 6 in `model.test.ts`), `npm run build`, `uv run python evidence/wording.py` passed.
- Browser check (built-in browser, `vite` and `vite preview`): 1280 px, numerals in cells, hover card on September 2015, arrows from September 2019 down to the December median, Escape closes the card; 375 px, tint-only cells with letter marks, totals as numbers, vertical medians, tap card on September 2015, page width 375 in grid and table views; no console errors on the production build.
- The browser pane does not run resize observers while it is hidden, so a resize there does not redraw the grid until the pane is shown or the page reloads. A real browser is not affected.
- For the lead: the decisions headed "Story 3.5" in `DECISIONS.md` (five ASSUMED, one TESTED). Open: with the default range (to the data-through date) the fixture serves the current month with both `data_through` and `range_cut`, so it shows `c` as well as the dashed outline. Whether the service should leave out `range_cut` when the range ends on the data-through date is the data owner's call.

| Criterion | Test or evidence |
| --- | --- |
| AC1 rows are years, columns January to December, cells coloured by served class; legend shows the breaks and the unit label | `grid.test.tsx` AC1 block (row order, every month's class, every break and the unit in the legend); browser check at 1280 and 375 px |
| AC2 same count, same colour across the switch; switch marked between Dec 2021 and Jan 2022; legend explains it | `grid.test.tsx` AC2 block (equal counts on both sides get the same class; class never depends on `source`; rule between the 2022 and 2021 rows; the switch sentence in the grid and the legend) |
| AC3 outside the record looks different from zero; NRT and partial months marked, not by colour alone | `grid.test.tsx` AC3 block (hatched outside the record against a filled "0" in grid and table; `n` on exactly the NRT months; `*` for missing days and record start; dashed outline for the month to date; `c` for a range cut, whole-month count kept; marks at 375 px; every mark's sentence in the legend) |
| AC4 hover, focus or tap shows the exact count and provenance; same data in a table view | `grid.test.tsx` AC4 block (every month's detail against served fields; every month, total and median focusable with one tab stop; card for the focused cell; arrow-key moves; table holds every month's value and marks); hover, keyboard and tap checked in the browser |
| AC5 year totals end each row, medians foot each column; every number on screen is served | `grid.test.tsx` AC5 block (served totals and medians at both widths; a 0 median shows "0"; every number in the grid, table and legend is a served value or a number inside a contract sentence) |
| AC6 look and layout follow UI-CONCEPT.md | `grid.test.tsx` AC6 block (rank rings on the top years, hollow bar for incomplete years, no red); screenshots at 1280 and 375 px against the concept: paper ground, one sepia ramp, newest year on top, labelled rule, totals column with rank marks, medians row. Compared side by side with the concept's mockup at 1280 px: same structure (newest year on top, ruled switch, totals with bars and rank rings, medians row, hatching, dashed month to date). Differences: a Grid/Table switch where the mockup has a "show as plain table" link; a longer legend, because it explains more marks; the switch note is the contract's full sentence. |

## Story 3.4: select a date range (branch `claude/3-4-dates-ac58f0`)

- The picker gains a fourth tab, "Dates": From and To date fields, the record's served bounds, the served reference period, "Show these dates" and "Whole record". The control now reads "Change area or dates". The locator shows the served `range` under the area's name; the grid's heading names the served range's first and last months.
- Code: `web/src/area/DatesPanel.tsx` (the tab), `web/src/area/dates.ts` (checks typed days against the served bounds; string comparison only), `rangeRequest` / `wholeRecord` / `DateRange` in `web/src/api/client.ts`, `loadArea(client, aoi, known, range)` in `load.ts`. `CalendarPage.tsx` keeps `range` (null = whole record) beside the area; changing one keeps the other.
- The range is days, sent as typed. First load is the first day of the served `record_start` month to the served `data_through`. `/calendar`, `/analytics.csv` and `/hotspots.csv` all build their body with `rangeRequest`; the client now has `postAnalyticsCsv` and `postHotspotsCsv` (no download control yet: Story 4.4). In fixture mode these two reject, because the fixture holds no CSV. `/cells` takes one month and no range (contract).
- Fixture mode answers the same whole-record calendar for any range, so on the fixture a changed range reloads but the page still shows the fixture's served range. That is correct: the page shows what is served.
- Refused ranges (empty or unreadable day, before the record, after `data_through`, From after To): the browser's own date checks stop them before submit and say why; `checkRange` marks the fields if one gets through. No sentence exists in `messages.yaml` for these, so the page types none (`TODO(label)`).
- Missing sentences, for the lead's next contract bump (suggested words in `DECISIONS.md`, Story 3.4): four refused-range cases, and one note that rankings follow the dates while medians and anomalies keep the reference period.
- Not this story: the service accepts a reversed or out-of-record range (it checks only that each is a real date). For the data owner.
- The "cut" mark on the grid is Story 3.5's (its own session, `web/src/grid/`). Nothing in `web/src/grid/` was edited here.
- Browser check (built-in browser, 14 Nov): built site (`vite preview`) at 1280 px and 375 px. Opened the picker, the Dates tab, defaults 1 July 2002 and 13 November 2026; From 10 June 2012 and To 15 March 2010 were refused by the browser with its message on both fields; From 15 March 2010 and To 10 June 2012 closed the picker and reloaded. Against the local service (`uvicorn`, no store, so fixture answers) with `VITE_SERVICE_BASE_URL` set: the submit sent a new `POST /calendar` (body content is covered by the unit test). At 375 px: no horizontal scroll (scroll width 375), the four tabs and Close wrap onto two lines, the date fields fit. No console errors at either width.
- Checks: `npm run typecheck`, `npm run test` (90 passed, 19 of them Story 3.4), `npm run build`, `uv run python evidence/wording.py` and `tools/check_imports.py` passed; `uv run pytest` 302 passed, 10 skipped (9 need `BURNCAL_PARITY_CASE_DIR`, 1 needs a local `store/`; neither is set up in this worktree).

| Criterion | Test or evidence |
| --- | --- |
| AC1 first load is July 2002 to the served data-through date | `dates.test.tsx` AC1 block: first request is `2002-07-01` to `meta.data_through`; the Dates tab opens on those days with them as `min` / `max`; the locator shows the served range; nothing before `/meta` is served. Browser check: defaults shown. |
| AC2 a range that cuts a month shows each touched month's whole-month count, and cut months are labelled cut | Service: `test_3_1_ac2_cut_and_partial_months_whole_counts_never_ranked` (cut month keeps the full count, carries `range_cut`). Web: `dates.test.tsx` AC2 block: the range is sent as typed, not snapped; the grid model keeps whole years and the served count; each cut month's cell title carries the `range_cut` sentence; the heading names the served range. **The visible "cut" mark on the grid depends on Story 3.5.** |
| AC3 rankings follow the range; median and anomalies keep the stated reference period | Service: `test_3_4_ac3_rankings_follow_the_range_median_and_anomalies_keep_the_reference_period` (same `reference_period`, medians, means, ratios and anomalies for every month; rankings only inside the range and different from the whole record's; record high unchanged). Web: `dates.test.tsx` AC3 block (rank marks are the served ones; the served reference period is stated in the Dates tab); "every request" block (`/calendar` and both CSVs carry the range). |
| Refused ranges get a clear message | Browser message for now (see above); `dates.test.tsx` refused-ranges block for the four cases and the field marks. **Waits on `messages.yaml` sentences.** |

## Story 3.7: the current-month card (branch `claude/3-7-current-month-3e4431`)

- Code: `web/src/card/` (`model.ts` builds the card from served fields, `words.ts` reads and fills contract sentences, `ruler.ts` lays out the ruler, `CurrentMonthCard.tsx` draws the card and ruler, `card.css`). `web/src/pages/CalendarPage.tsx` places the card in the left column under the locator, before the footnotes. `web/src/format.ts` gains `formatRatio` and `formatSigned` (formatting only). Nothing in `web/src/grid/` or `web/src/area/` changed.
- **No card sentence exists in `messages.yaml` 0.3.0**, so the web types none. The headline is the served count ("261.3 hotspots") and every other value is a labelled figure. The web reads an optional `sentences:` section: adding it in contract 0.4.0 (both owners) switches the card to sentences with no web change. Suggested wording is in `DECISIONS.md`, "Story 3.7: the card's sentences wait for contract 0.4.0".
- **NOAA-20:** the card says the satellite was not part of the validation (`validated_satellite_false`) and, while `meta.noaa20_check` is null, that the comparison has not been run. Showing the comparison is built and tested against `contract/fixture/examples/meta_after_noaa20_check.json` (the "Reported only" note plus the pooled figures), but no real figures exist until Story 2.10 runs, so this part of AC5 waits for 2.10.
- Checks: `npm run typecheck`, `npm run test` (137 passed, 24 of them in `card.test.tsx`), `npm run build`, `uv run python evidence/wording.py` and `uv run python tools/check_imports.py` passed.
- Browser check (built-in browser, `vite preview` of the production build, fixture mode): 1280 px, card under the locator, ruler with 23 year marks, the dashed median tick and 2026 ringed left of it, page scroll width 1280; 375 px, the same card at 343 px, scroll width 375, table view under the ruler opens with 24 rows (23 years and 2026). No console errors at either width.

| Criterion | Test or evidence |
| --- | --- |
| AC1 count to date, same-days median, ratio and difference, flagged 1° cells per tier, reference period, data-through date, NRT label | `card.test.tsx` AC1 block (each figure equals the served field; flag counts per tier and of the total; feeding satellites with served days; NRT and SP quality sentences; provisional flags and whole-month validation notes; the same values inside the sentences once the contract has them); browser check at both widths |
| AC2 headline sentence with the ruler under it (a mark per past year for the same days, the median tick, this year's mark, all served), and a second sentence with the highest month on record | `card.test.tsx` AC2 block (one mark per served year, in served order, with its served count; median and this year's labels are served values; marks inside the drawing at 420 and 343 px; a 0 count at the left end; table view holds every year; record high from `statistics.record_high`, none when null; the card sits under the locator and before the footnotes); browser check. **The headline and second sentence are labelled figures until contract 0.4.0.** |
| AC3 the sentence reads like the example, using only served values | `card.test.tsx` AC3 block (with the suggested template the card writes "So far this month: 412 hotspots, 2.3× the 2003–2025 median for the same days of November." from served values; 0.3.0 gives no template and the web types none; a template with a missing or null value is not filled; every number on the card is served). **Waits on the template in contract 0.4.0.** |
| AC4 a median of 0 shows the count and "no typical activity", with no ratio | `card.test.tsx` AC4 block (count and `no_typical_activity` shown, no "×" and no ratio figure, median shown as 0; a null current month says "Not loaded yet." with no 0; a null count or median shows "–") |
| AC5 NOAA-20: not part of the validation; once 2.10 has run, its comparison with Suomi NPP from served figures, labelled reported only | `card.test.tsx` AC5 block (`validated_satellite_false` on the fixture's NOAA-20 month; "not been run yet" while `noaa20_check` is null; the example meta gives "Reported only." and the pooled figures; a validated satellite gets none of these). **Real figures wait for Story 2.10.** |

## Story 3.6: provenance and evidence caveats (branch `claude/3-6-provenance-35f09f`)

- **Grid** (`web/src/grid/`): each month's card and accessible name now list every feeding input with its served days and its own quality ("From Suomi NPP (VIIRS), 2 days, near real time; NOAA-20 (VIIRS), 11 days, near real time"), the partial reasons, `notes.validated_satellite_false` on every counted month with `validated_satellite` false, `notes.after_pick_years` on every converted month, and `notes.satellite_switch` on the switch month. The switch month (from `meta.satellite_switch.noaa20_from`) gets a short ink rule on its left edge in the grid, a left rule in the table, and a legend line. Nothing else is drawn on the grid. `model.ts` gains `qualityTag`, `completeNote`, `satelliteSwitchMonth` and four `CellModel` fields; the one Story 3.5 test that expected the separate "Standard quality." line now checks the per-input entry.
- **Caveat** (`web/src/provenance/`, new): `caveat.ts` decides from the served `aoi.region_caveat` only and quotes the caveat's own claim from `evidence.json` by id (`caveat-untuned-region` or `caveat-southern-africa`, approved by the lead on 15 Nov); with the claim missing it shows only the contract's sentence. `RegionCaveat.tsx` draws the caveat under the locator (the contract's sentence, the claim, then a 1° cell map marking each cell's served `evidence_class` by a line pattern, with a key) and `CaveatLine` repeats the sentence above the grid; `cells.ts` asks `POST /cells`; `cellMap.ts` lays out the squares. `web/src/pages/CalendarPage.tsx` places both and drops the caveat from the footnotes. Sumatra carries no caveat and loads neither `/cells` nor `evidence.json`.
- **Approved by the lead on 15 Nov:** the two caveat claims (now in `evidence/claims.yaml` and `web/src/evidence/evidence.json`, copied unchanged from the Story 5.5 branch; the untuned one reworded to report southern Africa's results without predicting) and `notes.month_complete`, which is in the contract 0.4.0 draft only. Until 0.4.0 merges, a complete month says nothing (`TODO(label)` kept); partial months already say why. Open point in `DECISIONS.md`: "the one untuned region scored" may not hold, since Siberia is served as `tested_unseen`.
- **Not done here:** the classes are not drawn on the MapLibre locator itself (`web/src/area/` was out of scope); the cell map sits beside it. `postCells` belongs in `ServiceClient` (`web/src/api/client.ts`, out of scope).
- Checks: `npm run typecheck`, `npm run test` (165 passed; 28 new: 15 in `grid/provenance.test.tsx`, 13 in `provenance/caveat.test.tsx`), `npm run build`, `uv run python evidence/wording.py` and `uv run python tools/check_imports.py` passed.
- Browser check (built-in browser, 15 Nov): a scratch mock service (outside the repo) serving the contract's untuned example with mixed cells, through `vite` with `VITE_SERVICE_BASE_URL`: 1280 px, caveat under the locator with the cell map and key, caveat line above the grid; Tab into the grid and ArrowRight to November 2026 shows the card with both inputs, the validation, switch and pick sentences, inside the page; hover on May 2026 shows its input and the pick sentence. 375 px: page width 375, cell map 84 px wide, tap card on November 2026 inside the page. Production build in fixture mode (Sumatra) at 1280 px: no caveat, `evidence.json` not fetched, one switch rule on November 2026, no console errors.

| Criterion | Test or evidence |
| --- | --- |
| AC1 focusing any cell reads every input satellite, standard or NRT, complete or partial | `grid/provenance.test.tsx` AC1 block (every feeding input of every month, with days and quality, in the accessible name; mixed-quality month; card of the focused cell); keyboard and hover in the browser. **"Complete" shows once contract 0.4.0 (with `notes.month_complete`) merges.** |
| AC2 a NOAA-20 month says "not part of the validation"; the 2 November 2026 change is marked | AC2 block (label from served `validated_satellite`; a later NOAA-20 month; one rule on the served switch month in grid, table and legend at both widths; follows a moved date) |
| AC3 a month from 2022 is labelled outside the pick years | AC3 block (every converted month and no Aqua month; table view) |
| AC4 caveat beside the map and the calendar; cells marked by a pattern | `provenance/caveat.test.tsx` AC4 block (placement; contract sentence and both results; pattern per served class, no colour fill; key; layout; `/cells` request; the untuned area quotes exactly `caveat-untuned-region`, no Punjab sentence) |
| AC5 southern Africa states the facts as results for the region | AC5 block (region sentence then `caveat-southern-africa`; no hedging words; a missing claim leaves only the contract sentence) |
| AC6 words and figures from claims.yaml and evidence.json; only evidence_class decides | AC6 block (every number is a `display` of the quoted claim's figures; the claim is taken from evidence.json by id; shown exactly when `region_caveat` says; the caveat code imports no boundary or land data) |
| Markers do not dominate | `grid/provenance.test.tsx` last block (one new mark in the whole grid; labels are words only; the caveat stays off the grid); Sumatra screenshot at 1280 px |

## Story 3.8: anomaly view and flags (branch `claude/3-8-anomaly-flags-e51dff`)

- **Grid** (`web/src/grid/`): a "Counts / Anomalies" switch beside "Grid / Table". In the anomaly view every counted month is filled by its served `anomaly_class` on a two-hue diverging ramp (slate below the class that holds 0, ochre-brown above, no red), shows its served `anomaly_pct` signed at laptop width (tint only at 375 px), and the foot row shows the served `reference_mean`. The table view follows the switch. The card and accessible name lead with "Anomaly: +19,674.4 hotspots, Aqua MODIS units, +277.55%", then the count, the reference mean with its period, the flag reference years, the flag lines and the provenance. New pure code is in `anomaly.ts`; `model.ts` gains the anomaly fields, `CellModel.anomalyDetail` and `detailAt(..., measure)`.
- **Flags** (both views): a flagged month's card adds "Flagged 1° cells: 19 strong, 9 marginal, of 113", `notes.flag_scale` and, with strong cells, `notes.strong_tier`; contract 0.4.0's `sentences.cells_flagged` replaces the first line once merged. The legend adds the strong-tier note to the strong symbol and the flag-scale note as its own entry. Reference-year and provisional months read `notes.reference_year` and `notes.provisional`. Flag counts are read as possibly null (0.4.0).
- **Cell panel** (`FlagCells.tsx`, anomaly view only): the flag state of each 1° cell for the month last focused or tapped (else the current month), from `POST /cells`: a north-up map with a shape per state, a key with all five `labels.flag_state` sentences (so "not flaggable" reads per cell), the flag reference years, and the cells as a table. `web/src/provenance/cells.ts` gained an optional `month` argument (Story 3.6's call unchanged). In fixture mode the panel always shows September 2015, the fixture's one `/cells` answer.
- **Page:** `web/src/pages/CalendarPage.tsx` holds the measure and the picked month, so the legend and the panel follow the grid. `web/src/format.ts` gains `formatSignedPct` (formatting only). One Story 3.6 test (`provenance.test.tsx`) now compares only the provenance lines, since the flag lines follow them.
- **AC2 read per tier (approved by the lead, 15 Nov):** the service serves only the per-tier counts and the web does not sum, so the card states both tiers out of M rather than one "N of M" figure.
- **Contract sentences (approved by the lead, 15 Nov):** the web reads `sentences.anomaly`, `.reference_mean`, `.flag_reference`, `.anomaly_scale`, `.cells_heading` and `notes.partly_inside` (plus 0.4.0's `sentences.cells_flagged`) with `fill()` from `card/words.ts`, filled from served values with their served signs. Master's contract has none of them, so the labels show until 0.4.0 merges; merging switches the words with no web change. When this was built the keys were not yet in `lead/contract-0.4.0`. Approved text: `DECISIONS.md`, "Story 3.8: the anomaly words read the contract's sentences once 0.4.0 merges".
- Checks: `npm run typecheck`, `npm run test` (209 passed; 35 in `grid/anomaly.test.tsx`, 7 of them for the sentences), `npm run build`, `uv run python evidence/wording.py` and `uv run python tools/check_imports.py` passed. The sentence switch was not rechecked in the browser: master's contract has no keys to switch to, and the unit tests pass the templates in.
- Browser check (built-in browser, `vite preview` of the production build, fixture mode, 15 Nov): 1280 px, switch to Anomalies, page width 1280, no numeral overflows its cell (after tightening the font beside marks); hover on September 2015 shows the anomaly card; keyboard: Tab from the switch into the grid, arrows to September 2015, card with the same lines; cell panel under the legend with 113 cells and the key. 375 px: page width 375 in grid and table views, tap card on September 2015 inside the page (11 lines), cell map 279 px wide, the cells table's not-flaggable rows read the contract label. No console errors. Not checked against a live service: the `/cells` request for a picked month is covered by the unit test only.
- Flag marks stay on both tiers (the lead, 15 Nov): marking strong months only would cut recall from 0.848 to 0.656 per the planning record, and the strong tier is not the scored rule. The clutter in 2015 and 2019 comes from the fixture's invented data; look again on real Sumatra (`DECISIONS.md`, "Story 3.8: flag marks stay on both tiers").

| Criterion | Test or evidence |
| --- | --- |
| AC1 the anomaly view recolours cells on a diverging ramp centred on the reference mean; each cell's detail gives the anomaly as a count and a percentage | `anomaly.test.tsx` AC1 block (switch; neutral class from the served breaks; every month's tone from its served class, cool below and warm above; class beats percentage; hatching kept, no-class months plain; served `anomaly_pct` in cells; every counted month's anomaly count and percentage, in the card and accessible name; served means in the foot row; legend breaks and period; table view; no red); browser check at 1280 and 375 px, hover and keyboard |
| AC2 flagged months carry a symbol, strong and marginal differ without colour, the detail says how many cells are flagged with the 1° scale; the legend says the strong tier was checked on selection years only | AC2 block (triangle and ring in both views and at 375 px; per-tier line with `notes.flag_scale`; 0.4.0 sentence filled from served values; `notes.strong_tier` in the card and both legends and the cell panel; no summed figure; null counts give nothing). **Single "N of M" figure not served; stated per tier.** |
| AC3 a month in 2003–2011, a cell below the floor and a partial month read "reference years", "not flaggable" and "provisional" | AC3 block (each month's notes match its served booleans in both views; every flag state drawn and labelled in the cell panel from `cells_every_state.json`; the reference-year example; `/cells` asked with the picked month; panel only in the anomaly view); browser check of the cells table |
| AC4 a large anomaly with no flag, or a flag with a small anomaly, shows both the reference period and the flag reference years | AC4 block (both edited months state the reference mean with its period, the flag reference years and the flag counts; the cell panel states the flag reference years) |
| Every number is served (AD-8) | "Every number in the anomaly view is served" block (grid at both widths, table, open card, legend, and the cell panel for two `/cells` answers) |

## Story 3.9: most active months and years (branch `claude/3-9-most-active-ccbf1a`)

- **Rankings** (`web/src/ranks/`, new): `model.ts` builds three lists from the served `statistics.top_months`, `top_years` and `busiest_calendar_months`, in served order with served ranks and values (formatted only); `RankingsPanel.tsx` draws them as ruled tables; `words.ts` reads the contract's optional words; `ranks.css`. At laptop width the panel sits in the left column under the footnotes, beside the grid; under 800 px it follows the grid.
- **Ties:** read off the served ranks only (two entries with the same served rank), shown as "7=" with "tied" for screen readers. A tie at the cut shows more than five entries. Nothing is re-ranked or re-ordered.
- **Highlight:** each entry is a toggle button (`aria-pressed`). Selecting it frames the item on the grid (a month's cell, a year's row with its total, a calendar month's column through its median) and marks the same cells in the table view; again, or Escape, clears it; a new area or range clears it. **Grid change:** `web/src/grid/highlight.ts` (new) and a `highlight` prop on `CalendarGrid` and `CalendarTable`; `grid.css` gained the frame's two rules. The grid model is unchanged.
- **Page:** `web/src/pages/CalendarPage.tsx` holds the selection (`currentHighlight` ties it to the calendar it came from), adds `has-ranks` and `calsection` classes, and places the panel.
- **Words** (approved by the lead, 15 Nov, and in the contract 0.4.0 draft under the same keys): no rankings sentence is in contract 0.3.0, so the panel types none: the served range shows as a label, an empty list shows "–", a tie has no key sentence. Five keys switch on with a contract bump (`sentences.rankings_range`, `notes.rank_tie`, `notes.no_complete_month`, `notes.no_complete_year`, and 0.4.0's `notes.range_and_reference`); suggested wording in `DECISIONS.md`, "Story 3.9: the rankings' sentences wait for the contract".
- Checks: `npm run typecheck`, `npm run test` (244 passed; 24 in `ranks/ranks.test.tsx`), `npm run build`, `uv run python evidence/wording.py` and `uv run python tools/check_imports.py` passed.
- Browser check (built-in browser, `vite preview` of the production build, fixture mode, 15 Nov): 1280 px, panel in the left column (397 px), no row wraps, page width 1280; pointer: September 2015 framed (frame 55 × 28 around the 49 × 22 cell); keyboard: focus on 2015, Enter frames the 2015 row with the pressed entry in view beside it, Tab then Space moves the mark to 2006, Escape clears it. 375 px: panel after the grid, page width 375, no table overflows; tapping September frames the column through its median and scrolls it into view; tapping October 2006 frames that cell. No console errors.

| Criterion | Test or evidence |
| --- | --- |
| AC1 top 5 months and top 5 years with values and ranks, ties shown as ties, and the busiest calendar months on average, for the range | `ranks.test.tsx` AC1 block (each list equals the served list, order, rank and value; all twelve calendar months with served means; unit and served range shown; ties from served ranks as "7=" and "tied"; more than five on a tie at the cut; no re-ranking; empty lists show "–", never 0; the incomplete year is not listed; a range-limited answer lists its own rankings; contract words off on 0.3.0 and filled once added; every number is served; placement on the page); browser check at both widths |
| AC2 selecting a ranked item highlights it on the calendar | `ranks.test.tsx` AC2 block (toggle logic; one pressed entry; frame boxes for a month, a year and a calendar month at both widths and in both measures; no frame without a selection or for an item off the grid; table view marks the same cells; the page passes the selection to the grid and the panel; a new calendar clears it; frame is ink on paper, not colour alone); pointer, keyboard and tap in the browser |

## Story 6.5 (text draft) (branch `claude/6-5-submission-text-43275c`)

- `docs/submission/text.md`: one section per form field (project name, challenge, Project Summary, Project Demo, Final Project Link, Project Details, NASA data, References), the Members-tab checklist, and what needs the lead. Each field states its word count; no limit is known (see `DECISIONS.md`).
- Claims are quoted from `evidence/claims.yaml` word for word with their ids: two in the summary, ten in the details. `uv run pytest docs/submission` checks the quotes, the banned words and the word counts.
- `docs/submission/demo-assets.md`: the shot list for the 7-slide deck, in deck order, with what each shot waits on, and an optional 30-second Sumatra journey. The evidence-page shots can be taken now from a local build.
- Pending in the text: the web address and repository address; Story 6.1 (NASA data, References, the haze source, product documentation, links for FIRMS, Worldview, GWIS and INPE); Stories 2.8 and 2.9 (regions, daily current month); 3.6, 3.8, 3.9, 3.10, 4.3, 4.4, 5.5 to 5.7 (listed as still to come).
- Checks: `uv run python evidence/wording.py docs/submission` passed; `uv run pytest` 307 passed, 10 skipped.
- For the lead: the list under "Needs the lead" in `docs/submission/text.md`, and the two Story 6.5 entries in `DECISIONS.md`.
## Story 6.2: README, the lead's sections (branch `lead/6-2-readme`)

- README gains "Run the web against the fixture" (no service; or the service with no store, at `VITE_SERVICE_BASE_URL=http://localhost:8000`) and "Rebuild the evidence" (`evidence/build.py`, `--check`, `pytest evidence`, then the web build and `evidence/wording.py`). Both sit just above "Status", away from the data owner's sections (above "Layout" on `teammate/2.8-coverage`), so the two should merge without a README conflict.
- **Checked on the lead's machine (15 Nov, on master plus this branch):** evidence check passed, 109 evidence tests passed, web build passed, wording check passed. Web with no service: calendar, `#/evidence` and the placeholder banner render, no console errors. Web against the service with no store: `/meta` and `/calendar` answered 200 (CORS preflight 200), the same page and banner, no console errors.
- **Still open for 6.2:** the data owner's fresh-clone check ran on `teammate/2.8-coverage`, which starts before Stories 3.4, 3.5 and 3.7 (71 web tests; master has 139). Rerun the fresh clone on master once 2.8 and this branch are merged. A fresh clone cannot publish converted counts (from January 2022) without the parity case from the planning record; the README says the case is needed but not that it is not public. The lead decides whether the README says so plainly or the case is published.

## Contract 0.3.0

- Merged to master: six new sentences in `contract/messages.yaml` (`notes.year_incomplete` and a `client` section), the version moved to 0.3.0, the fixtures regenerated, and the web's four `TODO(label)` stand-ins replaced. No endpoint, field or number changes.
- Agreed by both owners (14 Nov). Branches made before it take master's `contract/` files when they rebase. See `DECISIONS.md`, "Contract 0.3.0".

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

## Story 6.4: the public link (branch `teammate/6.4-public-link`, in progress, 15 Nov)

- Fixed before any deploy: `pyyaml` (used by the service since contract 0.4.0) and `pydantic` are runtime dependencies now; the host installs runtime dependencies only, so the service would not have started. See `DECISIONS.md`.
- Waiting on the lead's host choice (Story 2.8 options) before deploying the service and web with `VITE_SERVICE_BASE_URL` and `CORS_ORIGINS`, measuring the hosted p95, and setting a keep-warm.

| Criterion | Test or evidence |
| --- | --- |
| The hosted service starts with runtime dependencies only | `test_6_4_every_runtime_import_of_the_service_is_a_runtime_dependency` |
| AC1 first request after an hour idle within the target | Not done (host not chosen) |
| AC2 a failing refresh leaves the last good version | `test_2_6_ad11_*` (store); hosted check not done |
| AC3 free limits against the judging period | Not done |
## Story 6.1: NASA datasets and references (branch `teammate/6.1-datasets`, draft for the lead, 15 Nov)

- `docs/submission/datasets-references.md`: field 7 (NASA data) and field 8 (References), ready to paste, and the link and citation for each of the about page's four `[pending: Story 6.1]` marks.
- For the lead: the about page lists NOAA-21 under VIIRS, but no published version holds NOAA-21; four items stay `[unverified]` (listed in the file).

| Criterion | Test or evidence |
| --- | --- |
| AC1 each NASA dataset with link, citation and its use | Field 7 in the file; each DOI resolved at doi.org |
| AC2 every external resource listed | Field 8: datasets, Natural Earth, two papers, services named in the text, every pinned library with its licence |
| AC2 every citation checked or marked `[unverified]` | Checking method at the top of the file; four marks remain |

## Story 6.2: fresh-clone run, rerun on master (15 Nov)

- Fresh clone of master at `b1e8e2e` (after PR 12): `uv sync`, import check, pytest 405 passed and 11 skipped (no local store), evidence check, fixture `/meta`, web `npm ci`, typecheck, 313 tests, build and wording check all passed.
## Story 2.10: NOAA-20 against Suomi NPP, reported only (branch `teammate/2.10-noaa20`, 15 Nov)

- Result: `docs/results/noaa20_check_20261115T051158Z.json` (for the lead to copy into `evidence/scoring/`; the evidence page then shows it). Pooled at 1°: mean absolute difference 5.02, bias +7.2%. NOAA-20 is higher in all six regions; **Siberia +17.3%**, the rest +0.5% to +7.7%. Reported to the lead as a finding; C1 unchanged.
- `/meta` serves the headline once a version is published with `--noaa20-check` (waits for the next publish, so for the host choice).
- Also on this branch: the Sumatra (September 2006) and Australian threshold misses traced to hotspots on small islands, likely left out of the harness's country files (`docs/cleaning-differences.md`; not confirmed row by row).

| Criterion | Test or evidence |
| --- | --- |
| AC1 C1 unchanged on each satellite, Jan 2022 to Oct 2026 | `test_2_10_ac1_c1_is_applied_unchanged_to_each_satellite`, `test_2_10_ac1_excluded_rows_and_rows_outside_the_period_count_nothing` |
| AC1 error and bias per region, 1° and whole region | `test_2_10_ac1_figures_per_region_at_1deg_and_whole_region`, `burncal/core/test_compare.py`; six-region run above |
| AC2 file labelled reported only, not a validation | `test_2_10_ac2_the_file_says_reported_only_and_not_a_validation` |
| AC2 `/meta` serves the headline | `test_2_10_ac2_meta_serves_the_noaa20_headline_rounded_once`, `..._is_null_until_the_run_exists`, `test_2_10_ac2_publish_puts_the_noaa20_headline_in_the_version` |
| AC2 nothing fitted, no final-set data | The step reads only cleaned rows of 2022–2026 and the frozen params (hash in the file) |
| AC3 a large difference goes to the lead | Siberia +17.3%, in `DECISIONS.md` and the report |

## Story 6.4: six regions from inside the deployment (branch `teammate/6.4-host-bundled`, 15 Nov)

- Option 1 works on Vercel Hobby: the whole version `20261113-19dfbcc8` (six regions, NOAA-20 headline) ships inside the function as a 3.5 GB large-functions bundle (`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`, set for Preview and Production). Details and the numbers in `DECISIONS.md` (Story 6.4, 15 Nov).
- Hobby refuses source files over 100 MB, so the deploy folder ships `points.parquet` as 15 parts and its `index.py` passes the glob as `points_location`. Answers hash identically to the single file.
- Preview: p95 of 20 Sumatra calendars 1.04 s, whole extents up to 4.01 s, cold start 5.9 s, RSS 284 MB.
- **In production since 15 Nov 14:34 SGT:** `burncal-stub.vercel.app` serves `20261113-19dfbcc8`, six regions, p95 1.14 s, whole extents up to 3.85 s. Rollback steps in `DECISIONS.md`.
- Deploy folder recipe (outside the repo): as before, plus the whole version under `store/versions/<v>/` with `points/part-*.parquet` in place of `points.parquet`, the previous version beside it, and `store/CURRENT.json`. Redeploys upload only changed files.

| Criterion | Test or evidence |
| --- | --- |
| Six regions served hosted | Preview: all six calendars 200, null only Jan–Jun 2002 and Dec 2026 |
| p95 under 3 s | 20 Sumatra calendars, p95 1.04 s |
| Whole extents under 10 s | 1.07–4.01 s |
| Split points give the same answers | 12 areas plus one CSV year hash identically (single file against parts) |
| Production and `/meta` | `/meta`: `19dfbcc8`, contract 0.4.0, six loaded, NOAA-20 headline; 20 calendars p95 1.14 s |
| Version and CURRENT.json on Hugging Face | `19dfbcc8` uploaded (394 files, same count and bytes as local), then `store/CURRENT.json` = `19dfbcc8`, previous `d6f8b9e6` |

### 6.4: free limits that could run out during judging (Vercel Hobby, read 15 Nov)

- **What happens:** over any Hobby allowance, the team is paused and visitors get `503 DEPLOYMENT_PAUSED`; the usage resets after 30 days, but a paused team does not resume on its own (support, or move to Pro). So no limit may be crossed before 23:59 on judging days.
- **Active CPU, 4 CPU-hours a month: the one to watch.** A calendar takes about 0.2 s (Sumatra) to 1 s (Southern Africa) of compute and each cold start about 1.4 s, so 4 hours is roughly 15,000 to 70,000 calendars. Usage before today is small.
- **Provisioned memory, 360 GB-hours:** billed only while a request is in flight (2 GB instance, about 1 s per calendar: well over 100,000 calendars).
- **Invocations 1M, CDN requests 1M, Fast Data Transfer 100 GB, Fast Origin Transfer 10 GB:** a calendar is 16 KB gzipped, so 10 GB is about 600,000 calendars; a year of Sumatra `/hotspots.csv` is 1.4 MB.
- **Deployments 100 a day; each source file at most 100 MB** (hence the split points). Runtime logs keep 1 hour.
- **Keep-warm:** Hobby cron runs at most once a day, so `.github/workflows/keep-warm.yml` asks `/meta` every 5 minutes (about 8,600 calls a month, negligible CPU). Whether it keeps an instance warm depends on how long Vercel keeps an idle instance, which the docs don't state; check the cold-start rate in the logs after a day.
- **Not checked:** the account's usage so far this month (dashboard, Usage tab).

## Epics 7 and 8 (15 Nov, branch `integrate/epics-7-8`)

- Fifteen stories built in parallel and merged: 7.1–7.7 and 8.2–8.10 (7.8, 8.1 and 8.8 were already done). Contract 0.5.0 drafted: `/raw_splice`, `/season`, `/season_to_date`, `/world_cells`, `Calendar.trend`, and the `/calendar` options `reference_period` and `shared_scale_with`. All optional; old answers unchanged.
- Checked on fixtures only. Before going live: the data owner agrees 0.5.0, redeploys the service, then the web (service first). Then check each new panel on the live site.
- Details, choices and open items: `DECISIONS.md` ("Epics 7 and 8 built in parallel").

## Story 6.3: security and readiness (15 Nov, done)

- `/security-review` on the changes since `596416b`: no High or Medium finding. `/codex:review --base 596416b`: no actionable bugs.
- gitleaks: 101 commits on every branch and the working files, no leaks. pip-audit (uv export) and `npm audit --omit=dev`: no known vulnerabilities. `.env` git-ignored, `.env.example` present, no notebooks, gitleaks pre-commit hook in place.
- Not covered: the Vercel deploy folder (outside the repo). Definition-of-done items owned elsewhere: the fresh-clone run (6.2) and the link through judging (6.4).
- References field: Natural Earth admin 5.1.2 and the trend test's papers (Mann 1945, Kendall 1938, Sen 1968) added.

## Story 2.9: the current month, refreshed daily (branch `teammate/2.9-daily-refresh`, 15 Nov)

- `burncal.pipeline.refresh` brings every region up to the day before FIRMS's last NRT day. It asks FIRMS which days each source has, re-downloads only the source-year files whose span changed (daily: MODIS NRT and NOAA-20 NRT for 2026), links every other file, and rebuilds only the years that changed. Then it publishes all six regions as one new version. Everything new goes under one new folder (`store/refresh/<date>/`); nothing is overwritten.
- When FIRMS adds standard days, the standard file and the NRT file both change, so that year is rebuilt with standard rows (standard beats NRT per satellite-day, AD-6) and the version changes.
- A 2026-only rebuild from the same raw files equals the full build in all six regions: every clean, record and grid file identical (Southern Africa 87 s, the rest 6–17 s).
- Real run to 14 Nov (15 Nov, 6 min 12 s for six regions): FIRMS NRT ran to 15 Nov, so `data_through` is 14 Nov. Re-downloaded only MODIS NRT and NOAA-20 NRT 2026 per region; rebuilt 2026 only. Published `20261114-5a585fe8`, **in production since 15 Nov 16:13 SGT**: parity PASS (worst 2.9e-10), `check_numbers` 0 failures in all six regions, every region calendar 200 with nulls only Jan–Jun 2002 and Dec 2026, Sumatra November 231.4 → 232.5. Local: 20 Sumatra calendars p95 0.17 s, largest whole extent 0.85 s. Production (from Singapore): 20 Sumatra calendars p50 0.98 s, p95 1.16 s; whole extents 0.87–3.88 s; one year of `/hotspots.csv` 1.11 s; cold start 6.2 s, RSS 284 MB.
- **Deploy change:** the bundle now carries only the current version. Two six-region versions came to 5.1 GB, over the 5 GB large-function limit; a request naming the previous version gets `410 version_superseded` (tested). Points ship in 16 parts under 100 MB; 12 areas and one CSV year answer identically to the single file. Production and previews run in **iad1**, not sin1.
- Hugging Face: `store/versions/20261114-5a585fe8` uploaded (394 files, as local), then `store/CURRENT.json` points at it (previous `20261113-19dfbcc8`).
- **Hosted daily job (AC2):** `.github/workflows/daily-refresh.yml`, daily at 09:30 SGT and by hand. It publishes on the recorded parity pass (`burncal/pipeline/parity_pass.json`, keyed on the C1 params and `burncal/core` code; rerun `uv run python -m burncal.pipeline.parity --record` with the case whenever either changes), builds the deploy folder with `tools/build_deploy.py`, deploys, and switches `CURRENT.json` last. The secrets are in; the lead still needs to add the repository variable `HF_DATASET`. The build state (raw, clean, record, land file) is in the dataset's `state/` folder. Not yet run on GitHub: a workflow runs by hand only once it is on master.

| Criterion | Test or evidence |
| --- | --- |
| AC1 current month in the record, `data_through` at most 2 days old | `test_2_9_ac1_refresh_fetches_only_the_files_whose_span_changed`, `test_2_9_ac1_availability_gives_standard_ends_and_last_full_nrt_day`; real run above |
| AC1 a year rebuilt alone equals the full build | `test_2_9_ac1_clean_one_year_equals_that_year_of_the_whole_build`, `test_2_9_ac1_convert_one_year_equals_that_year_of_the_whole_build`; six-region proof above |
| AC1 a partial download is never published | `test_2_9_ac1_an_incomplete_fetch_stops_the_refresh` |
| AC2 daily job reads the key from CI secrets, never logs it | `daily-refresh.yml` reads `FIRMS_MAP_KEY` from secrets into the environment only for the refresh step; `firms.py` never prints URLs. `test_2_9_ac2_*` (recorded pass); simulated run. First GitHub run after merge |
| AC2 publishes a new version without the private case | `test_2_9_ac2_*`; simulated run published on the recorded pass |
| AC3 standard days replace NRT days, version changes | `test_2_9_ac3_standard_days_replace_nrt_days_as_they_arrive`; the version hash covers the raw files |

## 15 Nov evening: 0.5.0 live, world year measured, state on the dataset (data owner)

- **Live:** service `burncal-stub.vercel.app` on contract 0.5.0 with `20261114-5a585fe8` (data through 14 Nov); web `burncal-web-eight.vercel.app` rebuilt from master. All four new endpoints answer in every region; 548 tests pass on the real store. Details and timings in `DECISIONS.md` ("Contract 0.5.0").
- **`/world_cells`:** 0.29 MB for six regions; a world store would be about 3.7 MB, near the 4.5 MB limit. Add `GZipMiddleware` before any world store (about 10 KB gzipped).
- **World 2025 (2.8 AC3):** measured, `docs/results/world_2025_measurement.md`. One global year builds in about 3 min; a world history needs about 65 GB at once, so not on this machine tonight. The Suomi NPP 2025 zip needs downloading again.
- **Daily workflow state:** the store dataset's `state/` folder holds the build state the workflow reads (1,033 files, checked against the local copy). The workflow runs once PR 17 is on master and `HF_DATASET` is set.
- **Local cleanup:** old versions deleted locally (all on the dataset). Rollback is by promoting a previous Vercel deployment; see `DECISIONS.md`.
- **Vercel and GitHub:** not linked, by decision. A web change on master shows only after a manual build and deploy.

### 6.4: the web app is public (15 Nov, 15:00 SGT)

- **Web:** `https://burncal-web-eight.vercel.app` (Vercel project `burncal-web`; the plain `burncal-web.vercel.app` name belongs to someone else). A static build of master `596416b` with `VITE_SERVICE_BASE_URL=https://burncal-stub.vercel.app` and `VITE_REPO_URL` set to the repository. The build is made outside the repo; to redeploy, build `web/` with those two variables and deploy its `dist/` to the project.
- **Service:** `CORS_ORIGINS=https://burncal-web-eight.vercel.app` (Production), redeployed; `/meta` and the `/calendar` preflight answer with that origin.
- **Checked in a browser:** Sumatra (default), Southern African savanna (picked in the panel) and Siberia (shared link opened in a new tab) load live counts from `20261113-19dfbcc8` with their cautions; no console errors.
- **Seen, not fixed (web, the lead's area):** editing only the address's `#/?area=` in an open tab does not switch the area; opening the same link fresh does.
- **Not done:** a custom domain; a phone-width pass on the hosted site.

## Next

**As of 15 Nov 20:45 SGT (build stops 21:00):**

1. DONE (19:55): PR 17 and PR 18 merged, `HF_DATASET` set; the daily workflow's first run passed from the fix branch (run 43709476744) and production serves `20261114-072d10c1`. Lead: merge the fix PR (`teammate/2.9-ci-fix`) so the 09:30 schedule uses it. The submission's daily-refresh sentence is filled.
2. DONE (20:15): six regions for the submission, decided by the data owner. The submission's deeper views were checked live and the mark removed; Vercel Active CPU 43 min of 4 h for the cycle 16 Oct to 15 Nov.
3. DONE (20:00): 6.2 fresh clone of master `bf17ab7` passes every check; see `DECISIONS.md` (Story 6.2, final master).
4. Before judging: Active CPU was 43 min of 4 h for the cycle 16 Oct to 15 Nov; keep-warm runs every 5 minutes.
5. DONE (20:35): the lead closed Story 2.9 and Epics 7 and 8 after reviewing the UI (PR 23). Spot-checked live on Sumatra: trend, reference period, raw splice, seasonal profile, season to date, month map, country picker, two-area comparison and the globe all load, with no console errors and no "unreachable" message.
6. DONE (20:30): PR 22 fixed the 400 answers' placeholder `record_version` and the phone-width overflow (evidence, globe, calendar; checked live at 375 px). Still open after judging: `GZipMiddleware` for `/world_cells` before any world store; re-record the parity pass after any `burncal/core` change.
7. DONE (21:55): Kalimantan is live as a seventh covered area (110–120°E, 5°S–5°N; not featured, cells not evaluated). Production serves `20261114-dcc739ea` with seven areas; the daily refresh includes it from now on. Details in `DECISIONS.md`.
8. Tomorrow 09:30 SGT: the first scheduled daily run; check it.
9. Left for the lead: the demo deck (6.5) and pasting the submission fields.

Earlier list (14–15 Nov), kept for the record:

From the lead's review of PRs 3 to 11 and the Codex adversarial review of the prototype (both 14 Nov; Codex: needs attention, three high findings, all folded into item 1). Merged with two fixes: `/meta` from a store now says contract 0.3.0 (a test ties it to `openapi.yaml`), and a hotspot search with no record file in its range gives the header and no rows instead of a 500.

Checks on the merged master: `uv run pytest` 310 passed, 1 skipped (Sumatra record test, no local `store/`; parity case set); full C1 parity PASS, worst miss 2.1e-9 (4A, 1°); import, evidence and wording checks passed; web typecheck, 71 tests and build passed; gitleaks `git` and `dir` found no leaks; `params/` and `evidence/scoring/` unchanged.

1. Data owner, before any converted count is public:
   - **AD-2 gate.** DONE (14–15 Nov): publish refuses converted counts unless the parity case passes, the pass carries the `c1_params.json` hash and code revision, and the publish command refuses uncommitted `burncal/` code; see `DECISIONS.md`. Was: `publish()` in `burncal/pipeline/publish.py` hashes the params but never runs the parity check; only pytest does, and it skips without the case folder. Publish should refuse converted counts unless parity passes, and the passing result should be tied to the exact code revision and `c1_params.json` hash of the version being published (Codex review, 14 Nov).
   - **Null is not 0.** DONE (15 Nov): months with no feeding day loaded are null (`outside_coverage`). Was: In `burncal/service/answers.py` (`calendar()`), every month in the record gets a count even when no feeding day was loaded, so a coverage gap is served as `0.0`. `burncal/pipeline/aggregate.py` also writes 0 for in-record cell-months with no rows. Both should be null from coverage and missing days.
   - **Static-mask inputs.** DONE (15 Nov): the build refuses without every tuning-year file. Was: `burncal/pipeline/clean.py` / `build_extent.py` build the mask from whatever raw files are present. Fail the build unless Aqua, Terra and Suomi NPP for 2014, 2016, 2017 and 2020 are all there (the McArthur River cell, 136E 16S).
   - **2.5 AC2 record.** DONE (15 Nov): `DECISIONS.md` and tests. Australia's 5 misses remain after the rebuild with Suomi NPP 2016 and are not the static mask; a coastline difference is likelier, not yet checked. Was: Put the Australian grassland (967/972) and Amazon forest (672/672) threshold parity in `DECISIONS.md` and a test, with the 5 misses and their cause.
   - **AD-11.** DONE (14–15 Nov): a version that fails to load leaves the last good one serving; the previous version loads only when a request names it; `publish()` loads the new version before switching `CURRENT.json`. Was: In `burncal/service/store.py` `refresh()`, a version that fails to load makes every request 500. Keep serving the last good version. Two cheap parts (Codex review, 14 Nov): load the previous version only when a request names it, so a bad previous version cannot stop the current one; and have `publish()` load the new version once (as the service would) before it switches `CURRENT.json`.
   - **Memory.** DONE (15 Nov): points are read from disk with DuckDB, not held in memory. Hosted Sumatra: RSS 250 MB at start-up. Six regions publish locally at 4.0 GB peak but are not deployed: their start-up files are 901 MB, over the 120 MB gate (Story 2.8). Was: `Store.refresh()` builds a `Version` for the current and the previous version at start-up, each holding all of `points.parquet` and the 0.25° grid. Loading the previous one lazily (above) roughly halves cold-start memory on Vercel's 2 GB. Measure peak memory with Sumatra, then with six regions, before 2.8 publishes.
   - **Sep 2006, 105E 6S.** Open. The harness history has 39 Aqua rows for that cell-month, from the FIRMS Indonesia country archive file, none dropped by its cleaning (all day, type 0). Diff the product's 41 against them and record the cause in `docs/cleaning-differences.md` (country archive versus area API is the likeliest).
2. Data owner: deploy the real service to Vercel. DONE (15 Nov): see "Story 2.6 AC6 and hosting" above (Sumatra, p95 1.07 s). Six regions wait on the lead's choice among the options in `DECISIONS.md` (Story 2.8).
3. Contract 0.4.0 merged into master on 15 Nov, with the data owner's agreement (`DECISIONS.md`, "Contract 0.4.0 drafted by the lead"). It touches `burncal/service/answers.py` and `app.py`, which `teammate/2.8-coverage` also edits: expect conflicts there when 2.8 merges.
4. Low items from the reviews: DONE 15 Nov except the card's missing-days caution, which needs a contract field (see `DECISIONS.md`). Were: `share_of_max` can use a part-year as the 100% bar; the current-month card gives no caution when days 1 to *d* have missing days; a null `frp` would be written as `nan`; `validated_satellite` is true for months outside the record; `anomaly_count` can be `-0.0`; with `year` set, `/hotspots.csv` has no row limit; `/cells` serves threshold 0.0 after `data_through`; `compare_tuning` prints "fire days".
5. Lead: Story 3.4 (the dates tab) is at review on `claude/3-4-dates-ac58f0`, with sentences to add in a contract bump; Stories 5.5 and 5.6 go below the head-to-head table on the evidence page.
6. **Lead: final reviews for Story 6.3 (planned 15 Nov).** Gitleaks over the whole history ran on 15 Nov at 12:28 SGT: 85 commits on every branch, including `teammate/2.8-coverage`, no leaks. Only `.env.example` and `web/.env.example` were ever committed, and `.env` is git-ignored. Still to run, once each, by the lead:
   - `/security-review` and the Codex review (`/codex:review`) on master.
   - **When:** after `teammate/2.8-coverage` is merged and the deploy settings (host config, `CORS_ORIGINS`, environment variables) are in master, since those are the riskiest parts for security and neither review would see them earlier.
   - **Latest:** about 18:30 SGT, to leave time to fix findings before the 21:00 build stop. If 2.8 or the deploy is not in by then, run both on master as it stands and review the 2.8 changes on their own when they land.
   - Rerun gitleaks after 2.8 merges if the branch gains new commits.

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
| Sun 15:00 | The planning documents the evidence view links to are copied into `docs/planning/`, after the lead has read each | Lead. Copied 15 Nov: the lead's session pre-screened the three files and the lead approved the copy with two sentences shortened (`docs/planning/README.md`). Gitleaks over the history: no leaks (12:28). The security review and Codex review are planned in "Next", item 6. |

## Things to keep in mind

- The scoring harness ran on Python 3.12.15, numpy 2.5.4 and pandas 3.1.1; the product pins Python 3.14. Check this first if the parity check misses.
- No converted count is published until the parity check passes.
- Product tests sit beside the code. The scoring harness stays in the planning record and nothing here imports it.
- The service holds each version it serves in memory (current and previous). A global store will not fit that way; it needs reads by tile.
- Starlette warns that `httpx` in its test client is deprecated in favour of `httpx2`. Not acted on.

## Story 4.3: picture downloads

- New code is in `web/src/download/`: `capture.ts` (writes each element's resolved paint onto a copy of the live chart, drops focus rings), `figure.ts` (adds title, area, dates, unit, legend, notes, data-through, record version and source line), `save.ts` (SVG, or PNG at 2×), `content.ts` (what each picture says), `PictureDownload.tsx` (format choice and button). Existing files only gained a small hook each: `CalendarPage.tsx` (a ref and the control under the legend) and `CurrentMonthCard.tsx` (a ref, a `geometry` prop and the control under the ruler).
- The chart in the file is a copy of the one on screen, so its numbers are the screen's served values; the browser computes none. An unnamed area is shown by its box coordinates.
- Pictures: the calendar (follows the Counts / Anomalies switch, so the legend matches) and the current-month ruler. The rankings panel is HTML lists, not a chart, so it has no picture. In the table view the grid is not drawn, so the calendar button says to show the grid.
- Checks: `npm run test` (276 passed, 11 of them Story 4.3), `npm run build`, `evidence/wording.py` passed. In the browser at 1280 px the calendar SVG (300 cells, served counts, styled) and the ruler SVG and PNG downloaded with the right names; the calendar picture was viewed and is correct. The calendar PNG path shares the ruler's code and was not separately downloaded.
- Waiting for the contract: the source line, the calendar title and two error lines (see `DECISIONS.md`, "Story 4.3"). Story 4.4 moves the controls.

## Story 4.4: download controls

- New: `web/src/download/csv.ts` (asks `postAnalyticsCsv` / `postHotspotsCsv` with the searched area and dates, saves the served text, maps problems to contract sentences) and `DownloadControls.tsx` (the block). `CalendarPage.tsx` renders it in the left column and builds the two picture specs; the per-chart picture controls in the calendar section and `CurrentMonthCard.tsx` are gone (the card lost its `geometry` prop).
- Fixture mode: `CalendarView` gets `csvService` (null without a real service); the CSV buttons are then disabled with a one-line reason.
- Checks: `npm run test` (288 passed, 10 of them Story 4.4), `npm run build`, `evidence/wording.py` passed. Browser at 1280 px and 375 px (fixture mode): block present, CSV buttons disabled with the note, pictures enabled, no horizontal overflow. Not checked against a live service: a real CSV download, the busy state and a real 413 (covered only by unit tests with a fake service).



## Story 3.10: accessibility and phone-width pass

- Merged 15 Nov. Anomaly view: a bar marks below-mean classes (grid and legend; the table already prints the signed value) so the sides differ in greyscale. 32 px targets, picker arrow keys and Escape, a skip control, evidence table names. Checks: tsc, vitest (288), build, wording.py passed. The skip wording is approved. Details: DECISIONS.md.

## Story 7.8: all-candidates table

- Merged 15 Nov. Collapsed table on the evidence page: 16 rows (13 singles, C1 to C3), figures from `evidence.json` table `selection.candidates`, reasons in `web/src/evidence/candidates.ts`, approved by the lead after four were corrected against the scores. Checks: pytest, `evidence/build.py --check`, tsc, vitest (294), build, wording.py passed. Details: DECISIONS.md.

## Story 8.1: shareable link

- Merged 15 Nov. `web/src/share.ts` encodes and reads the area, dates and view in the hash (`#/?area=sumatra&from=2015-01-01&to=2020-12-31&view=table&measure=anomaly`); `CalendarPage` reads it on first load and rewrites it with `replaceState`. No new wording; no Copy link button; no link length limit (approved). Details and the length measurements: DECISIONS.md.
- 15 Nov fix: an address edited in an open tab (or Back and Forward) now loads what it names (`addressChange` in `share.ts`; `CalendarPage` remounts on `hashchange`). Checked against the live service. Web changed after the deployed build, so the web needs a rebuild and redeploy.

## Story 8.8: featured-area gallery

- Merged 15 Nov. The Featured tab of the area picker is now six cards (`web/src/area/FeaturedGallery.tsx`): outline from `contract/regions.geojson`, the contract's evidence-class sentence, and the southern African savanna caveat sentence on its card before opening. Opening keeps the dates and the link shows `area=<id>`. No new wording; no service change. Details: DECISIONS.md.

## UI fixes after the lead's review

- 15 Nov, not committed yet. Seventeen fixes the lead checked in the browser (fixture mode): clickable gallery cards without the caveat, ruler scale note and labels, own y axis per record-chart view, trend year labels, null months in the hotspot map, the analysis tab block (seasonal profile, running total, trend, record chart), raw view without record marks, whole-page compare with linked hover, plainer globe, sticky About margin, lighter caveat cell map, select-based date pickers. Tests updated for the intended changes. Checks: pytest (526), check_imports, tsc, vitest (394), build, wording.py passed. Contract wording to agree with the data owner: new `sentences.ruler_scale` and `sentences.cells_flagged_none`, reworded `notes.globe_uncovered`. Not yet checked against the live service. Details: DECISIONS.md.
