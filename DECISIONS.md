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

## Story 5.2: evidence.json is generated, committed and checked for freshness (14 Nov 2026)

- **Status:** TESTED (`uv run python evidence/build.py --check`; `test_5_2_ac1_written_file_is_current_valid_and_true`)
- **Decision:** `evidence/build.py` writes `web/src/evidence/evidence.json`, which is committed like `contract/fixture/`. The check fails if the committed file is not byte for byte what the build writes now, breaks `contract/evidence.schema.json`, names a source whose hash differs from the manifest, or holds a figure (value, interval end or beyond-noise mark) that differs from the field it names. The web build needs no Python. The file is 2.3 MB (167 KB gzipped), written compactly, so the evidence view should load it with a dynamic `import()` to keep it out of the calendar's bundle.
- **Evidence:** 13 claims, 117 tables, 11,653 figures; every one re-read from its pointer. Tamper tests (value, interval, beyond noise, display, pointer, a changed scoring file) each fail the check.
- **Revisit if:** the host's web build can run `uv`, or the file size hurts the evidence page's load time.

## Story 5.2: intervals and beyond-noise marks are read beside the value (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** the frozen schema gives a figure one source pointer, and none for its interval or beyond-noise mark. So a figure with an interval must point at a `.../diff` field, and the build and the check read `lo`, `hi` and `beyond_noise` from the same object. The build fails if a claim in `claims.yaml` names an interval or beyond-noise pointer anywhere else.
- **Evidence:** every comparison in the scoring files holds `diff`, `lo`, `hi` and `beyond_noise` together; every interval in `claims.yaml` already followed this.
- **Revisit if:** contract 0.2.0 is reopened; then give `interval` and `beyond_noise` their own pointers.

## Story 5.2: a NaN in a scoring file is a null cell (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** where a scoring file holds `NaN` (flag precision when no flag was raised, for example C1 in Amazon forest at whole-region scale on the final set), the table cell is `null`. JSON cannot hold NaN and the schema allows a null cell. The flag counts beside it (0 raised) say why. A claim figure that resolves to NaN fails the build.
- **Evidence:** `/approaches/C1/region/regions/amazon_forest/flags/precision` in `final_20261113T172020Z.json`; `test_5_2_ac1_head_to_head_tables_cover_story_5_4`.
- **Revisit if:** Story 5.4 needs to tell "undefined" apart from "not scored"; then show "no flags raised" from the counts, still without a number typed.

## Story 5.2: the selection set is the run the final run names (14 Nov 2026)

- **Status:** TESTED (`test_5_2_ac1_sources_are_the_three_sets`)
- **Decision:** the build reads three files: the final run, the selection run it names in `/meta/selection_result` (`selection_20261113T151303Z.json`, the run that scored C1), and the reported-only run that `claims.yaml` names. The earlier selection run (`selection_20261113T145716Z.json`, single methods only) is not read; it holds none of the combinations and Story 5.4 shows C1.
- **Evidence:** the final file's `/meta/selection_result`; the earlier file has no C1.
- **Revisit if:** Story 7.8 (all-candidates table) is built; it needs the earlier run.

## Story 5.2: what the tables hold (14 Nov 2026)

- **Status:** ASSUMED. Stories 5.3 to 5.6 are not built, so "every number the evidence view shows" is read from their acceptance criteria.
- **Decision:** for each of the three sets, the build writes: approach tables for (a), (b), the comparator ("comparator, never picked"), 4A, 1A and C1 at 0.25°, 1° and whole region, pooled and per region, with every metric the file gives (error, bias, flag counts, precision, recall, rank correlation, top months, year order, peak month, season length and their unit counts); the same against the Terra referee with (c) added (Story 5.5); paired differences with interval and beyond noise, positive meaning the first approach did better, as the scoring files' text reports say; every field of `decisions`; blocks per region and draws; and count error and bias per year with the file's period label. The fixed claims come from `claims.yaml` word for word. Displays: two decimals for count error and months, signed percent for bias and error differences, three decimals for shares, "yes"/"no" for test results.
- **Evidence:** Stories 5.4 to 5.6 acceptance criteria; `test_5_2_ac1_*`.
- **Revisit if:** Story 5.4 to 5.6 needs a number not in the file; add it to the build, never to the page.

## Story 5.2: no totals for 2014–2017 and 2018–2021 (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead.
- **Decision:** Story 5.4 asks for results for 2014–2017 and 2018–2021 separately. The scoring files give count error and bias for each year, labelled `early` or `late`, and no total per period. Adding years up would be recomputing a score, which `evidence/` may not do, so the by-year table lists each year with its period label and no period total.
- **Evidence:** `/approaches/*/by_year_1deg` in the final file (2014–2017 `early`, 2018–2021 `late`, southern Africa and Siberia only); the selection run covers 2015 and 2018 only. `test_5_2_ac1_years_are_shown_by_period_without_totals`.
- **Revisit if:** the lead accepts per-year rows as meeting Story 5.4, or a period total is wanted; then it has to come from the planning record's harness, not from this build.

## Story 5.2: the wording check (14 Nov 2026)

- **Status:** TESTED (`test_5_2_ac3_*`)
- **Decision:** `evidence/wording.py` scans `README.md` and the built site (`web/dist`) by default, and fails on "beat the baselines", "every baseline", "all baselines" and equivalent claims listed in the file: beat, outperform, surpass, exceed or dominate the/all/both/the three baselines; better, more accurate or lower error than any or all baselines; "beat every other method"; "best of all"; "won against all the baselines". Line breaks are ignored. A missing path is an error, so an unbuilt site cannot pass. The pytest run also scans `web/src` (which holds `evidence.json`), the pitch storyline and `web/dist` if it is built. "Fires" is not in this check: the built site bundles library code that uses the word for events; `test_claims.py` still bans it in the claims.
- **Evidence:** passes on README, `web/src`, the storyline and a fresh `npm run build`; each listed phrase in a planted page fails it; every fixed claim passes it.
- **Revisit if:** a reviewer finds another way to say it; add it to `BANNED` with a test.

## Story 5.2: evidence table row keys are JSON pointers (14 Nov 2026)

- **Status:** TESTED (gitleaks hook; `uv run python evidence/build.py --check`)
- **Decision:** rows of the run and by-year tables are keyed by JSON pointer (`/blocks/sumatra`, `/truth_flags_1deg`, `/sumatra/2015`), as the decisions table already was. The schema leaves the key's format open.
- **Evidence:** keys like `southern_africa.2015` in a `"key":` field matched gitleaks' `generic-api-key` rule 30 times and blocked the commit. The pointer form passes the unchanged hook, so no allowlist was added.
- **Revisit if:** the evidence view (Stories 5.3–5.6) needs another key format; keep it out of the `name.name` shape or the hook will flag it again.

## Story 5.3: which fixed claims open the evidence view (14 Nov 2026)

- **Status:** ASSUMED. The lead approves the wording.
- **Decision:** the first screen leads with `flag-precision-vs-b` (it names the outcome row, "nothing beat one global factor", and the recorded deviation), then `aqua-through-2021` under "What it means for the record", then `count-error-vs-b`, `trade-off-recall`, `margin-vs-4a` and `best-of-three` under "The scores behind it". Each is printed word for word from `evidence.json`. One typed sentence follows `aqua-through-2021`: the months after the sensor change are VIIRS counts converted by C1, the method kept as the deviation, not by one global factor. It describes the record, not how C1 scored. The remaining claims are left to Stories 5.4 to 5.6.
- **Evidence:** Story 5.3 AC1; test-plan section 11, row "Nothing beats (b), (a) is beaten"; `web/src/evidence/outcome.test.tsx`. Not shown to a reader yet.
- **Revisit if:** the lead wants the first screen to be two sentences only (the user story's wording), or wants `margin-vs-4a` out of the first screen.

## Story 5.3: the typed words on the evidence view hold no number (14 Nov 2026)

- **Status:** TESTED (`outcome.test.tsx`, "the typed words hold no number")
- **Decision:** the page's own words (headings, the plain-language method, the file list) live in `web/src/evidence/outcome.ts` and contain no digit apart from the method names C1, 4A and 1A. The switch dates come from `messages.yaml`'s `record_switch` note, which the method section quotes to meet AC2 ("changes only months from January 2022"). The method description is read from the 4A, 1A and C1 method notes in the planning record and states no fitted value.
- **Evidence:** AD-8 ("no number is typed into the web"); the test.
- **Revisit if:** the method wording needs a number; then it goes in `claims.yaml` or `messages.yaml` with its source, not in the web.

## Story 5.3: the planning-file links take the repository address from the build (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead.
- **Decision:** the links to `docs/planning/GUARDRAILS.md`, `docs/planning/test-plan.md` and `docs/planning/DECISIONS.md` are built from `VITE_REPO_URL` (not a secret) as `<url>/blob/master/<path>`. With it unset, the page names the three files without links and says so. No repository address is committed.
- **Evidence:** the repository address contains an account name, and no committed file holds it so far; the hosted site is not served from the repository, so relative links would not reach the files. `outcome.test.tsx` covers both modes. Checked in the browser with the variable set.
- **Revisit if:** the lead prefers the address committed in one place (a one-line change in `web/src/config.ts`), or the files move. The links 404 until Story 6.3 copies the three files in.

## Story 5.4: years shown under their period, no period totals (14 Nov 2026)

- **Status:** ASSUMED. Chosen by the lead (14 Nov) from three options; the finding it rests on is checked.
- **Decision:** Story 5.4 asks for results for 2014–2017 and 2018–2021 separately. The head-to-head section shows a "by year" table for the chosen set and region. It gives each year's count error, with the bias under it, for each approach, grouped under the period tag the scoring file gives that year (`early` first, then `late`). It states that the files give these at one scale (1°), with no interval and no period total. The other options were a new fixed claim for Story 5.6 saying period totals were never scored, or leaving periods out. Nothing was added to `evidence/build.py`: it already writes these rows (Story 5.2, "no totals for 2014–2017 and 2018–2021"). This AC is met only in part: there are no totals, intervals, flags, rankings or seasonal measures per period, because the scoring run never produced them.
- **Evidence:** no field in the three scoring JSON files or their text reports holds a period total. The only period data is `/approaches/*/by_year_1deg` (MAE and bias per region-year, tagged `early`/`late`). On the final set, the early years cover southern Africa and Siberia only. Selection holds 2015 (early) and 2018 (late). Test: `headToHead.test.tsx`, "AC2: years are shown under the file's early and late periods…".
- **Revisit if:** a period figure is wanted with an interval. It would have to come from the planning record's harness, which is frozen, and the final set may not be rescored. Or Story 5.6 should name the gap as a limit; that needs a new fixed claim.

## Story 5.4: what the head-to-head table shows and in what order (14 Nov 2026)

- **Status:** ASSUMED. Not yet seen by a reader.
- **Decision:** the section opens on the final set, all regions pooled, at 1°, which is the test plan's decision scale for error and flags. The reader switches set (final or selection), region (pooled plus the set's own regions) and scale (0.25°, 1°, whole region) with three rows of radio buttons. A region the new set lacks falls back to pooled. Rows run C1, 4A, 1A, (b), (a), then the comparator under a dashed rule with its label "comparator, never picked". Columns follow the story's order: count error and bias (median absolute bias when pooled, since the file holds no pooled MAE), flag precision with "right of … raised" under it, recall with the true-anomaly count, month-rank correlation, top-months overlap (with k), year pairs in the right order (with the pair count), peak month error, and season length difference. A measure the file holds at no row of a level is left out, not shown as a column of dashes. A missing value (no flag raised) is a dash, with a note. The reported-only set is not offered here; that is left to Story 5.6.
- **Evidence:** Story 5.4 AC1 and AC2; test plan §6 (decision scale); `headToHead.test.tsx` AC1 and AC2 tests. Checked in the built-in browser at 1280 × 800 and 375 × 812.
- **Revisit if:** the lead wants the reported-only set, a different default, or fewer columns on a phone.

## Story 5.4: paired differences are pooled only, one row per pair (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** the scoring files give paired differences only pooled over all regions, so the differences table does not change with region or scale, and says so. A pair's mirror (4A vs C1 beside C1 vs 4A) is dropped. The kept order is C1, 4A, 1A, comparator, (b), (a). C1's five pairs come first, the other ten under "The other pairs". Each cell shows the difference, a filled ◆ (beyond noise) or hollow ◇ (within noise) mark with screen-reader text, and the 95% interval. No colour is used. Under the table go the build's note (which says intervals may be somewhat narrow on close calls) and the blocks per region, the total and the draws, from the run table.
- **Evidence:** `/comparisons` holds no region or scale level; Story 5.4 AC3; UI concept rule "every state has a mark that is not colour"; `headToHead.test.tsx` AC3 tests.
- **Revisit if:** a reader wants the mirrored pairs. Or a display such as "-0.000" (the build's `fix3_signed` of a tiny negative) confuses; that would be fixed in `build.py`'s format, not in the web.

## Story 5.4: the final-set notes and the rule the pick used (14 Nov 2026)

- **Status:** ASSUMED. The lead approves the typed rule sentence.
- **Decision:** on the final set the section shows: the set's label from the scoring file ("final set (step 5, used once)"); the `best-of-three` claim; the comparator's label in the table; and a "rule the final pick used" block. That block holds one typed sentence of the rule (from test plan §8, with no number); each candidate's pass on the tests against (a) and (b), and what it was worse on; the margin test (combination, single, pass, winner); the `margin-vs-4a` claim; and the outcome string. All of these are read from `final.decisions` in `evidence.json`. The selection set shows its own label and the final run's note on it: "The selection set was scored more than once; say the evidence is weaker." The margin's size is not quoted, as in `claims.yaml`.
- **Evidence:** Story 5.4 AC4; `/decisions/final/*` in the final file; `headToHead.test.tsx` AC4 tests.
- **Revisit if:** the lead wants the rule worded differently, or the margin's size stated. That would need a source the build can point at.

## Story 5.4: scale and region names come from evidence.json (14 Nov 2026)

- **Status:** TESTED (`headToHead.test.tsx`: "the typed words hold no number", "every number shown is a figure from evidence.json")
- **Decision:** the choices "0.25°", "1°", "whole region" and the region names are read from the approach tables' titles in `evidence.json` (the part after the last comma, and between the first and last). So the web types no digit. Every figure on the section carries its scoring-file pointer as a tooltip, and the test checks that each one matches `evidence.json`. Styles live in `web/src/components/HeadToHead.css`, not `styles.css`. Wide tables scroll inside their own box on a phone, with the approach column fixed. Screen-reader-only text is positioned inside that box; otherwise it widened the page to 835 px at 375 px.
- **Evidence:** the tests; the browser check (document width 375 at 375 px).
- **Revisit if:** `build.py` changes its title format. The AC2 test would fail first.

## Story 3.3: typed-coordinate refusals show the invalid_aoi sentence and mark the field (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead: three sentences are missing from `messages.yaml`.
- **Decision:** typed coordinates are checked in the browser for unreadable, out of range (longitude −180 to 180, latitude −90 to 90), out of order (south < north), no width, not closed and too few vertices. `messages.yaml` 0.2.0 has one sentence for all of these (`problems.invalid_aoi`, which names the three checks), so every case shows it, and the form names the problem by marking the exact corner fields (`aria-invalid`, a heavier rule and a † mark) or listing the vertex lines at fault. The code keeps the specific case (`data-problem`), so specific sentences drop in through `web/src/area/words.ts` once they exist. Marked `TODO(label)` like the existing "service unreachable" gap.
- **Evidence:** Story 3.3 AC2; `web/src/area/area.test.tsx` (AC2 block); headless Chrome check at 1366 px and 375 px.
- **Revisit if:** the lead adds `out_of_range`, `out_of_order` and `not_closed` sentences in the planned contract 0.3.0 bump (the lead keeps this fallback until then and edits `contract/` personally). Then `typedProblemText` picks them by case and the test checks each.

## Story 3.3: basemap from world-atlas, loaded on demand (14 Nov 2026)

- **Status:** TESTED (browser check, dev server and production build)
- **Decision:** the land outlines are Natural Earth via `world-atlas` 2.0.2 (TopoJSON, ISC licence over public-domain data), turned into GeoJSON in the browser by `topojson-client` 3.1.0. The locator uses 1:110m (55 KB), the drawing map 1:50m (546 KB, 179 KB gzipped). MapLibre, terra-draw and the land data load with dynamic `import()` when a map mounts, so they stay out of the first bundle. No tiles, no key, no network call outside the site. Rings that cross 180° are unwrapped (`web/src/area/basemap.ts`) because MapLibre otherwise draws a line across the map. Added, pinned exactly: `world-atlas`, `topojson-client`, and dev `@types/topojson-client` 3.1.5, `@types/geojson` 7946.0.16.
- **Evidence:** screenshots of the locator and drawing map; the unwrap test in `area.test.tsx`. Alternatives: committing a generated GeoJSON (a second copy of the data to keep in step) or downloading Natural Earth files (needs a download step); both rejected as more moving parts.
- **Revisit if:** the 50m chunk is too slow on a phone (use 110m for both), or the lead wants country borders.

## Story 3.3: MapLibre's worker URL is set explicitly (14 Nov 2026)

- **Status:** TESTED (headless Chrome against `vite` and `vite preview` of the build)
- **Decision:** `MapView` imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and calls `setWorkerUrl` before creating a map. MapLibre 6 looks for its worker beside its own file, which Vite's dependency bundling moves, so without this no map loads in dev ("Worker failed to load").
- **Evidence:** console error before, maps drawing after, in dev and in the build (the worker is emitted as `assets/maplibre-gl-worker-*.mjs`).
- **Revisit if:** MapLibre or Vite is upgraded; check whether the default works again.

## Story 3.3: a typed box with west greater than east crosses 180° (14 Nov 2026)

- **Status:** TESTED (the lead's decision, 14 Nov; `area.test.tsx`)
- **Decision:** west > east is not an error: the box crosses the antimeridian. The web splits it there into a MultiPolygon (west to 180, then −180 to east) before sending, as the spine's Conventions say. A part with no width (west exactly 180, or east exactly −180) is dropped, leaving one Polygon. "Out of order" now means south ≥ north only. West equal to east (or west 180 and east −180) leaves a box with no width and is refused as `no_width`, showing the `invalid_aoi` sentence like the other typed cases. Whether a crossing box spans too much longitude is left to the service (`invalid_aoi`), so the web sends even a box wider than half the world. Drawn shapes still stay within −180 to 180 (the maps don't render world copies), and a self-intersecting typed polygon is left to the service. The locator frames a crossing box as the whole world, because the map does not render past 180.
- **Evidence:** the lead's message of 14 Nov; tests "reads west greater than east as a box across 180°…", "leaves the span to the service…", "drops a part with no width…", "refuses a box with no width", "sends a typed box across 180° as a MultiPolygon". This replaces the earlier ASSUMED entry "no area crosses 180° yet".
- **Revisit if:** contract 0.3.0 adds the out-of-order sentence (proposed: "The south edge must be less than the north edge.") or a sentence for a box with no width; or drawing across 180° is needed (then the maps need world copies and the drawn ring needs the same split).

## Story 3.3: a typed polygon must be closed by the user (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** the last typed vertex must repeat the first. An open ring is refused as "not closed", not closed silently. Fewer than three corners is refused too. A vertex is "longitude, latitude" (comma, space or semicolon between), one per line; blank lines are skipped. An empty field is unreadable, never zero.
- **Evidence:** Story 3.3 AC2 lists "not closed" as a message, so the user is expected to close the ring; GeoJSON requires closed rings. Tests in `area.test.tsx`.
- **Revisit if:** user testing shows people expect the ring to close itself.

## Story 3.3: the name and km² both come from the served answer (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead.
- **Decision:** the locator shows `calendar.aoi.name` and `calendar.aoi.area_km2` from the same response, and no size until that response arrives. A drawn or typed area is sent with `name: null` and labelled "Your area". While loading, or when the service refuses the area, the locator shows the requested name and outline but no size. In fixture mode every area returns the Sumatra fixture, so any drawn area is labelled "Sumatra, 1,071,229.5 km²" under the placeholder banner.
- **Evidence:** AD-8 (km² is a served field); the contract says `aoi.name` echoes the request, so with the real service the two agree. Showing the requested name beside the fixture's size would pair a name with another area's size.
- **Revisit if:** the fixture-mode labelling confuses a demo; then the fixture client could echo the request's name (still never the size).

## Story 3.3: a refused area draws no calendar (14 Nov 2026)

- **Status:** TESTED (`area.test.tsx`, AC3 block)
- **Decision:** a problem answer for the area (`no_land`, `outside_coverage`, or any other code) shows the code's `messages.yaml` sentence under the locator as an alert, and the calendar column, the notes and the size are left out. `version_superseded` reloads `/meta` and asks once more. A network failure keeps the existing interim "could not be loaded" words (TODO, already raised).
- **Evidence:** Story 3.3 AC3; "missing is not zero" rule.
- **Revisit if:** the lead wants the last good calendar kept on screen, greyed, after a refusal.

## Story 3.3: the control says "Change area" until dates exist (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** UI-CONCEPT.md names the control "change area or dates". Dates are Story 3.4 and not built, so the control reads "Change area"; Story 3.4 adds a dates tab and renames it. The picker has three tabs: featured areas (picking loads at once), draw (rectangle or polygon, then "Show this area") and type coordinates (box corners or polygon vertices). Short labels like these, the field hints and "Your area" are typed in the web as labels, as the shell already does ("Area", "Loading…"); every sentence comes from `messages.yaml`.
- **Evidence:** UI-CONCEPT.md section 3; Story 1.5's shell labels.
- **Revisit if:** the lead wants labels in `messages.yaml` too.

## Story 3.3: how the criteria are tested (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Vitest covers the logic (parsing, the request sent, problem and caution handling) and static renders of the locator, picker and page states, with no DOM library added. Clicking, drawing on the map and typing into the form were checked by a headless Chrome script (Playwright, from the existing dev dependency) at 1366 px and 375 px against both `vite` and the production build. The script is not committed.
- **Evidence:** `area.test.tsx` (32 tests); the browser run: rectangle and polygon drawn, typed refusals shown, picking Punjab, no horizontal scroll at 375 px.
- **Revisit if:** Story 3.10 adds Playwright end-to-end tests; the script's steps are written up in `docs/handoff.md` to port.

## Story 3.4: a refused date range uses the browser's own message until messages.yaml has one (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead: `contract/messages.yaml` 0.3.0 has no sentence for a refused date range, and no problem code covers one.
- **Decision:** the two date fields are `<input type="date">` with `required`, `min` and `max` set from the served bounds (first day of `record_start` to `data_through`), and each field's limit tied to the other (From's max is To, To's min is From). The browser then refuses an empty, unreadable, too early, too late or reversed range before submit and says why in its own words ("Value must be 15/03/2010 or earlier."). `web/src/area/dates.ts` `checkRange` checks the same four cases (`unreadable`, `before_record`, `after_data_through`, `out_of_order`) on submit, marks the fields at fault (`aria-invalid`, heavier rule, † mark) and keeps the case in `data-problem`, so a sentence can drop in by case. Marked `TODO(label)`. The web types no sentence of its own.
- **Evidence:** `web/src/area/dates.test.tsx` (refused-ranges block); built-in browser check at 1280 px: From 10 June 2012, To 15 March 2010 is not submitted and both fields carry the browser's message.
- **Revisit if:** the lead adds sentences in a contract bump. Suggested `client` keys and words: `date_unreadable` "Enter each date as a day, month and year.", `date_before_record` "The record starts in July 2002. Choose a later first date.", `date_after_data_through` "The record runs only to the data-through date. Choose an earlier last date.", `dates_out_of_order` "The first date must be on or before the last date." Also: the service does not refuse a reversed or out-of-record range itself (`burncal/service/app.py` checks only that each is a real date); that is the data owner's to decide.

## Story 3.4: the range is days, sent as typed; null means the whole record (14 Nov 2026)

- **Status:** TESTED
- **Decision:** the range is a first and last day, sent unchanged as `start` and `end` (never snapped to months: AC2 needs a range that starts or ends inside a month, and the service labels such months `range_cut` and serves their whole count). `CalendarPage` keeps `range: DateRange | null`; null is the whole record, built from the served `/meta` as the first day of `record_start` to `data_through`, so after a `version_superseded` reload it follows the new `data_through`. "Whole record" sends null. The area and the range are kept apart: changing one keeps the other. Every request that takes a range builds its body with `rangeRequest` in `web/src/api/client.ts`; the client gains `postAnalyticsCsv` and `postHotspotsCsv` for Story 4.4 to call. `/cells` takes one month and no range (`CellsRequest`, closed schema), so nothing is added to it.
- **Evidence:** `dates.test.tsx` (AC1, "every request", AC2 blocks); `test_3_4_ac3_...` in `burncal/service/test_store_service.py`.
- **Revisit if:** the lead wants month-only pickers, or the range should reset when the area changes.

## Story 3.4: fixture mode serves no CSV (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** in fixture mode (`VITE_SERVICE_BASE_URL` unset) `postAnalyticsCsv` and `postHotspotsCsv` reject with an error, because `contract/fixture/` holds no CSV. No download control exists yet.
- **Evidence:** `contract/fixture/` contents.
- **Revisit if:** Story 4.4 needs downloads to work on the fixture (then a fixture CSV is a contract change, or the controls are hidden in fixture mode).

## Story 3.4: the reference period is shown as a labelled served value (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead: no sentence says that rankings follow the dates while medians and anomalies keep the reference period.
- **Decision:** AC3 asks that the median and anomalies "still use the stated reference period". The service already does this (rankings are over complete months and years inside the range; `median`, `reference_mean`, `ratio_to_median`, anomalies and `calendar_month_medians` are over `reference_period` whatever the range). The dates tab states the served `reference_period` as a label and value ("Reference period 2003 to 2025") beside the record's bounds; the locator shows the served `range` under the area's name, and the grid's heading names the served range's first and last months. No explaining sentence is typed.
- **Evidence:** `test_3_4_ac3_rankings_follow_the_range_median_and_anomalies_keep_the_reference_period` (service); `dates.test.tsx` AC3 block (rank marks are the served ones; the period is the served one).
- **Revisit if:** the lead adds a note, for example `notes.range_and_reference` "Rankings cover the dates you chose. Medians and anomalies always use the reference period.", or Story 3.7's line defining "usual" covers it.

## Story 3.4: how the criteria are tested (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** as in Story 3.3: Vitest on the logic and static renders, a service test for AC3, and a built-in browser check. The "cut" mark on the grid is Story 3.5's; this story's evidence for AC2 is the request sent as typed, the served whole-month count, and the `range_cut` sentence in each cut month's cell title (the grid model as it stands on master).
- **Evidence:** `dates.test.tsx` (19 tests); browser check in `docs/handoff.md`, Story 3.4.
- **Revisit if:** Story 3.5 changes how partial reasons reach the cell title, or Story 3.10 adds end-to-end tests.

## Contract 0.3.0: six sentences the web needed (14 Nov 2026)

- **Status:** TESTED (agreed by both owners, 14 Nov; checks below).
- **Decision:** `messages.yaml` gains `notes.year_incomplete` and a new `client` section for states the web finds itself, which the service never sends: `coordinates_out_of_range`, `latitude_out_of_order`, `polygon_not_closed`, `service_unreachable` and `evidence_unavailable`. The version moves to 0.3.0 in `messages.yaml`, `openapi.yaml`, the README and the generated fixtures. No endpoint, field or number changes. The web now uses these sentences in place of the four `TODO(label)` stand-ins, and the legend shows the hollow year-total bar. Typed cases without their own sentence (unreadable, no width, too few vertices) still show `invalid_aoi`. All six go in one bump, not one bump per gap.
- **Evidence:** `uv run pytest` (the contract test now also checks the `client` section), and `npm test`, `npm run build` and the wording check all pass.
- **Revisit if:** the data owner objects to a `client` section in a contract file, or a sentence for a box with no width is wanted.

## Static mask: the scored rule (14 Nov)

- **Status:** TESTED (lead's decision, 14 Nov)
- **Decision:** A 30 arc-second cell is static if it has hotspots on 50 or more distinct UTC days in one tuning year (2014, 2016, 2017, 2020), counting MODIS (Aqua, Terra) and Suomi NPP rows on land. This is the rule the scoring harness used, so the published record is cleaned the way C1 was scored, and the world run needs only those four years of three satellites to build the mask. The product has no region boundary at this step, so it uses every row in the build extent. Static rows are marked, never deleted. Offshore takes precedence over static.
- **Evidence:** Sumatra tuning-year Aqua counts equal the harness's exactly: 41,377 detections, 3,600 cell-months, 0 differences (`uv run python -m burncal.pipeline.compare_tuning`, `docs/cleaning-differences.md`). The earlier rule (2014–2021, all satellites) gave 0.04% fewer.
- **Revisit if:** hotspots after 2020 cluster on fixed sources such as new gas flares.

## NOAA-20 standard data missing for 7 windows of 2024 (14 Nov)

- **Status:** ASSUMED (lead accepted the gap, 14 Nov)
- **Decision:** Keep the gap for now. NOAA-20 does not feed the record in 2024 (Suomi NPP does through 2 Nov 2026), so no published count changes. Three follow-ups: (1) the served `inputs[].days` must show the true day count for NOAA-20 in the affected months, not the calendar length (Story 2.6); (2) retry the download once before Story 2.10; (3) Story 2.10 drops the missing days from both satellites before comparing NOAA-20 with Suomi NPP.
- **Evidence:** FIRMS returned errors for 7 five-day windows of `VIIRS_NOAA20_SP` 2024 on every retry; NRT does not cover 2024.
- **Revisit if:** the retry fills the gap, or NOAA-20 is ever needed to feed 2024.

## Land layer read as GeoJSON (14 Nov)

- **Status:** TESTED
- **Decision:** The land mask is Natural Earth 1:10m land v5.1.1, read from the GeoJSON in that release (no shapefile reader is pinned). Points are tested with `shapely.contains_xy`, as the harness did.
- **Evidence:** The harness-rule comparison matches exactly, so the GeoJSON copy and the shapefile give the same land test for Sumatra.
- **Revisit if:** another region's comparison differs at the coast.

## Story 2.4: how the convert step applies C1 per row (14 Nov)

- **Status:** ASSUMED. The lead reviewed all five points on 14 Nov: 1, 2 and 4 confirmed; 3 confirmed with tile-aligned extents added; 5 changed to the rule below.
- **Decision:**
  - A row uses a tuning region's rules when it lies strictly inside that region's polygon in `contract/regions.geojson` (`shapely.contains_xy`, the harness's test; a point exactly on the edge is outside). Every other row uses the pooled rules.
  - Each row takes the 4A ratio of its own area. A 1A footprint's term uses the rules of its anchor row's area, and the blend weight of the anchor's month and area. Footprints are built over all feeding rows of one satellite in the build extent.
  - Fire season: tuning regions use C1's stored months. Southern Africa, Siberia and Punjab use their own 2003–2011 cleaned Aqua history. Everywhere else uses the history of a fixed 5° tile (AD-4's untested extension). The history counts Aqua rows with `excluded_reason` `none`. **Every build extent is whole 5° tiles** (lead's call), so no tile's history is cut; the convert step refuses any other extent. The extent is declared in `coverage.json`.
  - The 1A anchor tie rule (equal FRP goes to the earlier row) runs on rows sorted by satellite, time, latitude and longitude. The harness's own row order is not available for new data.
  - **The `evidence_class` of a 1° cell is the class covering most of the cell's area** (lead's call). The part outside every region counts as `not_evaluated`; areas are planar. An exact tie goes to the weaker class (lead's call, 14 Nov, correcting his first counts), so Punjab's 8 cells that are exactly half inside are `not_evaluated`. Over the six regions: 225 tuned, 570 tested_unseen, 6 reported_only, 38 not_evaluated.
- **Evidence:** `uv run pytest burncal/core/test_c1.py burncal/core/test_regions.py burncal/pipeline/test_convert.py`. With every row in one tuning region, the per-row weights equal Story 2.2's weights, and parity still passes with the case set. `test_2_4_ac3_six_regions_give_the_leads_counts` reproduces the lead's corrected counts.
- **Revisit if:** the lead wants a cell's class taken from its centre.

## Story 2.5: grids, thresholds and flags (14 Nov)

- **Status:** ASSUMED (lead to confirm); threshold parity TESTED for Sumatra with one open miss
- **Decision:**
  - Cell-month grids at 1° and 0.25° hold the harmonized count (sum of weights of feeding rows with `excluded_reason` `none`) and a raw row count per satellite (rows with `excluded_reason` `none`, feeding or not). Excluded rows are in no count. Only cell-months with rows are stored; a missing cell-month inside the store's extent and dates is 0.
  - Thresholds and flags use whole 1° cells (AD-9), so a cell cut by a region boundary uses all its hotspots. The harness scored region-clipped cells; the parity check therefore feeds the same function with region-clipped counts.
  - `flags_1deg` is dense: every 1° cell of the extent, every month from January 2002 to December of the data-through year. `count` is null and `flag_state` `outside_record` outside the record. `provisional` is true for partial months (`record_start`, `data_through`); `missing_days` waits for coverage in Story 2.6.
  - The strong tier compares the rounded count with the rounded 1.5 × threshold.
- **Evidence:** `uv run pytest burncal/core/test_grids.py burncal/pipeline/test_aggregate.py`. Sumatra thresholds match the parity targets in 899 of 900 cell-months within 1e-6. The miss: September at 105°E 6°S, 21.0 against 20.6, because FIRMS gives 41 Aqua rows for September 2006 in that cell where the harness history has 39. Sumatra's September 2003–2011 total is 36,686 against the stored 36,684; every other month of the stored history matches exactly. The two rows are not near the coast or the region edge. Australian grassland and Amazon forest are not checked yet: they need their 2003–2011 Aqua data downloaded.
- **Revisit if:** the lead's harness inputs show which two rows differ, or the Australian and Amazon checks miss.

## Story 2.6: publishing and serving the record (14 Nov)

- **Status:** ASSUMED (lead to confirm); fast path TESTED
- **Decision:**
  - A version lives in `store/published/versions/<record_version>/`: manifest, coverage tables, grids, the full record rows (for Story 2.7) and a lean `points.parquet` of the rows in any count. It is written under a temporary name and renamed, then `CURRENT.json` names it and the previous version. The service answers both and returns `version_superseded` (with `current_record_version`) for anything older. It re-reads the pointer when the file changes.
  - `record_version` is the data-through date plus 8 hex digits of a hash over the raw files' hashes (including `coverage.json`), the parameter file's hash and the git revision. No clock is read.
  - Coverage comes from `coverage.json` beside the raw files: the extent and, per FIRMS source, the date ranges downloaded and available. `inputs[].days` counts covered days per satellite and quality, standard beating NRT per day. A month gets `missing_days` when a day of the record has no covered feeding satellite. The NOAA-20 2024 gap shows as zero NOAA-20 days, so `raw.noaa20` is null there.
  - Fast path: whole 0.25° cells inside the area come from the grid; cells the edge cuts come from point rows. A point on the area's edge is inside.
  - An area must lie wholly inside the store's extent; otherwise `outside_coverage` (404).
  - `region_caveat` comes from the area's shape against the region boundaries (lead's call, 14 Nov): `southern_africa` when the area overlaps that region, `untuned_region` when any part lies outside the three tuning regions, else `none`. It no longer depends on cell classes.
  - Scale cautions compare the area (on a sphere) with a 1° and a 0.25° box at the area's latitude, so a long thin strip is not cautioned.
  - A range ending on `data_through` does not cut the current month (`range_cut` only when the range ends before the data does).
  - Until Stories 3.1 and 3.2, the statistics fields are null or empty, `rank` is null and `current_month` is null. `cells_flagged_*` and `cells_total` are already served. The CSV endpoints still answer from the fixture until Stories 2.7, 4.1 and 4.2.
- **Evidence:** `uv run pytest burncal/pipeline/test_publish.py burncal/service/test_store_service.py`. Fast path against brute force on Sumatra, an Amazon polygon and the Punjab box: equal for every month (synthetic store), and on the real Sumatra version (largest difference 9.6e-10).
- **Revisit if:** an area partly outside the extent should get a partial answer instead of 404, or the lead wants statistics before the web switches off the fixture.

## Story 3.1: statistics follow the fixture's methods (14 Nov)

- **Status:** ASSUMED (the methods were set when both owners froze the contract fixture; lead to confirm for real data)
- **Decision:** `burncal/core/stats.py` is the one implementation, taking unrounded counts:
  - Median and mean per calendar month over the complete months of the reference period (2003 to the last complete year before the current month). This includes converted years from 2022.
  - Colour breaks per area: 0, 1, then the floored 30th, 55th, 75th, 90th and 97th percentiles (nearest rank) of the positive months shown. Anomaly breaks are fixed at −100, −50, −20, 20, 50, 100 percent.
  - Ranks are competition ranks, with ties judged on the value as shown (1 decimal). Top months and years keep every tie at rank 5. Busiest calendar months are ranked by mean over the ranked months.
  - Only complete months inside the range are ranked; a `range_cut` month stays complete. A year is ranked only when all 12 months are complete and the range holds January and December. `record_high` looks at every complete month of the record.
  - A month's colour class uses its shown count; its anomaly class uses its shown percentage. Incomplete months still show their median and anomaly against the whole-month reference; the like-for-like comparison for the current month is the card (Story 3.2).
- **Evidence:** `uv run pytest burncal/core/test_stats.py burncal/service/test_store_service.py`. Sumatra: record high September 2015 (12,120.0), top years 2006 and 2015.
- **Revisit if:** the lead wants the reference period to stop at 2021 (Aqua only), or quantile breaks that ignore one very large month.

## Story 3.2: the current-month card (14 Nov)

- **Status:** ASSUMED (lead to confirm)
- **Decision:** The card compares days 1 to *d* of the current month with the same days of each reference year whose month is complete (AD-15). It counts point rows inside the area, with the same edge-cell shortcut as the monthly fast path. `quality` is NRT when any feeding input of the month is NRT. The card's flag counts are the current month's whole-cell flags, which are provisional. The card is always served; the date range does not hide it.
- **Evidence:** `uv run pytest burncal/core/test_stats.py burncal/service/test_store_service.py` (the shortcut equals the brute-force same-days sum on three areas). Sumatra, 13 Nov 2026: 231.4 to date against a same-days median of 77.0.
- **Revisit if:** the lead wants the card hidden when the range ends before the current month.

## Stories 2.7 and 4.2: the hotspot export (14 Nov)

- **Status:** ASSUMED (lead to confirm the size limit)
- **Decision:** `/hotspots.csv` reads the version's record rows by satellite-year file. Rows are inside the area (edge counts as inside) and inside the exact UTC dates, sorted by time. The default gives rows of feeding satellites with `feeds_record` true; `all_satellites` gives every row, excluded ones included with weight 0. Above 250,000 rows, without `year`, the answer is `413 too_large_for_sync` with the exact row count, an estimate at 110 bytes per row, and the years that hold rows. `weight` is written unrounded, `type` is empty for NRT rows, and the time is ISO 8601 with `Z`.
- **Evidence:** `uv run pytest burncal/service/test_store_service.py`. Sumatra September 2015: 12,147 rows, of which 12,120 feed and are kept, equal to the calendar's 12,120.0. The whole record with all satellites gives 2,409,453 rows and 413 in 0.25 s; 2019 alone is 24.5 MB in 1.0 s.
- **Revisit if:** the host limits response size or time below these figures.

## Lead's merge of PRs 3 to 11: two fixes at merge, the rest listed (14 Nov 2026)

- **Status:** TESTED (the two fixes); ASSUMED (what was left for later)
- **Decision:** PRs 3 to 11 are merged in order with merge commits, keeping the teammate's commits. Two fixes go in at merge: the store-backed `/meta` states contract 0.3.0 (it said 0.2.0 after the contract bump), and a `/hotspots.csv` search with no record file in its range (before July 2002, after `data_through`, or a `year` outside the dates) answers with the header and column line and no rows, as a search with no hotspots does. Everything else the nine reviews found is listed in `docs/handoff.md` under Next, for the data owner or a later contract bump, because none of it changes a number in the published Sumatra version.
- **Evidence:** `test_2_6_store_meta_states_the_contract_version` (reads `info.version` from `contract/openapi.yaml`) and `test_2_7_a_search_with_no_record_file_gives_a_header_and_no_rows` (three cases) fail before the fixes and pass after. Full checks on the merged tree are in `docs/handoff.md`.
- **Revisit if:** a range outside the record should be told apart from "no hotspots" in the CSV (it is not today; `/calendar` already shows those months as null), or any listed item turns out to change a published number, which would make it a blocker for the next publish.

## The service is hosted on Vercel (14 Nov 2026)

- **Status:** ASSUMED (lead's choice, 14 Nov; the real service is not yet measured there)
- **Decision:** The service runs on Vercel Hobby as a Python function, where the Story 1.3 stub already runs. It holds no secret; the store it reads is public data. How the store version reaches the function is still open: inside the deployment (Vercel's large-function limit, up to 5 GB, is in public beta) or copied from public object storage into `/tmp` when an instance starts (about 158 MB free, enough for Sumatra alone).
- **Candidates compared (14 Nov, limits checked on the web that day):**
  - Vercel Hobby (chosen): free, already deployed and measured (stub cold start 4.9 s from Singapore, warm 0.28–0.59 s). Limits: 2 GB memory, `/tmp` only, 300 s per request, 500 MB bundle (5 GB in beta).
  - Hugging Face Docker Space on cpu-basic with PRO: 16 GB memory for $9 a month, but paid, the region is not chosen, it sleeps after 48 h idle, and its free tier changed in July 2026.
  - Fly.io in Singapore: lowest latency and always on, but about $6 per GB of memory a month and no free tier for new accounts.
  - Google Cloud Run: free tier, but it needs a billing account, its free tier is US regions only, and every cold start reloads the store unless an instance is kept running, which costs more than Fly.
  - Render and Koyeb free tiers: 512 MB of memory and spin-down. Oracle Always Free: 2 OCPU and 12 GB since June 2026, but sign-up and capacity risk and a self-managed server.
  - Simplest fallback: static answers for the six featured areas on the web host. It does not answer a drawn area.
- **Evidence:** the stub trial (`docs/handoff.md`, Story 1.3) and the teammate's object-storage timing (cold Sumatra calendar 4.07 s on Vercel through DuckDB range reads). The real service loads the current and the previous version wholly into memory at start-up (`burncal/service/store.py`); its memory use is not measured yet.
- **Revisit if:** the service's memory with Sumatra's current and previous versions loaded comes near 2 GB, or six regions will not fit in 2 GB; the store version cannot reach the function (bundle over the limit, or `/tmp` too small); or the hosted p95 of 20 Sumatra calendars misses the 3 s target (Story 2.6 AC6). The options then are serving only the current version, splitting regions across deployments, lazy reads by tile, or a container host from the list above.

## Story 3.5: React draws the grid's SVG, not D3 (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The grid is still one SVG drawn from the served `/calendar` answer, but React renders it from a pure layout (`web/src/grid/layout.ts`) instead of D3 drawing into a ref. The look is unchanged from Story 1.5. D3 stays a dependency for the ruler (Story 3.7).
- **Evidence:** Story 3.5 needs focus, arrow keys, hover and tap on every cell, and tests for each criterion. With React the cells take event handlers and a roving tab stop directly, and the whole grid renders with `renderToStaticMarkup`, so every criterion is tested without adding a DOM library (`grid.test.tsx`, 23 tests). UI-CONCEPT.md section 7 names D3 as the drawing tool.
- **Revisit if:** the lead wants D3 kept as the drawing layer; the grid then needs a DOM test library.

## Story 3.5: marks that are not colour (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Besides Story 1.5's marks (hatching for outside the record, dots for not loaded, a dashed outline for the month to date, a triangle and a circle for strong and marginal flags), a month carries letter marks after its count, as printed statistical tables flag figures: `n` near real time (any input that feeds the record has quality NRT), `*` incomplete (partial reason `record_start` or `missing_days`), `c` cut by the date range (`range_cut`). Below about 700 px, where cells show tint only, the letters sit in the cell's top-right corner. The table view shows the same letters. The legend gives each mark the contract's sentence. A month to date is not also given `*`; its dashed outline says it.
- **Evidence:** UI-CONCEPT.md section 6 ("outline, hatching, symbol or text"); `grid.test.tsx` AC3 block; checked at 1280 px and 375 px in the built-in browser.
- **Revisit if:** the lead or a user test finds the letters unclear, or real data puts a letter on most recent months.

## Story 3.5: what the cell card says (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Hovering, focusing or tapping a month shows a card and gives the cell the same text as its accessible name: the month, the exact served count with the unit label, the `source` sentence, each input that feeds the record with its served day count ("From Suomi NPP (VIIRS), 30 days"), the quality sentence for each quality among them, every partial-reason sentence, and the flag sentence. Year totals and medians are focusable too and say their served value, rank and incomplete-year note. Arrow keys, Home and End move between months, totals and medians; Escape or leaving the grid closes the card. The validation labels for NOAA-20 and the after-pick years are left to Story 3.6. Short labels ("Grid", "Table", "From", "days", "year total", "median", "Rank n of the complete years shown") are typed in the web, as Story 3.3 did; every sentence comes from `messages.yaml`.
- **Evidence:** Story 3.5 AC4; `grid.test.tsx` AC4 block; keyboard and tap checked in the built-in browser.
- **Revisit if:** Story 3.6 needs the card laid out differently, or the lead wants these labels in `messages.yaml`.

## Story 3.5: a median of 0 shows as 0 (14 Nov 2026)

- **Status:** TESTED (`grid.test.tsx`, AC5 block)
- **Decision:** Story 1.5 showed "–" for a calendar-month median of 0 with `no_typical_activity`. It now shows "0" with the "No typical activity" sentence in its card; only a `null` median shows "–".
- **Evidence:** CLAUDE.md "missing is not zero".
- **Revisit if:** never, unless the contract changes what `null` means.

## Story 3.5: the grid at phone width (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Below 700 px the year-total column shows the served total as a number (no bar), an incomplete year's total sits in a hollow box (the legend's incomplete-year mark), rank circles sit before the number, and the medians are written vertically under their columns. The table view scrolls sideways inside its own box. The page's one-column layout in `web/src/styles.css` is now `minmax(0, 1fr)` instead of `1fr`, so wide content cannot widen the page.
- **Evidence:** at 375 px, page width 375 in grid and table views (built-in browser, dev and production build).
- **Revisit if:** the vertical medians read badly on a real phone.

## Story 3.5: the sensor-change rule falls between two rows (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Rows are years, so the rule is drawn between the row of the year of `meta.record_switch.viirs_from` and the row below it. This is right because the switch is at a year boundary (January 2022).
- **Evidence:** `grid.test.tsx` AC2 block.
- **Revisit if:** the switch ever moves off a January; the rule would then have to step inside a row.

## Story 3.7: the card's sentences wait for contract 0.4.0 (14 Nov 2026)

- **Status:** ASSUMED. Flag to the lead and the data owner: wording for 0.4.0 below.
- **Decision:** `messages.yaml` 0.3.0 has no sentence for the card's headline, its "usual" line, the flagged-cells caution, the ruler caption, the highest-month sentence or the NOAA-20 comparison, so the web types none. Until the contract has them, the card shows the same served values as labelled figures (a ledger list: "Same-days median 456.4"), with short labels typed in the web as Stories 3.3 and 3.5 did. The headline is the served count ("261.3 hotspots"). `web/src/card/words.ts` already reads an optional `sentences:` section; once 0.4.0 adds these keys, the card writes sentences with no web change. A template with an unknown placeholder or a null value is not filled, and the figures show instead. Suggested section:
  ```yaml
  sentences:
    current_month: "So far this month: {count} hotspots, {ratio}× the {reference_start}–{reference_end} median for the same days of {month_name}."
    current_month_count: "So far this month: {count} hotspots."
    current_month_usual: "Usual = the {reference_start}–{reference_end} median for days 1 to {day} of {month_name}: {median} hotspots. This month differs by {difference}. Data through {data_through}."
    cells_flagged: "{strong} of {total} one-degree cells are flagged strong and {marginal} marginal, a caution and not an alarm."
    ruler_caption: "Days 1 to {day} of {month_name} in each year from {reference_start} to {reference_end}."
    record_high: "The highest month on record here is {month}, with {count} hotspots."
    noaa20_compared: "From {period_start} to {period_end}, converted NOAA-20 counts differed from converted Suomi NPP counts by {bias_pct}% overall, with a mean absolute difference of {mean_abs_difference} per one-degree cell-month."
  ```
  `current_month_count` is the median-of-0 case: it is followed by `notes.no_typical_activity` and no ratio.
- **Evidence:** `card.test.tsx` AC3 block: with these templates the card writes the criterion's example sentence exactly from served values; with contract 0.3.0 `contractSentences()` is empty and no sentence is typed; every number on the card is a served value.
- **Revisit if:** the lead changes the wording (the keys and placeholders are what the web relies on), or the data owner objects to a `sentences:` section.

## Story 3.7: the ruler's axis (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The ruler is an SVG drawn by React at the column's measured width, with a symmetric-log axis from the smallest to the largest of the served marks (each reference year's same-days count, the median, this year's count). The axis has no tick values; the only labels are served values: this year's mark ("2026: 261.3"), the median tick ("median 456.4"), and each year's count on hover. A table view under it holds every year's served count. This year's mark slides along the axis on load (the concept's one transition), off under reduced motion.
- **Evidence:** UI-CONCEPT.md section 3, item 4, and section 6. A symlog axis from 0 crowded Sumatra's 23 years into the right third at 343 px; from the smallest mark they spread across the axis (checked in the built-in browser at 1280 and 375 px). The extent is found with `d3.extent`: a drawing range, never shown, so AD-8 holds for what the reader sees. A plain log axis has no place for 0; symlog does. `card.test.tsx` AC2 block: marks in the served order of their counts, inside the drawing at both widths; a 0 count at the left end.
- **Revisit if:** the lead reads the extent as a computed number under AD-8 (the service could serve a position or share per mark, as it does `share_of_max`), or readers misread a log axis without ticks.

## Story 3.7: what the card shows beyond the sentence (14 Nov 2026)

- **Status:** ASSUMED
- **Decision:** Under the headline: the figures (ratio, same-days median, difference, same days "1–d Month", reference period, data-through date, flagged 1° cells "n strong · n marginal · of N", and the satellites that fed the month with their served day counts), then the contract's sentences: the quality label (NRT or SP), `validated_satellite_false` when the satellite is not validated, `monthly_validation_only`, and `provisional` (the current month is never complete). When `validated_satellite` is false, `meta.noaa20_check` null gives `noaa20_check_not_run`; once served, `noaa20_check` ("Reported only. …") and the pooled figures (period, bias, mean absolute difference, cell-months). With a median of 0 the card shows the count, the median 0 and `no_typical_activity`, and no ratio, not even a dash. A null `current_month` shows the month and "Not loaded yet."; a null count or median (should one ever be served) shows "–", never 0. The second sentence is the served `statistics.record_high`, which the contract defines over the whole record whatever the range. The card sits in the left column under the locator, before the footnotes.
- **Evidence:** `card.test.tsx` (24 tests, one block per criterion); built-in browser at 1280 and 375 px.
- **Revisit if:** Story 2.10 serves per-region figures the lead wants on the card (only the pooled ones are shown), or the lead wants the figure list shorter once the sentences exist.

## Story 3.6: what a cell says about its inputs (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** A cell's card and accessible name list every input that feeds the month (`feeds_record` true), one entry each, with its served days and its own quality: "From Suomi NPP (VIIRS), 2 days, near real time; NOAA-20 (VIIRS), 11 days, near real time". A satellite served at both qualities in one month gets two entries. The quality words are the first sentence of `labels.quality` with a lower-case first letter ("standard quality", "near real time"); the full NRT sentence follows once, because it says why the count can change. Inputs that do not feed the record (Terra, NOAA-21, Aqua after 2021) are not listed: they are held, not inputs to the number shown. Partial months list every served partial reason, as before.
- **Evidence:** `web/src/grid/provenance.test.tsx` AC1 block (every feeding input of every fixture month in the accessible name; a mixed SP and NRT month; the focused cell's card). Checked by keyboard and hover in the built-in browser.
- **Revisit if:** the lead reads "every input satellite" as including the satellites that do not feed the month; they would then need a contract sentence such as "held, not counted".

## Story 3.6: the complete-month sentence (15 Nov 2026)

- **Status:** ASSUMED. Wording approved by the lead on 15 Nov ("Approve all"); added to the contract 0.4.0 draft on `lead/contract-0.4.0`, not on master.
- **Decision:** `messages.yaml` 0.3.0 on master has no sentence for a complete month, so the web types none (`TODO(label)` in `web/src/grid/model.ts`, `completeNote()`). A partial month already says why it is partial. The web reads an optional `notes.month_complete` and shows it on every counted month whose served `complete` is true, so contract 0.4.0 switches it on with no web change. Approved wording: `month_complete: "Complete month: every day of input data is in."`
- **Evidence:** `provenance.test.tsx` AC1 block ("contract 0.3.0 has no sentence for a complete month, so none is typed"; with the key set, exactly the complete counted months carry it).
- **Revisit if:** contract 0.4.0 merges without the key, or under another name (then `completeNote()` and the `TODO(label)` change with it).

## Story 3.6: provenance labels follow served fields (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** "Satellite not part of the validation" (`notes.validated_satellite_false`) is on every counted month whose served `validated_satellite` is false, not only the first NOAA-20 month. "Outside the years used for the pick" (`notes.after_pick_years`) is on every month whose served `source` is `viirs_converted`, which by AD-1 is every counted month from January 2022; a null month gets neither. The 3 November 2026 change is the month of `meta.satellite_switch.noaa20_from` (string slicing), which also gets `notes.satellite_switch` in its card.
- **Evidence:** `provenance.test.tsx` AC2 and AC3 blocks, including a later NOAA-20 month and a moved switch date.
- **Revisit if:** the pick years ever differ from "converted months" (for example if 2012–2013 Aqua months should carry a reported-only note too).

## Story 3.6: how the satellite change is marked, and what is not drawn (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The switch month gets one short ink rule on its left edge, one cell high: the same rule as the sensor change, scaled down, because the switch falls inside a month (3 November). The table view gives that cell a left rule; the legend explains it with `notes.satellite_switch`. The validation and pick labels are words only (card, accessible name, table title), with no glyph, so the grid draws one new mark in all. The region caveat stays off the grid.
- **Evidence:** `provenance.test.tsx` "markers do not dominate" block (one `satswitch` in the whole grid; a converted, validated month draws only its tint and count; an untuned area's grid markup equals Sumatra's). Sumatra at 1280 px in the built-in browser looks as before apart from the one rule.
- **Revisit if:** a viewer misses the rule; a margin note like the sensor change's would be next.

## Story 3.6: the caveat quotes its own claim (15 Nov 2026)

- **Status:** ASSUMED. Claims approved by the lead on 15 Nov ("Approve all"), with the untuned wording changed.
- **Decision:** Where the caveat shows follows the served `aoi.region_caveat` only. It opens with the contract's sentence (`labels.region_caveat.untuned_region` or `.southern_africa`), then quotes one fixed claim from `evidence.json` by id, whole: `caveat-untuned-region` or `caveat-southern-africa` (`CAVEAT_CLAIM` in `web/src/provenance/caveat.ts`). If `evidence.json` lacks that claim, the caveat shows only the contract's sentence; no other claim stands in. If `evidence.json` fails to load, `client.evidence_unavailable` follows that sentence. The earlier stand-in, which quoted `reported-only-regions` (with its Punjab sentence) and `southern-africa-flags` while the claims did not exist, is removed.
- **The approved claims** (in `evidence/claims.yaml`, copied unchanged from the Story 5.5 branch, figures 16.8% and 0.453 from the scoring files):
  - `caveat-untuned-region`: "The conversion was not tuned here. In the one untuned region scored, southern Africa's savanna, C1's counts ran 16.8% low in the reported-only run, and its flags were right less than half the time on the final set (0.453)."
  - `caveat-southern-africa`: "In this region C1's counts ran 16.8% low in the reported-only run, and its flags were right less than half the time on the final set (0.453)." As proposed.
- **Why the untuned claim was reworded:** it reports one region's results and makes no prediction. It shows on every untuned area, including ones that are not savanna (the Central Kalimantan example is not evaluated at all), so "counts are likely too low in savanna and grassland" would have predicted a bias the scores do not show for those areas. It also drops "and grassland": the one grassland region scored is a tuning region.
- **Open, for the lead:** "the one untuned region scored" may not hold. `meta.coverage` serves Siberia as `tested_unseen` (scored, not tuned) and Punjab as `reported_only`. If Siberia's final-set results count, the claim should name southern Africa without "the one". Not changed here: `claims.yaml` must stay identical to the 5.5 branch.
- **Evidence:** `web/src/provenance/caveat.test.tsx` AC4 to AC6 blocks (each caveat quotes exactly its own claim and no other, no Punjab sentence; the contract sentence comes first; no "likely", "may" or "could" in the southern Africa caveat; with the claim missing only the contract sentence shows; every number shown is a `display` of the quoted claim's figures; the claim is the object from `evidence.json`).
- **Revisit if:** either claim is renamed or reworded in `claims.yaml` (the web reads them by id), or the lead settles the Siberia point.

## Story 3.6: the evidence-class map is a 1° cell map inside the caveat (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The locator map (`web/src/area/MapView.tsx`, MapLibre) was outside this story's files, so the cells are marked on a small SVG map of the area's 1° cells inside the caveat, beside the locator: one square per cell from `POST /cells` (served `sw_lon`, `sw_lat`, `evidence_class`), north up. Tuned cells are plain; tested-but-not-tuned get horizontal lines, reported-only vertical lines, not evaluated a cross-hatch, all in ink, so no class rests on colour and none reuses the grid's hatching or dots. A key gives `labels.evidence_class` for each class the area holds (served `evidence_class_counts` not 0). The map shows only when the area carries a caveat; Sumatra shows none and loads neither `/cells` nor `evidence.json`. The `/cells` call lives in `web/src/provenance/cells.ts`, not in `ServiceClient`, because `web/src/api/` was outside scope; a failed call leaves the map out and keeps the words. evidence.json is loaded lazily, sharing the evidence view's chunk.
- **Evidence:** `caveat.test.tsx` AC4 block (each served cell drawn with its class's pattern; four distinct fills; no colour fill; the key; north-up placement; the `/cells` request body; a refused call gives no map). Built-in browser with a scratch mock service serving the contract's untuned and savanna examples: 1280 and 375 px, page width 375, patterns readable at 28 px a cell.
- **Revisit if:** the lead wants the classes drawn on the locator itself (move the patterns into `MapView`), or `postCells` is added to `ServiceClient` (move the loader there), or a very large area makes 3 px squares unreadable.
