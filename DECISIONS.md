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
