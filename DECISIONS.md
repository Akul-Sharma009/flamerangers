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

## Story 2.5 AC2: Australian grassland and Amazon forest threshold parity (15 Nov)

- **Status:** TESTED (Amazon); TESTED with one open cell (Australia)
- **Decision:** Thresholds come from the same code for all three tuning regions; the parity check feeds it region-clipped 2003–2011 Aqua counts, as the harness did.
- **Evidence:** `test_2_5_ac2_amazon_thresholds_match_the_parity_targets` and `test_2_5_ac2_australia_thresholds_match_except_the_known_cell` (they run where the records are built). Amazon forest: 672 of 672 cell-months within 1e-6. Australian grassland: 967 of 972. The 5 misses are all at 136°E 16°S (the McArthur River mine), months 1, 2, 10, 11 and 12, product higher (for example 88.2 against 87.0 in October). The record was built without Suomi NPP 2016, which FIRMS refused on four attempts, so the static mask could not mark this persistent source. The build now refuses to run without every static-mask tuning-year file (MODIS and Suomi NPP for 2014, 2016, 2017 and 2020).
- **Revisit if:** the rebuild with Suomi NPP 2016 still misses this cell; then the cause is elsewhere.

## The lead's review list: gate, nulls, static inputs, last good version (15 Nov)

- **Status:** TESTED
- **Decision:**
  - **AD-2 gate.** `publish` runs the parity case check (`burncal/pipeline/parity.py`, the same comparison as Story 2.2's test) whenever the version holds converted counts (data through 2022 or later). If the case is not available or any of 4A, 1A and C1 at 1° and 0.25° misses by more than 1e-6, publish refuses and nothing is written. The manifest records the result.
  - **Null is not 0.** A month of the record with no feeding day loaded is "uncovered": `/calendar` gives count null with `outside_coverage`, and the flag table gives count null with `outside_record` (the contract has no flag state for "not loaded"). Partly covered months keep their count and carry `missing_days`.
  - **Static-mask inputs.** The clean step refuses to run unless MODIS and Suomi NPP standard files for 2014, 2016, 2017 and 2020 are all present.
  - **AD-11.** If the pointer names a version that fails to load, the service keeps answering from the last good versions and keeps the error; it does not retry on every request.
- **Evidence:** `test_2_6_ad2_*` in `burncal/pipeline/test_publish.py` (the real case passes with `BURNCAL_PARITY_CASE_DIR` set), `test_2_6_null_is_not_zero_*`, `test_2_5_static_mask_build_fails_without_every_tuning_year_file`, `test_2_6_ad11_*`.
- **Revisit if:** the lead wants publishing allowed on a machine without the case (for example a hosted daily refresh, Story 2.9); then the gate needs a recorded pass the refresh can check instead.

## The service reads hotspots from disk, not memory (15 Nov)

- **Status:** TESTED
- **Decision:** The service no longer loads a version's points into memory. `publish` writes `points.parquet` sorted by 0.25° cell key, with the key, month index and day stored (DuckDB, sorting out of core). The service keeps only small tables in memory (flags, evidence, coverage, the list of fine cells) and reads the fine grid and the points with DuckDB per request: whole cells from the grid, cut cells and the current-month card from the points of those cells only. Versions published before this compute the key in the query, which is slower but correct. DuckDB is limited to 512 MB and 2 threads.
- **Evidence:** All tests pass, including fast path against brute force on three areas and the same-days check. Real Sumatra: fast path equals the point sum (largest difference 9.5e-10). Two Sumatra versions loaded: 217 MB steady, 273 MB peak after requests (was 1,025 and 1,172 MB). 20 local Sumatra calendars: p95 0.10 s (was 0.04 s).
- **Revisit if:** a continental area is slower than the 10 s target; then add a per-area cache or a coarser pre-summed grid.

## The lead's low review items (15 Nov)

- **Status:** TESTED (seven items); one needs a contract change
- **Decision:**
  - `share_of_max` divides by the largest complete year, so a part-year is never the 100% bar (it can exceed 1 only when a part-year is larger than every complete year).
  - Months outside the record (count null) have `validated_satellite` false.
  - Counts and ratios are never served as `-0.0`.
  - `/cells` gives a null threshold where the cell-month has no count (outside the record or not loaded).
  - A missing FRP is an empty CSV cell, never `nan`.
  - `/hotspots.csv` streams its rows batch by batch, so a year asked for with `year` (no row limit, as the contract requires) never has to fit in memory. Rows come file by file (satellite, then year), each file in time order, no longer sorted across satellites.
  - `compare_tuning` says "hotspot days".
  - **Not done, needs a contract change (lead):** the current-month card has no field to say that days 1 to *d* of the current month have missing input days. Its reference years are already only complete months. A `cautions` list on `CurrentMonth`, or a `missing_days` boolean, in contract 0.4.0 would carry it.
- **Evidence:** `test_review_*` in `burncal/core/test_stats.py` and `burncal/service/test_store_service.py`; a year of Sumatra hotspots for all satellites (24.5 MB) downloaded from the live service in 10.4 s.
- **Revisit if:** the web needs hotspot rows sorted by time across satellites.

## Codex review items: parity pass tied to the version, lazy previous version, load check before the pointer (14 Nov)

- **Status:** TESTED
- **Decision:**
  - **AD-2, tied to the version.** The parity check returns the sha256 of the `c1_params.json` it read. `publish` refuses unless that hash equals the hash it writes into the manifest, and records both the hash and the code revision under `parity`. The publish command refuses to run while `burncal/` has uncommitted changes, so the manifest's revision names the code that passed.
  - **AD-11, previous version on demand.** The service loads only the current version at start-up. The previous one loads the first time a request names it; if it fails, that request gets `410 version_superseded` naming the current version, the failure is kept and not retried, and the current version keeps answering.
  - **AD-11, load before switching.** `publish` loads the new version once, as the service does, before it moves the version into place and switches `CURRENT.json`. A version that does not load is never named by the pointer.
  - **Hosting.** `remote.sync` copies only the current version's serving files; the previous version's files are fetched when a request first names it. `/tmp` (106 MB free on Vercel after a Sumatra sync) is the tighter limit, not memory.
- **Evidence:** `test_2_6_ad2_the_parity_pass_is_tied_to_the_params_hash_and_code_revision`, `test_2_6_ad2_publish_refuses_a_pass_for_other_params`, `test_2_6_ad2_publish_refuses_uncommitted_code`, `test_2_6_ad11_publish_loads_the_new_version_before_switching_the_pointer`, `test_2_6_ad11_only_the_current_version_loads_at_start`, `test_2_6_ad11_a_broken_previous_version_does_not_stop_the_current`, `test_2_6_sync_copies_the_current_version_and_fetches_the_previous_on_use`; the real parity case returns the frozen params hash. Publish test inputs now carry small real grids, since placeholder grids no longer load.
- **Deployed (15 Nov, code `ec595a1`):** start-up sync 0.5 s, RSS 250 MB, `/tmp` free 137 MB (106 MB before); 20 Sumatra calendars p95 1.07 s; the previous version answers on demand, 4.8 s for its first request.
- **Revisit if:** a hosted refresh (Story 2.9) publishes without the case folder; it then needs a recorded pass keyed on the same hash and revision.

## Sumatra rebuilt on whole tiles and redeployed (14 Nov)

- **Status:** TESTED
- **Decision:** Sumatra is rebuilt from whole-tile downloads (90–110°E, 10°S–10°N) and served as version `20261113-9cedd502`. Only the files the download plan names are built: each region's planned files are linked into a staging folder named by `region_id`, so files left over from earlier trial plans (NOAA-21, Suomi NPP years outside the static-mask years, NOAA-20 before 2022) are not in the version. Those rows would have had weight 0, so no count changes; they would only have added rows to the all-satellites hotspot CSV for Sumatra and not for other regions.
- **Evidence:** parity gate PASS (worst miss 2.9e-10, C1 0.25° 5.2e-11); `tools/check_numbers.py`: 0 failures over 300 months; Sumatra threshold parity 899/900 (only the known September cell at 105°E 6°S); hosted on Vercel: `/meta` placeholder false, 20 Sumatra calendars p50 0.88 s, p95 1.12 s, max 1.17 s; start-up log: imports 1.3–1.4 s, store sync 1.7–2.1 s, load 0.2–0.3 s, RSS 275 MB, `/tmp` free 106 MB (two versions synced, 53 MB, before the lazy previous version above was deployed).
- **Revisit if:** a planned source-year cannot be downloaded (its months then show as not loaded), or the lead wants NOAA-21 or the extra Suomi NPP years in the hotspot CSV.

## Story 2.5 AC2: Australia's five misses are not the static mask (15 Nov)

- **Status:** TESTED (the static mask is ruled out); cause ASSUMED (coastline), open with the lead
- **Decision:** The 15 Nov entry blamed the missing Suomi NPP 2016 file. The whole-tile rebuild has that file and still misses the same 5 cell-months at the cell with south-west corner 136°E 16°S (months 1, 2, 10, 11, 12; product higher, for example 88.2 against 87.0 in October), so that cause is wrong. In 2003–2011 Aqua no row in that cell is marked static, and its busiest 30-arc-second cells have 1 to 11 hotspot days in each static-mask year, far below the 50-day rule. The cell lies on the Gulf of Carpentaria coast and 8 of its Aqua rows in those months are marked offshore, so a coastline difference from the harness is the likelier cause. Nothing is changed: thresholds come from the same code for every region, and Amazon (672/672) and Sumatra (899/900) agree.
- **Evidence:** `test_2_5_ac2_australia_thresholds_match_except_the_known_cell` on the whole-tile build (`store/build/record/australia_grassland`, 8,881,356 rows, all 42 planned files including Suomi NPP 2016); row counts by month and exclusion for the cell from the cleaned files.
- **Revisit if:** the harness's 2003–2011 Aqua counts for this cell show which rows differ; then record the cause in `docs/cleaning-differences.md` beside the Sumatra September 2006 cell.

## Story 2.8: the six evaluated regions in one version; not deployed (15 Nov)

- **Status:** TESTED (built, published locally, checked); hosting ASSUMED blocked by size, decision with the lead
- **Decision:** Each region is downloaded on whole 5° tiles, staged from the planned files only, built one satellite-year file at a time, and all six are published in one version, `20261113-d6f8b9e6` (79,876,339 rows in counts; parity PASS, tied to the params hash and commit `ec595a1`). The version is not deployed: the files the service syncs at start-up come to 901 MB (points 892.5 MB, grids 8.5 MB, the rest under 0.1 MB), over the 120 MB gate and far over Vercel's `/tmp` (about 160 MB in all, 106 MB free with Sumatra loaded). The hosted service stays on Sumatra (`20261113-9cedd502`). The world run waits for the lead.
- **Evidence:**
  - Rows per region (all planned files, no failed year after at most 3 passes): Sumatra 1,815,622; Punjab 3,010,664; Amazon forest 6,588,767; Siberia 6,167,705; Australian grassland 8,881,356; Southern Africa 53,909,754.
  - Serving set by region (each published alone): Sumatra 21.6 MB, Punjab 36.7 MB, Siberia 59.8 MB, Amazon forest 74.4 MB; four regions together 193.6 MB; all six 901 MB. Hotspot record files: 2.1 GB for all six (Southern Africa 1.4 GB).
  - `tools/check_numbers.py` now checks every region polygon the version holds plus the drawn Amazon polygon: 0 failures for all seven searches over 300 months each.
  - Threshold parity on the whole-tile builds: Sumatra 899/900, Amazon forest 672/672, Australian grassland 967/972 (both known cells, see the entries above).
  - Calendar time, local, current version only (5 requests each, p50): region polygons 0.16 to 0.80 s; whole extents 0.18 s (Sumatra 20×20°) to 1.15 s (Southern Africa 15×15°), Siberia 35×15° 0.44 s. Hosted adds about 0.8 s (Sumatra p50 0.88 s hosted against 0.16 s local). A true continental area needs the world store.
  - Peak build memory: Southern Africa clean 4.4 GB, convert 4.3 GB; publishing all six 4.0 GB.
  - `test_2_8_ac1_*` in `burncal/service/test_regions_store.py` run on the published version: each region's calendar loads with every record month non-null; extents are the whole-tile boxes; an area outside every extent or across an extent edge gets `outside_coverage`.
- **Options for serving more than Sumatra (lead's call):**
  1. **Read the points from public storage with DuckDB `httpfs`** instead of syncing them. `points.parquet` is sorted by 0.25° cell, so a calendar reads only the row groups of the cells an area cuts. Syncing drops to about 9 MB. Measured earlier: a cold Sumatra calendar over range reads took 4.07 s on Vercel; the 10 s target looks reachable but the six-region numbers are not measured. Costs nothing.
     **Measured 15 Nov** (six-region version on the public dataset, points read by HTTP range requests from the data owner's machine in Singapore; counts equal to the local copy in all 12 cases): first request 5.3 s (Amazon polygon) to 42.7 s (Southern Africa whole extent); 9 of 12 over 10 s (region polygons: Sumatra 11.7, Australia 20.0, Amazon 5.3, Southern Africa 42.4, Siberia 25.2, Punjab 9.5 s). Repeat requests 0.35 to 0.67 s. The first request reads every row group whose key range the area's cells span, and keys run by longitude first, so an area touches most of its region's 100,000-row groups. As is, option 1 misses the target on a cold instance; sorting the points by 1° block with smaller row groups, or caching each region's points in `/tmp` after the first read, would be the next things to try. Not measured from Vercel.
  2. **Vercel large functions** (public beta, up to 5 GB bundle): ship the version in the deployment. Beta, and memory (2 GB) still has to hold DuckDB's working set for the largest area. Cost and Hobby availability not checked.
  3. **Serve the regions that fit** in one version under 120 MB: Sumatra and Punjab (58.3 MB), or Sumatra with Siberia (81.4 MB) or Amazon forest (96.0 MB). Australian grassland and Southern Africa do not fit with this layout.
  4. **Make the points smaller.** About 40% of the rows feed the record; the rest are kept for raw counts and the all-satellites CSV. Moving those to a coarser table would shrink the file, but changes how raw counts are served, so it needs the lead (AD-8).
- **Revisit if:** the lead picks an option, or the world run is approved (the store grows by roughly the global-to-six-region area ratio).

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

## Story 5.5: no new claim; the precision failure is shown check by check (15 Nov 2026)

- **Status:** TESTED. The lead approved the drafted claim on 15 Nov ("Approve all", relayed by the lead's session); it is now `aqua-only-every-method-failed-precision` in `claims.yaml`.
- **Decision:** `claims.yaml` has no sentence saying every method failed against (c) on flag precision, and a new claim needs the lead's approval. So the section shows it as data: a table of every approach's non-inferiority result and its four checks (flag precision, month-rank correlation, peak month, season length), each a yes/no figure read from `decisions`, with the paired difference against (c) and its interval under it. On the final set every row reads "no" overall and "no" on precision, "yes" on the other three. The fixed claim `aqua-through-2021` ("every method failed against Aqua only") is printed above it. Drafted for the lead, not added:
  > On the final set, against the Terra referee, every method failed the non-inferiority test against (c), Aqua only, on flag precision and passed it on month-rank correlation, peak month and season length.
  (Figures: the 24 `non_inferior_to_c` checks for C1, 4A, 1A under `/decisions/final/` and for (a), (b) and the comparator under `/decisions/not used for the pick/`.)
- **Evidence:** `aquaOnly.test.tsx` "AC1: on the final set it shows that every method failed on precision…"; `evidence/test_aqua_only.py` `test_5_5_ac1_on_the_final_set_every_method_failed_on_precision_alone`.
- **Update, 15 Nov:** approved and added as `aqua-only-every-method-failed-precision` (used for the pick; 24 bool figures from `/decisions/not used for the pick/non_inferior_to_c/`, the same file and set as `aqua-through-2021`). The section now prints it word for word at the top of the "test against (c)" block; the data table stays under it. Two caveat claims were added in the same change for Story 3.6, which reads them by id: `caveat-untuned-region` and `caveat-southern-africa` (both not used for the pick; C1's reported-only bias and final-set flag precision in southern Africa). Story 5.5 does not show them.
- **Evidence:** `aquaOnly.test.tsx` checks the claim is printed in the test block and its figures equal the table's checks; `evidence/build.py --check` and `test_claims.py` check every figure against its source.
- **Revisit if:** the lead rewords any of the three claims.

## Story 5.5: the selection set is shown as it is, where most methods passed against (c) (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** On the selection set every approach except (a) passed the non-inferiority test against (c); only on the final set did every method fail. The section has the same set, region and scale choice as the head-to-head table, defaults to the final set, and shows the selection set's results as its file holds them, with a typed line that the final pick used the final set. Any sentence that every method failed must say "on the final set".
- **Evidence:** `selection.decisions` rows `/decisions/non_inferior_to_c/*/pass` in `evidence.json`; `aquaOnly.test.tsx` "AC1: each set's test is shown check by check as its file holds it".
- **Revisit if:** the lead wants the section to show the final set only.

## Story 5.5: words that explain the test and the incumbents (15 Nov 2026)

- **Status:** ASSUMED. Needs the lead's OK on the copy.
- **Decision:** The section's own words are in `web/src/evidence/aquaOnly.ts` (`AQUA_COPY`) and hold no number. They: name (c) as today's practice and INPE Queimadas's rule (test plan, incumbents table); explain non-inferiority from the test plan's Terra-referee section and P1 (Aqua would be the answer key; Terra shares the instrument and algorithm, so the referee favours (c); a known-answer test can't tell methods apart; Terra is the only independent MODIS-unit record). The margin's size is not quoted, because it is not in a scoring file, and the page points to the test plan for it. They also give why the record does not use Aqua only after the switch (test plan, outcome table: Aqua is less reliable after its last orbit adjustment and has no values once it ends), and the GWIS reason in Story 5.5's words (data check D5: its files hold burned area and fire events, not hotspot counts). NASA FIRMS is listed as an incumbent that gives inputs, not a series (test plan). "Fire events" is GWIS's own product name and is not used for hotspots.
- **Evidence:** test plan sections 2, 6 and 11 and data check D5 in the planning record; `aquaOnly.test.tsx` "the words typed for this section hold no number and never say fires"; wording check on the fresh build.
- **Revisit if:** the lead rewords any of it, or the "fire events" name is read as breaking the hotspots rule.

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

## Story 6.5: which claims the submission text quotes (15 Nov 2026)

- **Status:** ASSUMED. Needs the lead's OK.
- **Decision:** The Project Summary quotes two claims, `count-error-vs-b` and `flag-precision-vs-b`, so the failed test sits beside the result in the shortest field. The Project Details quotes the ten claims the storyline puts on slides 5 and 6 (every `used_for_pick` claim plus `comparator-vs-b`). The three reported-only claims are left out of the form, as the storyline keeps them for questions. Each is quoted word for word with its id; the id label is dropped when pasting.
- **Evidence:** Story 6.5 AC1 (summary and details use the `claims.yaml` sentences); `docs/pitch/storyline.md` slides 5 and 6 and "If a judge asks"; `docs/submission/test_text.py` checks the quotes word for word and that both fields carry the failed test.
- **Revisit if:** the live form has a limit the details field exceeds (cut order is given under the field), or the lead wants the reported-only results in the form.

## Story 6.5: word counts and product names in the submission text (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** No word or character limit is known: Story 6.5 gives none and the brief's field list (organisers' email, judging guide) gives none. Each field states its word count as pasted (claim labels dropped, pending markers counted as they stand), checked by `docs/submission/test_text.py`. The official names of the FIRMS products, which contain the word the project does not use, are left to Story 6.1 and the lead; the draft says "hotspot products".
- **Evidence:** Story 6.5 criteria; the brief's "Singapore organisers' email" and "Eligibility for global judging" lists in the planning record.
- **Revisit if:** the live form shows limits, or the lead rules that proper names are exempt from the "hotspots" rule.

## Story 3.8: the anomaly view's diverging ramp and its neutral class (15 Nov 2026)

- **Status:** ASSUMED. Approved by the lead on 15 Nov ("Approve all").
- **Decision:** A "Counts / Anomalies" switch sits beside "Grid / Table". In the anomaly view each counted month is filled by its served `anomaly_class`, never by `anomaly_pct`. The neutral middle is the class that holds 0, as the contract defines it: the last served `anomaly_breaks` lower bound at or below 0 (`neutralIndex` in `web/src/grid/anomaly.ts`). That is a sign check on a served bound to pick a hue, not a number shown. Classes below it take one to three steps of a slate hue, classes above it one to three steps of an ochre-brown hue; a fourth step or beyond shares the darkest. Colours: `--a-cool3` #2f4f6b, `--a-cool2` #6f8ea8, `--a-cool1` #b9c7d2, `--a-neutral` #e6dfd0, `--a-warm1` #dcb98a, `--a-warm2` #b07a3e, `--a-warm3` #6e3a15 (`web/src/grid/grid.css`); no red. Ink text on every step but the two darkest. A counted month with no class (served `anomaly_class` null, which happens when the mean is 0) is left plain with a rule outline, not neutral, and its card gives `notes.no_typical_activity`. Cells show the served `anomaly_pct`, signed, at laptop width and tint only at phone width, as the count view does. The foot row shows the served `reference_mean` (the ramp's centre) under the label "mean".
- **Evidence:** `web/src/grid/anomaly.test.tsx` AC1 block (tone from served class for every month; class beats percentage; neutral is class 2 for the fixture's breaks; legend lists each served break, signed; foot row is the served means; no red on the ramp). Built-in browser at 1280 and 375 px.
- **Revisit if:** Story 3.10's colour-vision simulation fails a step (the slate and ochre steps were chosen by eye, not with the dataviz validator), the service serves more than three classes on one side, or the lead prefers a different hue pair.

## Story 3.8: flags are stated per tier, never summed (15 Nov 2026)

- **Status:** ASSUMED. Approved by the lead on 15 Nov ("Approve all"): AC2 is met per tier out of M, with no served total.
- **Decision:** AC2 asks the detail to say "N of M cells flagged". The service serves `cells_flagged_strong`, `cells_flagged_marginal` and `cells_total`, but no flagged total, and the web never sums (AD-8). So each month's card says "Flagged 1° cells: 19 strong, 9 marginal, of 113" followed by `notes.flag_scale` (the 1° scale), and `notes.strong_tier` whenever the strong count is not 0. Once contract 0.4.0 merges, the card uses its `sentences.cells_flagged` instead ("19 of 113 one-degree cells are flagged strong and 9 marginal, ..."), with no web change. In the count view these lines follow the flag label on flagged months only; in the anomaly view they show on every counted month, so a large anomaly with no flag reads "0 strong, 0 marginal". The flag symbols are Story 3.5's (filled triangle for strong, ring for marginal); the legend now adds `notes.strong_tier` to the strong entry and `notes.flag_scale` as its own entry, in both views. Flag counts are read as possibly null, so contract 0.4.0's null outside the record gives no mark and no line.
- **Evidence:** `anomaly.test.tsx` AC2 block (shapes in both views and at 375 px; per-tier line with the 1° note; the 0.4.0 sentence filled from served values; the strong-tier note wherever strong shows, and in both legends; "28" never written for 19 + 9; null counts give nothing).
- **Revisit if:** the lead wants one "N of M" figure: that needs a served `cells_flagged` total in the contract, not a sum in the web.

## Story 3.8: "not flaggable" is read per cell, in a panel for the picked month (15 Nov 2026)

- **Status:** ASSUMED. Approved by the lead on 15 Nov ("Approve all").
- **Decision:** A month carries `reference_year` and `provisional`, so its card reads `notes.reference_year` and `notes.provisional` when they are true, in both views. "Not flaggable" is a state of a 1° cell, not of a month (AD-9), and `Month` serves no count of such cells. So the anomaly view adds, under the legend, the flag state of each 1° cell for the month the user last focused or tapped (else the served current month): a north-up map with one square per served cell (filled triangle strong, ring marginal, plain none, dashed outline not flaggable, hatching outside the record), a key with `labels.flag_state` for all five states, the flag scale and strong-tier notes, the served flag reference years, `notes.provisional` when any cell is provisional, and the same cells as a table (corner, state, served count, served threshold, notes) behind "Each cell as a table". It asks `POST /cells` with the picked month, 250 ms after the last pick, once per month and record version. The panel is shown only in the anomaly view, so the count view sends no `/cells` request. `web/src/provenance/cells.ts` (Story 3.6) gained an optional `month` argument; with none it asks for the current month as before.
- **Fixture mode:** the fixture holds one `/cells` answer (September 2015), served for every month, so locally the panel always shows September 2015. The heading names the served month, so the page shows what is served.
- **Evidence:** `anomaly.test.tsx` AC3 block (each month's note matches its served boolean in both views; every flag state drawn and labelled from `cells_every_state.json`; the reference-year example reads the note; the request body carries the picked month; Story 3.6's call is unchanged; panel only in the anomaly view). Built-in browser: panel at 1280 and 375 px, the table's not-flaggable rows read the contract label.
- **Revisit if:** the lead wants a not-flaggable figure on the month itself (needs a served field), or the panel should follow hover too.

## Story 3.8: the anomaly words read the contract's sentences once 0.4.0 merges (15 Nov 2026)

- **Status:** ASSUMED. Wording approved by the lead on 15 Nov ("Approve all"), with the anomaly sentence reworded; the keys go into the contract 0.4.0 draft (`lead/contract-0.4.0`), which did not hold them yet when this was built.
- **Decision:** `web/src/grid/anomaly.ts` reads six optional keys, `sentences.anomaly`, `sentences.reference_mean`, `sentences.flag_reference`, `sentences.anomaly_scale`, `sentences.cells_heading` and `notes.partly_inside`, the way `web/src/card/words.ts` reads the card's (its `fill()`), alongside 0.4.0's `sentences.cells_flagged`. Each is filled from served values, formatted only, with each signed value keeping its served sign ("+19,674.4 hotspots (+277.55%)", "−1,139 hotspots (−81.34%)"); `{month_name}` is the month's calendar name and `{month}` the served month ("November 2026"). While master's contract (0.3.0) lacks a key, the label used so far shows instead, so merging 0.4.0 switches the words with no web change. A template with a placeholder whose value is null is not filled: the label shows, so no null is written as 0 or left blank (the anomaly sentence needs `anomaly_pct`, which is null when the mean is 0).
- **The approved text:**
  - `sentences.anomaly`: "Difference from the {reference_start}–{reference_end} mean for {month_name}: {anomaly_count} hotspots ({anomaly_pct}%)."
  - `sentences.reference_mean`: "The {reference_start}–{reference_end} mean for {month_name} is {mean} hotspots."
  - `sentences.flag_reference`: "Flag thresholds come from {flag_start}–{flag_end}, a different period from the mean, so a large anomaly can have no flag and a flag can come with a small anomaly."
  - `sentences.anomaly_scale`: "Anomaly as a percentage of the {reference_start}–{reference_end} mean for the calendar month. Each class starts at the value shown."
  - `sentences.cells_heading`: "Flag state of each one-degree cell in {month}."
  - `notes.partly_inside`: "Partly inside the area. The count and flag are for the whole cell."
- **The labels until then:** "Anomaly: {anomaly_count} {unit}, {anomaly_pct}%", "Reference mean {start}–{end}: {mean} {unit}", "Flag reference years {start}–{end}", "Anomaly, % of the {start}–{end} mean for the calendar month, lower bound of each class", "Flag state of each 1° cell, {month}", "Partly inside the area.". Labels that have no sentence planned stay as they are: "mean" under the foot row, "Each cell as a table" and the cell table's column heads.
- **Evidence:** `web/src/grid/anomaly.test.tsx`, "Approved contract sentences" block, with the approved templates passed in as `card.test.tsx` does (master's contract has none of the six keys, so the labels show; each sentence filled from served values in the card, legend, table caption and cell panel; signs kept; a null value falls back to the label; only served numbers on screen). `uv run python evidence/wording.py` passed.
- **Revisit if:** a key is renamed or reworded in the merged 0.4.0 (the web reads them by name), or a placeholder name changes.

## Story 3.8: flag marks stay on both tiers (15 Nov 2026)

- **Status:** ASSUMED. Decided by the lead on 15 Nov.
- **Decision:** The grid keeps a mark on every flagged month, a filled triangle for strong and a ring for marginal-only months, rather than marking strong months only (the open question in `UI-CONCEPT.md`, section 5). Reason given by the lead: the planning record says showing strong flags only cuts recall from 0.848 to 0.656, and the strong tier is a display tier, not the scored rule. The clutter in 2015 and 2019 seen in the browser comes from the fixture's invented data.
- **Evidence:** the lead's decision, citing the planning record; browser check on the fixture (most months of 2015 and 2019 carry a mark).
- **Revisit if:** real Sumatra data, once published, shows most months of most years carrying a mark, so the marks no longer single out unusual months.

## Story 5.6: the eight limits are page copy with figures, not new claims (15 Nov 2026)

- **Status:** TESTED. The lead approved the section's wording on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** The eight limits of test plan section 12 are typed in `web/src/evidence/limits.ts` (`LIMITS`), in the plan's order, as a numbered list. They state limits, not how C1 scored, so none was added to `claims.yaml`. Each number they quote is a figure from `evidence.json` named by table, row and cell: the last scored year (the final file's Sumatra years), the selection set's years, its blocks (28, from the file; the test plan's "about 30" was written before the count) and its one pair of years per region. Limit 3 prints the fixed claim `noaa20-untested`. Wording changes from the plan, each to fit the product: "not truth about fire" became "agreement with Aqua, not the truth on the ground" (the hotspots rule); "13 approaches" became "many approaches" (the 13 are in the first selection run, which `evidence.json` does not read); the precision margin's size is not quoted (it is in no scoring file; the page points to the test plan); the cropland limit adds that Punjab, a cropland region, is in the reported-only run only, so it neither overstates nor hides what was run. No limit says anything about how C1 scored.
- **Evidence:** test plan sections 4, 8 and 12 and the outcome table (P2) in the planning record; `limits.test.tsx` "AC1: all eight limits of test plan section 12 are present…" (a checklist kept apart from the copy) and "AC1: the numbers in the limits are figures…"; `evidence/test_limits.py` checks each fact a limit relies on against the scoring files (scored years stop at the quoted year; tuning regions late years only; one year pair per region for every approach; no Punjab in the selection or final set).
- **Revisit if:** the lead rewords a limit or wants any of them as a fixed claim.
- **Update, 15 Nov:** approved by the lead with the rest of the section's wording.

## Story 5.6: the tiers sentence (15 Nov 2026)

- **Status:** TESTED. The lead approved the drafted claim on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** The tiers block prints the fixed claim `tiers-selection-only` ("checked on selection years only") between two typed sentences: "The calendar shows each flag as strong or marginal." and "They were not checked in southern Africa or Siberia, and the idea for them came after the final-set scores had been seen. The final set was not read again to check them." The last two facts are from the planning record's "Anomaly flags: two tiers" entry. Not added to `claims.yaml`; a drafted single claim, if the lead prefers one: "The two flag tiers were checked on selection years only, not in southern Africa or Siberia, and were added after the final-set scores had been seen." (no figures).
- **Evidence:** planning `DECISIONS.md`, "Anomaly flags: two tiers"; `limits.test.tsx` "AC2".
- **Revisit if:** the lead approves the drafted claim (then the block prints it instead of the claim plus typed sentence).
- **Update, 15 Nov:** approved and added at the end of `claims.yaml` as `tiers-not-checked-everywhere` (not used for the pick, no figures; now seventeen claims). The tiers note now prints "The calendar shows each flag as strong or marginal." and then that claim by id; the typed sentence ("They were not checked in southern Africa or Siberia, and the idea for them came after the final-set scores had been seen. The final set was not read again to check them.") is removed. `tiers-selection-only` stays in `claims.yaml` for other pages. "The final set was not read again" is no longer on the page; it would need its own claim. After the change: evidence check passed, `uv run pytest evidence` 164 passed, `npm run test` 185 passed, `npm run build`, wording check passed.

## Story 5.6: the reported-only run gets its own section, with Story 5.4's tables (15 Nov 2026)

- **Status:** ASSUMED
- **Decision:** The reported-only run (`9d5e7bf1d0d6`) is a second section, "The reported-only run", under "What the scores can't show", headed by a ruled "Not used for the pick" label and the run's own fields (run id, the final run it followed, last standard date, its note). It prints the three fixed claims on it word for word (`reported-only-vs-b`, `reported-only-4a`, `reported-only-regions`), the years it covers, every approach's results under the same tests as the final pick (against (a), against (b) with what each was worse on, and non-inferiority to (c)), and Story 5.4's score, by-year, paired-difference and block tables with its own region and scale choice (southern Africa and Punjab are regions there). The reported-only test against (c) is shown as its file holds it: (b) and the comparator passed, the candidates failed on precision. `HeadToHead.tsx` exports its by-year and paired-difference tables (`ByYear`, `Pairs`) with unchanged markup; `headToHead.ts` exports `pairsOf` and `byYearOf` and takes any set key in `scaleOptions`, `regionOptions` and `normalise`.
- **Evidence:** `limits.test.tsx` "AC3" tests; `evidence/test_limits.py` (4A alone passed the (b) test; C1 not the lowest error in southern Africa or Punjab); Story 5.4 and 5.5 tests pass unchanged.
- **Revisit if:** the lead wants the reported-only run shorter (for example the claims and the tests table only).

## Story 5.6: the NOAA-20 result file, once Story 2.10 writes it (15 Nov 2026)

- **Status:** ASSUMED. Story 2.10 has not run, so this is tested on a made-up file only.
- **Decision:** The build reads the latest file named `noaa20_check_*.json` that `evidence/scoring/MANIFEST.json` lists, as the set `noaa20_check` (already in the schema), and fails unless its `label` says "reported only" and "not a validation against Aqua". Since its shape is Story 2.10's, the build makes no assumption about it: the table `noaa20_check.figures` holds every value in the file, one row per field, each a figure with its pointer. The page then prints the contract's `notes.noaa20_check` ("Reported only. … not a validation against Aqua."), the file's label and those figures. Until then it prints `notes.noaa20_check_not_run`, once, in the NOAA-20 block only. Also added: a `year` display format (no thousands comma), and per-set tables `{set}.years` and `{set}.about`. No schema change.
- **Evidence:** `evidence/test_limits.py` `test_5_6_noaa20_*` (no file now; a listed file is read; a file without the label fails the build); `limits.test.tsx` "AC4" (both states).
- **Revisit if:** Story 2.10 names its file differently or gives its figures a shape worth a proper table (then replace the field-by-field list).

## Story 3.9: the rankings' sentences wait for the contract (15 Nov 2026)

- **Status:** TESTED. The lead approved the four sentences as worded on 15 Nov ("Approve all", relayed by the lead's session); they are added to the contract 0.4.0 draft (`lead/contract-0.4.0`, not yet merged).
- **Decision:** The rankings type no sentence. `web/src/ranks/words.ts` reads five optional keys; each switches on when a contract bump adds it, with no web change (`TODO(label)` until then). Suggested wording:
  - `sentences.rankings_range`: "Only complete months and years from {range_start} to {range_end} are ranked." ({range_start} and {range_end} are the served `range` days, formatted, e.g. "1 July 2002".)
  - `notes.rank_tie`: "An equals sign after a rank means the rank is shared: those values are equal." (shown only when a list has a tie)
  - `notes.no_complete_month`: "No complete month falls in these dates, so none is ranked."
  - `notes.no_complete_year`: "No complete year falls in these dates, so none is ranked."
  - `notes.range_and_reference` is already in the 0.4.0 draft ("Rankings cover the dates you chose. Medians and anomalies always use the reference period.") and shows under the lists once 0.4.0 merges.
  Until then the panel shows the served range as a label ("1 July 2002 to 13 November 2026"), a list with nothing served shows "–" (never a 0), and a tie shows its "=" mark with no key sentence.
- **Evidence:** `ranks.test.tsx` "types no sentence of its own" and "uses the contract's sentences once they exist" (the suggested templates filled from served values).
- **Revisit if:** the lead rewords any of them, or prefers them in one sentence.
- **Update, 15 Nov:** approved by the lead as worded. The four keys are in the 0.4.0 draft's `contract/messages.yaml` under the same names and sections the web reads (`sentences.rankings_range`; `notes.rank_tie`, `notes.no_complete_month`, `notes.no_complete_year`), checked against the draft's text; merging 0.4.0 switches them on with no web change.

## Story 3.9: ties are read off the served ranks and marked "=" (15 Nov 2026)

- **Status:** TESTED. Approved by the lead on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** A tie is two entries of one served list with the same served `rank`; the web never compares values (AD-8). The rank shows as "7=" (the printed-table convention), and screen readers hear "7, tied" (one typed word, a label, not a sentence). Lists show every served entry, so a tie at the cut shows more than five, as the contract allows.
- **Evidence:** `ranks.test.tsx` AC1 "shows ties as ties" (savanna example: six calendar months at rank 7), "more than five entries", "never re-ranks" (equal values with different served ranks are not a tie).
- **Revisit if:** the lead prefers "T7", "joint 7th" or a contract word for "tied".
- **Update, 15 Nov:** approved by the lead: the "=" mark stays, with "tied" as a short screen-reader label for now. In a later contract version, "tied" is to be replaced by a contract word.

## Story 3.9: where the rankings sit and how a selection is marked (15 Nov 2026)

- **Status:** TESTED. Approved by the lead on 15 Nov ("Approve all", relayed by the lead's session). Checked in the built-in browser at 1280 and 375 px.
- **Decision:** At laptop width the rankings sit in the left column under the footnotes, beside the grid (UI-CONCEPT.md puts them "below the hero"; this keeps a selected item and its mark in view together). Under 800 px they follow the grid. Each entry is a toggle button: selecting it frames the item on the grid (one month's cell, a year's whole row with its total, or a calendar month's column down through its median) with a 2.5 px ink frame on a paper halo, outside the cells, so it differs from the 2 px hover ring and the dashed month to date and reads on every class; the table view marks the same cells. Selecting it again or pressing Escape clears it; a new area or range clears it. The frame is scrolled into view (nearest edge) when the selection changes; on a phone this moves the page up from the rankings to the grid. Busiest calendar months shows all twelve served entries, not five (the criterion asks for "the busiest calendar months on average"; the service serves twelve).
- **Grid change:** `web/src/grid/` gained `highlight.ts` and a `highlight` prop on `CalendarGrid` and `CalendarTable` (drawing only; the grid model is unchanged).
- **Evidence:** `ranks.test.tsx` AC2 block; browser check (see `docs/handoff.md`, Story 3.9).
- **Revisit if:** the scroll on a phone feels like a jump (option: no scroll, or a "shown on the calendar" link), or the lead wants the top months to open the cell's card as well.
- **Update, 15 Nov:** approved by the lead. **Recorded change from UI-CONCEPT.md:** the concept puts the rankings "below the hero"; at laptop width they sit in the left column instead, kept deliberately so that the selected entry and its frame on the grid are on screen together. Under 800 px they still follow the grid. Scrolling the frame into view on phones is approved as built.

## Story 5.7: the about page's explanations are typed page copy (15 Nov 2026)

- **Status:** TESTED. The lead approved all of Story 5.7's copy and choices on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** Everything on `#/about` that is neither a contract sentence nor a fixed claim is typed in one file, `web/src/about/copy.ts`: what a hotspot is and why it is not a fire, each satellite's part, why the switch sits after December 2021 (beyond the claim), the cleaning rules and where they differ from the validation's, standard against NRT, what the validation does not cover, and cloud and smoke. Dates, the unit, the record version and satellite names are placeholders filled from `/meta` and `labels.satellite`. The only digits typed are fixed rules and facts no response serves (1 km, 375 m, 50 days, the tuning years 2014, 2016, 2017 and 2020, and 2012–2013); a test fails on any other. Contract sentences used as they are: `notes.hotspot_definition`, `record_switch`, `satellite_switch`, `validated_satellite_false`, `monthly_validation_only`, `labels.source.*`, `labels.quality.*`, `labels.excluded_reason.offshore` and `.static`.
- **Where each fact comes from (planning record unless said):** VIIRS 375 m, NRT replaced after 2–3 months, NRT geolocation after manoeuvres, NRT day/night by orbit direction, NRT lacking `type`, location files with no cloud information, heavy smoke hiding burning (FIRMS, GWIS, Giglio 2016; INPE disagrees), Terra and Aqua drift and end dates, MODIS missing low-intensity burns VIIRS sees: `research/domain-research.md`. The validation's static mask built in tuning regions only, standard data only, no confidence filter: test plan section 4. The static rule: this repo's "Static mask: the scored rule". Sumatra's exact match: `docs/cleaning-differences.md`. NOAA-20 converted with C1 and Terra and NOAA-21 never feeding: `burncal/core/record.py`. Punjab and 2012–2013 reported only: claim `reported-only-vs-b`. **MODIS's 1 km pixel is general knowledge, not checked against a source in the planning record `[unverified]`.** "Offshore hotspots, such as those from oil and gas platforms" is an example, not a checked fact.
- **Evidence:** `web/src/about/about.test.tsx` (18 tests).
- **Revisit if:** the lead or the data owner changes any wording, or wants these explanations in the contract.

## Story 5.7: the six counting limits are page copy, not contract sentences (15 Nov 2026)

- **Status:** TESTED. The lead approved all of Story 5.7's copy and choices on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** The six counting limits of PRD FR-20 are listed on the page in the PRD's words, lightly plainer ("small crop fires" became "small crop burns"; limit 6 now says Punjab was scored as reported only, since the PRD's "no cropland region was scored" predates that run). The contract has no sentence for them, so the web types them. FR-17 and FR-18 say the CSV headers list the same limits, but `burncal/service/app.py` writes three other notes as `counting_limits` (`hotspot_definition`, `monthly_validation_only`, `flag_scale`). Suggested for the next contract bump (both owners): a `counting_limits:` list in `messages.yaml` read by the service's CSV headers and by this page, so the six are written once.
- **Evidence:** `about.test.tsx` "lists all six counting limits from the PRD, numbered".
- **Revisit if:** the contract gains the limits (then the page reads them and `copy.ts` drops its list).
- **Update, 15 Nov:** the lead approved the plan and put the six in contract 0.4.0's draft as a top-level `counting_limits:` list, written by both CSV headers too; limit 4 there says "after December 2021" in place of the page's placeholder, as `notes.record_switch` does. The page now reads `messages.counting_limits` when it is a non-empty list of strings (cast, as `card/words.ts` reads `sentences`) and falls back to `copy.ts` otherwise, so merging 0.4.0 switches it with no web change. Checked against the draft's list: with the fixture's dates it equals the fallback word for word. The intro now says "These limits apply…" instead of "Six limits apply…", so it stays true if the list changes length. Evidence: `about.test.tsx`, "the counting limits come from the contract once it has them" (3 tests).

## Story 5.7: datasets and citations wait for Story 6.1 (15 Nov 2026)

- **Status:** TESTED. The lead approved all of Story 5.7's copy and choices on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** The margin lists four data sources by plain name (FIRMS MODIS, FIRMS VIIRS 375 m, the VIIRS swath product used to fit C1, Natural Earth land), each with which satellites it covers and a visible `[pending: Story 6.1]` where its link and citation go. No product code, link or citation is typed, because none is checked yet. Story 6.1 must replace each mark before submission; the marks name a story number in public text, which the "no story numbers in public sentences" rule (Story 5.1) otherwise avoids.
- **Evidence:** `about.test.tsx` "lists every data source, each with a visible citation mark".
- **Revisit if:** Story 6.1 lists a dataset this page does not, or names one differently.
- **Before submission:** every `[pending: Story 6.1]` mark (`PENDING_CITATION` in `web/src/about/copy.ts`, shown once per source in `COPY.margin.sources`) must be replaced by the checked name, link and citation from Story 6.1. The page must not go out with the marks.

## Story 5.7: the page quotes two claims and shares the evidence chunk (15 Nov 2026)

- **Status:** TESTED. The lead approved all of Story 5.7's copy and choices on 15 Nov ("Approve all", relayed by the lead's session).
- **Decision:** The page states two results, both fixed claims quoted whole by id: `aqua-through-2021` (why real Aqua runs through 2021) and `noaa20-untested`. How C1 scored is left to the evidence page, linked three times. The claims come from `evidence.json` through the same lazy import as the evidence view, so the page shares that chunk (about 158 kB gzipped) and the calendar's bundle does not grow. If `evidence.json` lacks a claim, `client.evidence_unavailable` shows in its place.
- **Evidence:** `about.test.tsx` "quotes only the two fixed claims", "a claim missing from evidence.json…"; `npm run build` shows one evidence chunk.
- **Revisit if:** the page should load faster on phones (then the evidence build could write a small claims-only file).

## Contract 0.4.0 drafted by the lead (14 Nov 2026)

- **Status:** ASSUMED; agreed by the data owner and merged into master on 15 Nov. At the merge, three web tests' clean-up steps deleted contract keys (`notes.month_complete`, `sentences`) instead of restoring them, which only showed once 0.4.0 held those keys; they now restore the contract's value, and the tests that asserted the sentences were missing now check the contract's sentences.
- **Decision:** Contract 0.4.0, on branch `lead/contract-0.4.0`, makes five changes.
  1. `messages.yaml` gains a `sentences:` section with the seven card templates from "Story 3.7: the card's sentences wait for contract 0.4.0", unchanged.
  2. `client` gains the four refused-date sentences from Story 3.4: `date_unreadable`, `date_before_record`, `date_after_data_through`, `dates_out_of_order`.
  3. `notes` gains `range_and_reference` (Story 3.4), `month_complete` ("Complete month: every day of input data is in.", Story 3.6, approved by the lead 15 Nov) and `missing_days_to_date` ("Some days of input data are missing so far this month, so the count to date may be low."), new wording by the lead.
  3b. For Story 3.8 (approved by the lead 15 Nov): `notes.partly_inside` and five `sentences:` templates, `anomaly`, `reference_mean`, `flag_reference`, `anomaly_scale` and `cells_heading`. The anomaly sentence was reworded from 3.8's draft so a negative difference reads naturally.
  3c. For Story 3.9 (approved by the lead 15 Nov): `sentences.rankings_range`, `notes.rank_tie`, `notes.no_complete_month` and `notes.no_complete_year`. For Story 5.7 (approved 15 Nov): a top-level `counting_limits:` list of the six limits from the PRD, worded as on the about-the-data page (limit 6 says Punjab was scored as reported only). Both CSV headers now write these six as their `counting_limits` lines, replacing the three standing notes written there before, so the page and the downloads use one copy (`CSV_SPEC.md` updated).
  4. `Month.cells_flagged_strong` and `Month.cells_flagged_marginal` may be null, and are null exactly when the month is outside the record; inside it a month with no flagged cell is 0. `CurrentMonth`'s stay integers, since the current month is always inside the record.
  5. `CurrentMonth.missing_days_to_date` (boolean, required) is true when the current month has missing input days. The service serves `(year, month) in v.missing`: the month holds only days 1 to d, so this is exactly "days 1 to d have missing days".
  The web shows the card sentences (it already read an optional `sentences:` section), adds `missing_days_to_date` to the card's notes when served true, states each refused range in its sentence, and shows `range_and_reference` under the dates tab's bounds. The version is 0.4.0 in `openapi.yaml`, `messages.yaml`, the README, `CONTRACT_VERSION` and the fixtures (rebuilt with `tools/build_fixture.py`); web types regenerated.
- **Evidence:** 139 web tests (new: all seven sentences served, the headline is the contract's sentence, figures without a sentence, missing-days note only when served, refusal sentences and the range note in the dates tab); 302 Python tests passed, 10 skipped (new: null flag counts outside the record, integers inside, `missing_days_to_date` false for the test store); imports, evidence, wording and gitleaks checks pass. The analytics CSV writes the null flag counts as empty cells, which `CSV_SPEC.md` already defines as null. Not tested: `missing_days_to_date` true against a store whose current month has missing days (the test store has none).
- **Revisit if:** the data owner wants the missing-days signal per satellite or as a list of days, or wants different wording for `missing_days_to_date`; the teammate's 2.8 branch also edits `burncal/service/answers.py`, so expect a merge conflict in `calendar()` and `_card()`.

## Story 4.3: picture wording waits for the contract (15 Nov 2026)

- **Status:** ASSUMED.
- **Decision:** The picture's source line and error lines have no sentence in `messages.yaml` 0.3.0. `web/src/download/words.ts` reads optional `sentences.picture_source` and falls back to: "Source: NASA FIRMS active-fire detections (Aqua MODIS through December 2021, VIIRS converted to Aqua MODIS units from January 2022)." (`TODO(picture_source)`). The calendar title repeats the page heading's words (`TODO(picture_title)`). Two states are typed in `PictureDownload.tsx` (`TODO(picture_errors)`): "The picture could not be made. Please try again." and "Show the grid view to download the calendar picture." Everything else is a contract sentence (`notes.hotspot_definition`, `notes.record_switch`, `notes.placeholder` when `meta.placeholder`) or a served value.
- **Evidence:** `download.test.tsx`; picture checked in the browser.
- **Revisit if:** the contract adds these sentences, or the data owner words the source differently.

## Story 4.3: pictures are a styled copy of the live chart, no new dependency (15 Nov 2026)

- **Status:** ASSUMED.
- **Decision:** The file embeds a copy of the on-screen SVG with each element's computed paint and type written onto it, so the numbers are the screen's. PNG is that SVG drawn on a canvas at 2×. No library (html2canvas, dom-to-image). Which charts: the calendar and the ruler, the only SVG charts; the rankings panel is lists. The PNG relies on system fonts named in the page's font stacks, so type may differ slightly from the screen on a machine without them.
- **Revisit if:** a judge's machine renders the fonts badly, or a Tier 1 chart is added that is not SVG.

## Story 4.4: one Downloads block in the left column; three words of its own (15 Nov 2026)

- **Status:** ASSUMED. Wording approved by the lead on 15 Nov. At review the lead's session keyed the block on the area and dates, so a 413's year buttons never ask for a different area.
- **Decision:** All downloads sit in one "Downloads" block under the footnotes in the left column (UI-CONCEPT.md: "the downloads as plain links"): analytics CSV, hotspot CSV with an "All satellites" checkbox, then the calendar and ruler pictures (4.3's control, moved from under each chart). The CSV text is saved as the service sends it. A 413 shows `problems.too_large_for_sync` and one button per year in the problem's `years`; each sends the same request with `year`. Other problems show their contract sentence; a network failure shows `client.service_unreachable`. In fixture mode (no service) the two CSV buttons are disabled and a line says why, so no broken download is offered.
- **Wording with no contract sentence (TODO labels), for the lead to approve:**
  - `TODO(csv_fixture)`: "The CSV files come from the data service, which this copy of the page is not connected to."
  - `TODO(csv_busy)`: "Preparing the file…"
  - Button names "Download analytics CSV", "Download hotspot CSV", "All satellites", and the year buttons (the bare year, named "Download hotspot CSV for 2020" for screen readers). Suggested for the contract `client:` section as `csv_unavailable` and `csv_busy`.
- **Not done:** the 413's estimated size is not shown (no contract sentence for it). No "saved" message: the browser's own download bar is the success signal.
- **Revisit if:** the service's 413 offers something other than years, or the lead wants the size shown.

## Story 3.10: accessibility and phone-width pass (15 Nov 2026)

- **Status:** TESTED (script checks plus a browser look at 375 px and the default pane width; no screen reader run).
- **Blocker found:** the anomaly ramp's cool and warm sides share lightness (L* 32/30, 58/56, 80/77), so below and above the mean look alike in greyscale. Contrast of tile text is fine (at least 4.7:1).
- **Fix:** hues unchanged. A short bar marks every below-mean (cool) class, in the grid cells and the legend swatches. The table view needs none: each cell already prints the served, signed `anomaly_pct` (a table minus sign added at first doubled it; the lead's review removed it). Display only; the served class is the source (AD-8). The count ramp already passed all four simulations (minimum dE 7.6 in greyscale).
- **Polish:** header links, view switches, "Change area or dates", rankings buttons and the Downloads block (buttons, format select, checkbox) now have at least 32 px height; picker tabs take Left/Right arrows with roving tabindex; Escape closes the picker; a skip control; evidence tables carry the names of their regions.
- **Wording (TODO(skip_link)), approved by the lead on 15 Nov:** "Skip to the page content". No contract sentence exists. It is a button because the hash is the router.
- **Not fixed:** grid cells stay 18 px wide at 375 px (the table view is the phone alternative); MapLibre's own animation under reduced motion was not traced.
- **Revisit if:** a screen-reader pass finds the below-mark bar noisy, or the contract adds a skip sentence.

## Story 7.8: all-candidates table (15 Nov 2026)

- **Status:** TESTED for the numbers (the evidence check covers every cell; vitest checks each reason against its noise mark). The reason wording was approved by the lead on 15 Nov, after the lead's review checked each reason against the scores and corrected four: 1A (within noise of 4A on each measure, not behind it), M5 (the Aqua-only precision failure applies to every method, so it was dropped), 3B and M4 (plainer size words), and C1 ("The pick.").
- **What:** a collapsed table on the evidence page (expand button, scrolls inside its own region) with one row each for the 13 single approaches and C1, C2, C3 on the selection set: count error against (b) with its 95% interval and noise mark, pooled 1° flag precision and recall. All read by `evidence/build.py` into the `selection.candidates` table; no browser arithmetic.
- **Evidence:** the singles are in `selection_20261113T145716Z.json`, the combinations in `selection_20261113T151303Z.json`. The build now lists the first as a second source of the selection set (placed before the second, which stays the one the final run names). The reasons are plain words with no numbers, kept in `web/src/evidence/candidates.ts` because the frozen schema has no field for text on a row.
- **Not done:** (a), (b) and the comparator are not rows (not candidates); no by-region view of the candidates.
- **Revisit if:** the lead changes a reason, or the schema gains a row note field (the reasons could then come from the build).
## Story 8.1: shareable link (15 Nov 2026)

- **Status:** TESTED (unit tests for each round trip, the fields held and bad links; browser look at 375 px and the default pane width in fixture mode). Tier 3. Link format approved by the lead on 15 Nov, with no length limit: the part after `#` never reaches a server and browsers accept far longer, so the only risk is a chat app shortening a pasted link.
- **Decision:** the address is `#/?area=<featured id>` or `#/?shape=<geometry>`, plus `from`, `to`, `view=table` and `measure=anomaly` only when they differ from the default. The picked cell and the highlighted ranking are not in the link (the criteria name only area, dates and view). The address is rewritten with `replaceState` as the state changes, so no history entries.
- **Geometry:** `P`/`M`, polygons joined by `/`, rings by `~`, vertices by `;`, `lon,lat` in each. Coordinates are written exactly as held; the app rounds none, and rounding would change the area shared. Measured: the longest featured area is 163 characters; the corners form (5 vertices) is about 60; 100 vertices at full precision made a 3,770-character link (above 2,000).
- **Bad links:** unreadable area or unknown id shows `invalid_aoi`; a coordinate outside WGS84 shows the out-of-range sentence; unreadable or out-of-order dates, and dates outside the served record (checked once /meta loads), show the existing date sentences and load the whole record. An unknown view or measure falls back silently (no contract sentence).
- **Revisit if:** drawn or vertex-typed areas can exceed about 40 vertices (the 2,000-character mark at full precision): then cap the link (leave the area out and say so) or round to 5 decimals (about 1 m). The lead chooses; no limit is set here. Also if the lead wants a Copy link button (not built).

## Story 8.8: featured-area gallery (15 Nov 2026)

- **Status:** TESTED (unit tests for the six cards, labels, exact boundaries, the savanna caveat before opening and the link after opening; browser look at 375 px and a narrow desktop pane in fixture mode). Tier 3. Approved by the lead on 15 Nov, keeping the contract's wording rather than the word "locked".
- **Decision:** the gallery is the Featured tab of the area picker: each of the six regions is a card with a small outline, its name as the button, the contract's evidence-class sentence, and, for the southern African savanna only, the contract's `region_caveat.southern_africa` sentence (the one Story 3.6 shows), so the caveat is in view before the area is opened. Opening a card selects the area through the existing path and keeps the dates; the link then reads `area=<region_id>` (Story 8.1).
- **Boundary:** the geometry is the one in `contract/regions.geojson`, passed through unchanged (a test compares each card's opened area with the file). The outline is a display-only drawing of it (equirectangular, fitted to a 64 by 48 box).
- **Labels:** the contract's `evidence_class` sentences are used as they are, so there is no typed fallback. The plan's word "locked" is not shown: the contract's sentence for `tested_unseen` says "tested on but not tuned on". The planning record uses "locked" for those two regions, and the evidence page already says "locked regions", but no contract label does.
- **Caveat mapping:** the card caveat is tied to the region id `southern_africa`; Siberia is also `tested_unseen` but the contract has no caveat sentence for it, so it carries none.
- **Not done:** the cards show no tuning claim beyond the contract sentence; no gallery outside the picker; no check against a live store (only Sumatra has data there; other regions then show whatever the service answers, unchanged).
- **Revisit if:** the lead wants the word "locked" on the cards (needs a contract label), or a region gains its own caveat sentence.

## The lead's decisions for Stories 6.2, 6.3 and 6.5 (15 Nov 2026)

- **Status:** ASSUMED (the lead's choices; no test decides them).
- **6.3, planning files made public:** `GUARDRAILS.md` and `research/test-plan.md` are copied unchanged into `docs/planning/`. `DECISIONS.md` is copied with two sentences shortened so no line remarks on a person (listed in `docs/planning/README.md`). The lead's name stays: it is already public as the commit author and the repository owner. The pre-screen found no secret, key, local path or email in any of the three. The wording check flags three lines in them ("beats the baselines" as a section heading, and two rules that forbid the claim); these are the planning record's own words and are left as they are, and the check's default paths do not include `docs/planning/`.
- **6.2, README:** says plainly that the parity check's input case is not public, so a fresh clone serves Aqua counts through December 2021 but cannot publish converted counts. Added to the shared "Frozen inputs" section, not to the data owner's publish step on `teammate/2.8-coverage`, to avoid a merge conflict.
- **6.5, submission text:** the summary's two claims, the "impact is one public link" sentence and the project name are approved as drafted. Official dataset names and citations are used as published, even where they contain the word this project does not use; everything the project writes itself says "hotspots".
- **Still open for 6.3:** `/security-review`, a gitleaks scan of the full history, and the Codex review before the repo goes public, all run by the lead.
- **Revisit if:** a reviewer finds anything in `docs/planning/` that should not be public, or the live form limits the summary's length.

## Story 2.8 AC2: plan global history on the area API, not the country files (15 Nov)

- **Status:** ASSUMED (estimates from measured samples; the weight of a world request is not measured)
- **Decision:** Global history would come from the area API on the world extent, as the regions did, not from the country files. The country files end with 2025 (no 2026 file), have no NOAA-21, and would need a land-mask join to match the area API's extents; the area API serves every source to the present at 2 transactions per day of range, so the quota (5,000 per 10 minutes) is not the limit: the whole record is 27,818 to 37,612 transactions, about 1 hour of quota. The limits are disk and serving size: 31–54 GB of CSV and a 15–25 GB store version. No global download is made; the lead sees these numbers first (AC3).
- **Evidence:** HEAD and byte-range requests on `data/country/` (every year 2000–2025 for MODIS, 2012–2025 Suomi NPP, 2018–2025 NOAA-20; 404 for 2026 and for `viirs-jpss2`); `mapkey_status` before and after 1-day and 5-day requests over Punjab, Siberia and Southern Africa; zip ratio of five raw CSVs (16.3–17.5 bytes a row); the six-region version's bytes per row (points 11.2, whole version 36.3). Figures in `docs/handoff.md`, Story 2.8 AC2.
- **Revisit if:** a one-day world sample shows a world request weighs more than 2 transactions a day, or downloads slower than 0.6 MB/s; or the country files gain a 2026 file.

## Story 2.8, option 1: points read remotely; the re-sort did not help, concurrency did (15 Nov)

- **Status:** TESTED (counts and times from the data owner's machine); hosting ASSUMED (not yet measured on Vercel)
- **Decision:** The lead chose option 1: the service reads each version's `points.parquet` from the public store by HTTP range requests (DuckDB `httpfs`) instead of syncing it, so the start-up sync drops from 901 MB to about 9 MB for six regions. `create_app(points_location=...)` and `remote.sync(with_points=False)` do it; the host ships the `httpfs` extension in its bundle so nothing downloads at start. Remote reads run with 16 DuckDB threads. The points keep their layout (sorted by 0.25° cell key, 100,000-row groups): the trial re-sort by 1° block with 25,000-row groups is not adopted.
- **Evidence:** six-region version `20261113-d6f8b9e6`, from Singapore. "First" is the first calendar count for an area on a fresh connection, after the file is opened; opening (the footer) took 1.0–1.9 s and happens when the version loads.

| Area | Before (old layout, 2 threads) | Re-sort trial (2 threads) | Re-sort trial (16 threads) | **Adopted (old layout, 16 threads)** |
| --- | --- | --- | --- | --- |
| Tiny box, 0.06° (Sumatra) | 1.0–1.9 s | 3.9 s | 1.9 s | **1.7 s** |
| Sumatra polygon | 11.7 s | 17.8 s | 6.6 s | **5.6 s** |
| Australian grassland polygon | 20.0 s | 46.2 s | 18.0 s | **6.2 s** |
| Amazon forest polygon | 5.3 s | 18.4 s | 7.4 s | **3.0 s** |
| Southern Africa polygon | 42.4 s | 69.0 s | 12.7 s | **8.6 s** |
| Siberia polygon | 25.2 s | 26.7 s | 10.4 s | **7.4 s** |
| Punjab polygon | 9.5 s | 16.3 s | 7.2 s | **6.2 s** |
| Sumatra whole extent | 6.9 s | 13.1 s | 6.6 s | **4.1 s** |
| Australian grassland whole extent | 22.9 s | 47.2 s | 15.7 s | **9.1 s** |
| Amazon forest whole extent | 15.7 s | 30.3 s | 7.6 s | **6.1 s** |
| Southern Africa whole extent | 42.7 s | 92.0 s | 19.6 s | **9.5 s** |
| Siberia whole extent | 20.4 s | 31.2 s | 15.9 s | **10.8 s** |
| Punjab whole extent | 6.1 s | 11.1 s | 5.0 s | **3.4 s** |

  - Repeat requests: 0.3–0.7 s in every column (DuckDB keeps the fetched ranges in memory).
  - Why the re-sort lost: DuckDB 2.0 already prunes the old layout through its join filter (both layouts scan about 1.2M rows for Southern Africa's polygon), so the cost is the number of range requests, and 4× smaller row groups mean about 4× more requests, plus a 3.2 MB footer instead of 0.8 MB.
  - Threads: 32 and 64 threads gave 9.1–11.8 s on the three worst whole extents, no better than 16: the reads are now bandwidth-bound.
  - Counts: equal to the local copy in every timed case; `tools/check_numbers.py`, now over all 12 areas plus the Amazon polygon, gives 0 failures with local points (before) and with remote points (after). Every `/calendar` answer for those 13 searches is identical before and after: 0 differences over 3,900 months, counts and raw counts per satellite.
  - The tiny box shows the fixed part: about 1.7 s of any first request is round trips that no layout removes.
- **Not done:** the `/tmp` cache fallback. The worst first request is still over 10 s (Siberia's whole extent, 10.8 s), but a `/tmp` cache only speeds up repeat reads on the same instance, which are already 0.3–0.7 s; it cannot speed up the first read on a fresh instance. Held for the lead's decision.
- **Deployed and rolled back (15 Nov).** With the store pointer on the six-region version, the hosted service (Vercel sin1, code `cbe834c`) answered every area, but slowly: first requests 4.4–32.1 s (Southern Africa's whole extent 32.1 s, its polygon 31.4 s; Sumatra polygon 7.3 s), repeats 1.5–29 s, and one repeat for Siberia's whole extent failed with a 500 after 154 s. The cause, from the runtime error: Hugging Face answered `429 Too Many Requests` ("rate limit your IP"; policy 3,000 requests per 300 s per IP, anonymous). Range reads make many requests, from a shared Vercel address, so the public dataset cannot serve option 1 without a token. The pointer was set back to Sumatra (`20261113-9cedd502`) and the previous deployment promoted within minutes; checked after: `/meta` placeholder false, 20 Sumatra calendars p95 0.95 s, all 200.
- **Options now (the lead's call):** a Hugging Face token on the host (a secret, which the service does not hold today); another public object store without that limit (Cloudflare R2 or S3: a new account, possibly paid); fewer, larger range requests (bigger row groups, which this test argues against for the cold case); or option 3 (serve the regions whose points fit in `/tmp`).
- **Revisit if:** first requests from Vercel (sin1) differ from these; or a whole-extent area must meet 10 s on a cold instance, which then needs warming the instance's cache at start-up or a coarser pre-summed table for the cut cells.

## Story 6.4: the service's runtime imports are runtime dependencies (15 Nov)

- **Status:** TESTED
- **Decision:** `pyyaml` and `pydantic` are pinned runtime dependencies (6.0.3 and 2.14.3, the locked versions). Contract 0.4.0 made `burncal/service/app.py` read `messages.yaml` with `yaml`, but `pyyaml` was a dev dependency, and the host installs runtime dependencies only (`uv export --no-dev`), so the next deploy would have failed at start-up. `pydantic` was already installed through FastAPI, but the service imports it directly, so it is now declared too.
- **Evidence:** `test_6_4_every_runtime_import_of_the_service_is_a_runtime_dependency` (parses every non-test module in `burncal/service` and `burncal/core`) failed with `{'pydantic', 'yaml'}` before and passes after; full pytest 417 passed; import check passed. The fresh-clone run did not catch this, because a clone installs the dev group.
- **Revisit if:** the service gains an import; the test names it.
