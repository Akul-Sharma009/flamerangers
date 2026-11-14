# Handoff

Short running status for the next session. Facts only; decisions and their status are in `DECISIONS.md`, story status in `sprint-status.yaml`.

Updated: Sat 14 Nov 2026, evening SGT (Stories 5.4 and 3.3; contract 0.3.0).

## Where things stand

| Story | Status | Notes |
| --- | --- | --- |
| 1.1 Repo scaffold | Done | Reviewed by the lead |
| 1.2 Contract and fixture | Done | Contract 0.2.0 is frozen (14 Nov). A change needs both owners and a version bump. |
| 1.4 UI concept | Done | `UI-CONCEPT.md` in the planning record |
| 1.3 Service stub | Done | On contract 0.2.0; Vercel trial measured (see below). Merged (PR 1) |
| 2.1 C1 parameters | Done | In `burncal/core/params/` |
| 2.2 C1 in core | Done | Full parity PASS on the lead's machine (worst miss 2.1e-9). Merged (PR 2) |
| 1.5 Web shell | Review | Draws Sumatra from the fixture; committed. See below. |
| 5.1 Scoring files and claims | Done | `evidence/claims.yaml` written and checked; the lead approved the wording. See below. |
| 6.6 Pitch storyline | Done | Drafted in `docs/pitch/storyline.md` as a 7-slide deck. See below. |
| 5.2 Evidence build and checks | Done | Merged to `master`. See below. |
| 5.3 The outcome in plain words | Done | Merged to `master`. See below. |
| 5.4 Head-to-head table | Done | Reviewed by the lead and merged to master. See below. |
| 3.3 Select an area | Done | Reviewed by the lead and merged to master. See below. |

`master` holds Stories 1.1 to 1.5, 2.1, 2.2 and 5.1. New work branches from `master`.

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

## Next

1. Data owner: Story 2.3 is PR 3 and Story 2.4 is PR 4 (stacked on PR 3). The lead reviewed both on 14 Nov: tests, the import check, gitleaks and full C1 parity pass. Before merging:
   - PR 3: rebase onto master (conflict only in `DECISIONS.md`; keep both sides; take master's `contract/` files).
   - PR 4, the five C1 per-row choices: 1 (rules strictly inside the polygon), 2 (a footprint's 1A term uses its anchor's area) and 4 (ties broken by satellite, time, latitude, longitude) are confirmed. 3 (5° season tiles) is confirmed, with each build extent widened to whole 5° tiles so a tile's season does not depend on where the extent is cut. 5 changes: a 1° cell's `evidence_class` is the class covering most of its area, with any part outside every region counted as `not_evaluated` and an exact tie going to the weaker class, so a cell half inside a region and half outside is `not_evaluated` (over the six regions: 225 tuned, 570 tested_unseen, 6 reported_only, 38 not_evaluated; the 8 cells that move are half-inside Punjab cells). The lead's first counts (14 and 30) let the region win ties; the lead confirmed the stated rule on 14 Nov. `region_caveat` is computed from the AOI's shape against the region boundaries, not from cell classes. The data owner records these in `DECISIONS.md` ("Story 2.4") with the lead's call noted.
   - Then the lead rechecks the tests and parity and merges PR 3, then PR 4.
2. Lead: Story 3.4 adds the dates tab to the same picker; Stories 5.5 and 5.6 go below the head-to-head table on the evidence page.

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
