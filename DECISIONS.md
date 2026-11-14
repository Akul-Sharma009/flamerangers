# Decisions made during the build

Planning decisions and the selection record (how C1 was chosen, and the scores) are in the planning record's `DECISIONS.md`, which is frozen. This file holds only decisions made during the build.

Each entry has: a status (**ASSUMED** or **TESTED**), its evidence, and a "revisit if" line. ASSUMED entries are open questions, not settled facts.

<!-- Entry format:

## Short title (date)

- **Status:** ASSUMED | TESTED
- **Decision:**
- **Evidence:**
- **Revisit if:**
-->

## Web types are generated outside the lockfile (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** `npm run gen:types` runs `openapi-typescript` 7.13.0 through `npm exec` with its own TypeScript 5.9.3. It is not a devDependency. The app itself stays on TypeScript 7.0.2 as pinned.
- **Evidence:** `openapi-typescript` 7.13.0 needs the TypeScript 5 compiler API and fails under 7.0.2 (`TypeError: createKeywordTypeNode`); an npm `overrides` entry did not fix it. With the `npm exec` route, types generate from both a two-field OpenAPI file and the real contract, and the result type-checks under 7.0.2. Not compared against another generator or against pinning the app to TypeScript 5.
- **Revisit if:** type generation must run offline or in CI without network access, a generator that supports TypeScript 7 appears, or the generated file is found to differ between machines.

## The generated API types are committed (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** `web/src/api/schema.d.ts` is committed, and regenerated whenever `contract/openapi.yaml` changes.
- **Evidence:** generation needs the network (entry above), so a fresh clone could not build without the committed file. No check yet fails the build when the file is stale.
- **Revisit if:** the file and the contract are found out of step; then add a check that regenerates and compares.

## Contract 0.2.0: how the plan was read where it left room (14 Nov 2026)

- **Status:** ASSUMED. Both owners agreed and the contract was frozen on 14 Nov 2026; the readings below are agreed but not yet tested against a built service or screen.
- **Decision:** the rewritten `contract/openapi.yaml` settles these points, each of which the plan left open or the first draft read differently:
  1. **One reference period for every month.** Medians, means and anomalies use the complete calendar years from 2003 that end before the current month (2003 to 2025 today), not a rolling "all prior years" window per month. Flag thresholds use 2003 to 2011. The two are served as separate fields.
  2. **Ratio against the median, anomaly against the mean.** `ratio_to_median` is count over median and is null when the median is 0. `anomaly_count` and `anomaly_pct` are measured from the reference mean, because the anomaly view is centred on it.
  3. **Errors and cautions are separate.** `no_land`, `outside_coverage` and the rest are `application/problem+json` answers with a 4xx status. Only the two scale cautions travel inside a successful answer. An area partly outside coverage is `outside_coverage`, so a partial count is never shown as if it were whole.
  4. **Rankings follow the date range; the record high does not.** `rank`, `top_months`, `top_years` and `busiest_calendar_months` cover complete months and years inside the range. `record_high` is the highest complete month of the whole record for the area.
  5. **The web does no comparison either.** Each month carries its `colour_class` and `anomaly_class`, each year its `share_of_max` for the bar, and booleans such as `no_typical_activity` replace tests the web would otherwise make.
  6. **Large hotspot downloads** answer 413 `too_large_for_sync` with the estimated size and the list of years; the web then asks one year at a time. No separate estimate endpoint.
  7. **POST with a JSON body** for every endpoint except `GET /meta`, as the architecture lists them. `record_version` is required in every body.
- **Evidence:** read against the architecture rules AD-8, AD-9, AD-11, AD-12, AD-15 to AD-17, epics Stories 1.2, 3.1 to 3.9, 4.1 and 4.2, and the UI concept. An independent review of the first draft found the gaps this closes. 44 tests pass, including every fixture validating, every enum value present, and closed schemas. Not tested: a real service or web screen built against it.
- **Revisit if:** `core.stats` cannot produce a field cheaply; or building the web shell (Story 1.5) shows a number with no served field.

## Fixtures are generated, with invented numbers (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** `tools/build_fixture.py` writes everything in `contract/fixture/`. `calendar.json` is a full Sumatra grid (2002 to 2026) so the web shell can draw the real layout. Files under `fixture/examples/` show states Sumatra cannot produce.
- **Evidence:** hand-written fixtures of five months could not exercise a year-by-month grid, year totals or rankings. The generator's numbers are invented and `/meta` says `placeholder: true`.
- **Revisit if:** the generator's statistics are ever mistaken for the product's. The real ones live in `burncal/core` only.


## Story 1.5: messages.yaml is parsed at build time with `yaml` 2.9.1 (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** `yaml` 2.9.1 is an exact-pinned devDependency, used only by a small Vite plugin (`web/vite.config.ts`) that turns `contract/messages.yaml` into the virtual module `virtual:messages`. The browser ships JSON and no YAML parser; there is one source for the words.
- **Evidence:** No YAML parser was in the tree. The alternatives were a generated `messages.json` (a second copy that can drift) or a runtime parser (bundle weight). Vitest uses the same config, so tests read the same words.
- **Revisit if:** the service starts serving the messages, or the plugin breaks under a Vite upgrade.

## Story 1.5: fixture mode when VITE_SERVICE_BASE_URL is unset (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** `web/src/config.ts` gives `null` when the variable is unset or empty, and `web/src/api/client.ts` then reads `contract/fixture/` through lazy imports. Setting the variable points the same client at the service. The old `http://localhost:8000` default is gone.
- **Evidence:** Story 1.5 needs the shell before Story 1.3's stub exists. Client tests cover both modes, problem answers, and one retry on `version_superseded`.
- **Revisit if:** the public build must never fall back to fixtures; then make an unset variable a build error.

## Story 1.5: grid drawing (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** A pure model (`web/src/grid/model.ts`) groups the served months by year, newest first, and maps served fields to marks. D3 draws the SVG at the container's real pixel width, so text stays legible at 375 px; below about 700 px the cells show tint only, with the value in the tooltip. The ramp is seven sepia steps, one per served `colour_class`, extended from the mockup's stops; text is ink on classes 0–3 and paper on 4–6. `null` months are hatched, and `0` months take the lightest fill with a "0". A month carries the strong mark if any cell is strong, else the marginal mark if any is marginal. The sensor-change rule is placed from `meta.record_switch.viirs_from`.
- **Evidence:** It follows UI-CONCEPT.md. Contrast against the paper runs 1.09 (class 0, "near zero", as in the concept) to 14.2. Ink on class 4 would be 3.3:1, so class 4 takes paper text (4.6:1). No colour-vision simulation was run (Story 3.10). The flag-mark noise was not judged on real data.
- **Revisit if:** real data puts a flag mark on most months (UI-CONCEPT.md section 5), or the Story 3.10 simulation fails.

## Story 1.5: hash routes and system font stacks (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Top navigation uses hash routes (`#/`, `#/evidence`, `#/about`), with no router package. Type uses the mockup's system serif, sans and mono stacks. No web fonts are loaded yet.
- **Evidence:** Hash routes need no server rewrite on an unchosen host. UI-CONCEPT.md says "two Google Fonts families" but names none.
- **Revisit if:** shareable deep links (FR-30) need real paths, or the fonts are chosen.

## Story 1.5: hero sentence and ruler left to Story 3.7 (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The calendar page shows the area name, size, cautions and standing notes on the left, and not the current-month sentence or ruler.
- **Evidence:** The sentence template and the "usual =" line are UI copy with no entry in `messages.yaml`. Writing them is Story 3.7's job, with the lead deciding the words.
- **Revisit if:** the lead wants the sentence for the Saturday demo.

## Malformed requests answer 400, not 422 (14 Nov)

- **Status:** ASSUMED
- **Decision:** The service answers any malformed request body (missing field, bad date, wrong geometry type, unknown field) with `400` and `application/problem+json`, code `invalid_aoi`, and a `detail` naming the field. It never uses FastAPI's default `422`.
- **Evidence:** Contract 0.2.0 maps `422` to `no_land` and has no code for a malformed body. Test `test_1_3_ac1_malformed_request_gets_400_problem_not_422`.
- **Revisit if:** the contract adds a code for a malformed request (needs both owners and a version bump).

## CSV counting limits and citation before Stories 5.7 and 6.1 (14 Nov)

- **Status:** ASSUMED
- **Decision:** Until the about-the-data text (5.7) and the dataset references (6.1) exist, the CSV `counting_limits` lines are the `messages.yaml` notes `hotspot_definition`, `monthly_validation_only` and `flag_scale`, and `citation` is one line marked as a placeholder.
- **Evidence:** `contract/CSV_SPEC.md` takes both from text that does not exist yet.
- **Revisit if:** 5.7 or 6.1 is written.

## Service CORS origins (14 Nov)

- **Status:** ASSUMED
- **Decision:** The service allows the exact origins listed in `CORS_ORIGINS` (comma-separated, not a secret). Unset means `http://localhost:5173` only. GET and POST, header `Content-Type`. Set by the lead on 14 Nov.
- **Evidence:** Story 1.3 AC3. Tests `test_1_3_ac3_*` in `burncal/service/test_service.py`; checked on the hosted trial.
- **Revisit if:** the web's public origin is known (add it to `CORS_ORIGINS` on the host).

## Hosted trial for the stub (14 Nov)

- **Status:** TESTED
- **Decision:** The Story 1.3 trial runs on Vercel Hobby (free) as a Python function. Hugging Face Docker Spaces were refused: they now need a paid plan. The lead chooses the final host.
- **Evidence:** Measurements in `docs/handoff.md` (Story 1.3, hosted trial).
- **Revisit if:** the real store needs a local disk. Vercel's writable disk is `/tmp` only, with about 158 MB free.

## C1's parameter file is read by the pipeline, not by core (14 Nov 2026)

- **Status:** TESTED
- **Decision:** `burncal.core.c1.load_params(raw)` takes the parsed contents of `c1_params.json`; `burncal/pipeline/c1_params.py` reads the file, checks it against `c1_params.sha256` and passes it in. `core` reads no file (CLAUDE.md layout rule).
- **Evidence:** All C1 tests pass, including the Sumatra 2015-09 case, and the full parity run gives the same misses as before (worst 2.1e-9, tolerance 1e-6). A test refuses a parameter file whose hash differs.
- **Revisit if:** the service needs the parameters without the pipeline; then it reads them the same way.

## Story 5.1: claims.yaml points at the scoring files instead of holding numbers (14 Nov 2026)

- **Status:** TESTED
- **Decision:** Each claim in `evidence/claims.yaml` has an `id`, its `text`, `used_for_pick`, and a list of figures. Each figure gives the number as written in the sentence (`display`), a `format`, and a `source` (scoring file and RFC 6901 pointer), plus the interval and noise pointers where the sentence quotes them. No value is typed in. The shape follows `contract/evidence.schema.json`, so Story 5.2's build can copy the value in and compare.
- **Evidence:** `evidence/test_claims.py` resolves every pointer, formats the value, and checks it equals `display` and appears in the sentence; it checks every number in a sentence has a figure, the banned wording, that reported-only figures sit only in claims marked `used_for_pick: false`, and the manifest hashes. 98 tests pass. The check found two errors in the story's sentences (entries below).
- **Revisit if:** Story 5.2 needs a field the figures lack, or wants the formatting moved into `core` (AD-8). The test's formatter is a check only and publishes nothing.

## Story 5.1: Punjab figure is 29.45, not 29.46 (14 Nov 2026)

- **Status:** TESTED
- **Decision:** The claim reads "29.45 against C1's 31.59". The story's text said 29.46.
- **Evidence:** The scoring file holds 29.45490938455426 (`/approaches/1A/1/regions/punjab/mae` in the reported-only JSON). The `.txt` report prints 29.455, and rounding that again gives 29.46. The planning record carries the same double-rounded figure.
- **Revisit if:** never; the source is frozen.

## Story 5.1: the southern Africa sentence is scoped to candidates and baselines (14 Nov 2026)

- **Status:** ASSUMED. The lead approved these words on 14 Nov 2026; untested beyond the scoring files.
- **Decision:** The story's sentence "Flags were right less than half the time in southern Africa for every method" is written as "On the final set, flags in southern Africa were right less than half the time for every candidate method and both baselines", with each value quoted.
- **Evidence:** On the final set at 1°, precision in southern Africa is C1 0.453, 4A 0.473, 1A 0.408, (b) 0.459 and (a) 0.164, but the region-month comparator (`cmp`) is 0.510. On the reported-only set (b) is 0.573 and C1 0.557, so the statement holds only on the final set. The unscoped sentence would be false for a judge who checks the files.
- **Revisit if:** the lead prefers other words, or wants the comparator named in the sentence.

## Story 5.1: smaller wording choices in claims.yaml (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The lead's name in the kept-C1 sentence is written as "the project lead" (no names in committed files). "Story 2.10's comparison" is written as "the comparison of NOAA-20 with Suomi NPP" (no story numbers in public sentences). "The tiers" is written as "the two flag tiers".
- **Evidence:** CLAUDE.md rules for the public repo; the sentences are shown to judges.
- **Revisit if:** the lead wants the original words.

## Story 6.6: the pitch storyline lives in `docs/pitch/` (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** the storyline is `docs/pitch/storyline.md`, with `docs/pitch/test_storyline.py` checking that every quoted claim matches `evidence/claims.yaml` word for word, that the failed flag-precision test and the southern Africa (savanna) sentence are quoted, that there is one line per judging criterion, and that no banned wording appears outside the quotes. The story names no path; this keeps it in the product repo beside the claims it quotes.
- **Evidence:** Story 6.6's acceptance criteria; the 4 checks pass. Not compared against keeping it in the submission text only.
- **Revisit if:** Story 6.5 wants the storyline inside the submission folder, or the lead wants it kept out of the public repo.

## Story 6.6: the demo is a 7-slide deck, not a 30-second video (14 Nov 2026)

- **Status:** ASSUMED. Chosen by the project lead on 14 Nov.
- **Decision:** the demo is the 7-slide deck. The storyline drops the video script. This narrows Story 6.6's first criterion ("works for both") and Story 6.5's 30-second recording to the deck only.
- **Evidence:** the fixed claim sentences run well past 30 seconds read aloud and cannot be shortened, so a video could only flash them on screen. The organisers accept either format. Not tested with a judge or a timed run of the deck.
- **Revisit if:** the organisers require a video, or the deck cannot hold the evidence legibly on seven slides.

## Story 6.6: Creativity is argued against existing tools, not other teams (14 Nov 2026)

- **Status:** ASSUMED. Direction set by the project lead on 14 Nov (answers PRD Q8 in direction); wording drafted by the lead session.
- **Decision:** the Creativity line compares the project with what exists today (FIRMS and Worldview hotspot maps, GWIS burned area, INPE's single reference satellite) and says what it does differently: one record in Aqua units across the instrument change, a method chosen by a rule fixed in advance with its failures published, and a one-sentence reading against each past year. It never ranks other teams' repos.
- **Evidence:** the statements about other tools come from the planning record's checks (FIRMS resource check 13 Nov, GWIS check D5, the incumbent entry naming INPE's rule). None is linked yet; Story 6.1 lists the sources.
- **Revisit if:** a checked source shows one of those tools does harmonize the sensors, or offers a climatology of hotspot counts.

## Story 6.6: haze is framing, never a measurement (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** the pitch uses Singapore haze only as the reason the question matters, sourced externally, and never says hotspots measure, cause, predict or attribute haze, never names bad haze years from the record, and never says the record sees all burning. The may and may-not lists are in the storyline.
- **Evidence:** the record holds no smoke, haze, air quality, wind or burned area (UI concept, section 1); the planning record lists cloud, smoke and smouldering peat bias for this region as an open, unquantified question.
- **Revisit if:** a checked source quantifies detection under smoke and peat for Sumatra, or the lead adds an air-quality dataset.

## Story 6.6: two more fixed claims, the comparator and the margin (14 Nov 2026)

- **Status:** TESTED (each figure resolves to the final scoring file and matches its sentence, `uv run pytest evidence`). Wording approved by the project lead on 14 Nov.
- **Decision:** `evidence/claims.yaml` gains `comparator-vs-b` (the region-month comparator, never eligible, passed the (b) test that C1 failed; C1 still has lower count error than it) and `margin-vs-4a` (C1's error against 4A fell short of the margin fixed beforehand, so the rule preferred 4A, which also failed against (b)). Slide 5 quotes both. The margin sentence does not quote the margin's size, because the scoring file holds only the check's result, not the value, and every number in a claim must point at a value.
- **Evidence:** `/comparisons/cmp vs b`, `/comparisons/C1 vs cmp`, `/comparisons/C1 vs 4A`, `/decisions/final/margin` and `/decisions/not used for the pick/beats_b/cmp` in `evidence/scoring/final_20261113T172020Z.json`. A judge opening the evidence page would see both results with no sentence to answer them.
- **Revisit if:** the lead wants the margin's size in the sentence; then add a figure source for it (for example the planning record's test plan, copied with Story 6.3) rather than typing the number.
