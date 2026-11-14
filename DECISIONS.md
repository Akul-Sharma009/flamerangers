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
## Stub CSV columns before the CSV spec exists (14 Nov)

- **Status:** ASSUMED
- **Decision:** Until `contract/CSV_SPEC.md` is written (Story 1.2), the stub's `/hotspots.csv` uses the keys of `contract/fixture/hotspot_rows.json` as columns, and `/analytics.csv` writes one line per fixture calendar month with that month's top-level scalar fields. A `null` is an empty cell, never `0`.
- **Evidence:** Story 1.3 needs every contract endpoint to answer; the contract has no CSV column list yet.
- **Revisit if:** `CSV_SPEC.md` is agreed. The stub then follows it.

## Service CORS origins (14 Nov)

- **Status:** ASSUMED
- **Decision:** The service allows the one origin in the `WEB_ORIGIN` environment variable (not a secret), plus `localhost` and `127.0.0.1` on any port. GET only.
- **Evidence:** Story 1.3 AC3. Tests `test_1_3_ac3_*` in `burncal/service/test_service.py`.
- **Revisit if:** the web is served from more than one origin.
