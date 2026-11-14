# Handoff

Short running status for the next session. Facts only; decisions and their status are in `DECISIONS.md`, story status in `sprint-status.yaml`.

Updated: Sat 14 Nov 2026, afternoon SGT (Story 1.5).

## Where things stand

| Story | Status | Notes |
| --- | --- | --- |
| 1.1 Repo scaffold | Done | Reviewed by the lead |
| 1.2 Contract and fixture | Done | Contract 0.2.0 is frozen (14 Nov). A change needs both owners and a version bump. |
| 1.4 UI concept | Done | `UI-CONCEPT.md` in the planning record |
| 1.3 Service stub | Not started in this repo | The host measurements for the Sat 12:00 checkpoint are not in yet |
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

## Story 2.2: C1 in core (branch `teammate/2.2-c1-core`)

- `burncal/core/c1.py` rebuilds C1 from `burncal/core/params/c1_params.json` alone: the 4A table per row, the 1A view angle, footprints, logistic and miss term, and the season blend. Numpy only; it reads no clock, network or other file.
- Row weight = (1 − w) × r4A, plus w × (k × p + miss) on the row that anchors its 1A footprint. Excluded rows form no footprint and weigh 0.
- **Parity, Sumatra September 2015 (the exported case):**

| Method | 1° max abs miss | 0.25° max abs miss | Region-month total |
| --- | --- | --- | --- |
| 4A | 2.9e-10 | 3.1e-11 | 11,656.6 |
| 1A | 4.5e-13 | 8.5e-14 | 11,536.7 |
| C1 | 1.5e-10 | 5.2e-11 | 11,572.7 |

  All are within the 1e-6 tolerance. Footprints, anchors and view angles also match the harness row for row.
- **Not yet checked:** the other 23 months, and Australian grassland and Amazon forest for 2015 and 2018. Their input records are held-out inputs kept outside this repo; how to check them is the lead's call.
- The parity case is never copied here. To run those tests, set `BURNCAL_PARITY_CASE_DIR` to the planning record's `exports/c1/out/intermediate` folder; without it they are skipped.
- Open: C1 for a region outside the three tuning regions needs that region's fire-season months, from its 2003–2011 Aqua history (`predict_rules.unseen_region`). `blend_weight` raises for such a region until that history exists (Story 2.4/2.5).
- Checks: `uv run pytest` 51 passed, 9 skipped (no case path); with the case path, all 12 Story 2.2 tests pass. Import check passed.

| Criterion | Test |
| --- | --- |
| AC1 parity within 1e-6 at 1° and 0.25° for 4A, 1A, C1 | `test_2_2_ac1_parity_sumatra_201509[*]` (6 cases), `..._footprints_match_the_harness`, `..._view_angle_matches_the_harness` |
| AC2 only feeding, non-excluded rows form footprints; 1A term on the anchor | `test_2_2_ac2_excluded_rows_form_no_footprints_and_weigh_nothing` |
| AC3 weight formula; weights sum to the gridded prediction | `test_2_2_ac3_row_weight_formula`, `..._weights_of_a_region_month_sum_to_the_gridded_prediction` |
| AC4 imports nothing from tests; reads only the parameter file | `test_2_2_ac4_c1_imports_no_tests_and_reads_only_the_param_file`, `tools/check_imports.py` |
| AC5 Sat 18:00 checkpoint report | This entry |

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
