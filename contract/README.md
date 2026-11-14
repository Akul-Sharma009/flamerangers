# Contract

The only interface between the data side and the web. Version 0.3.0, **frozen on 14 Nov 2026** (0.3.0 added sentences to `messages.yaml` only). A change needs both owners and a version bump.

| File | What it is |
| --- | --- |
| `openapi.yaml` | Every endpoint, request and response |
| `fixture/` | Placeholder answers that validate against the contract |
| `messages.yaml` | The sentence for every problem code, caution, label and standing note, and for the states the web finds itself (`client`) |
| `regions.geojson` | The six evaluated regions, which are also the featured areas |
| `CSV_SPEC.md` | Columns and header block of the two CSV downloads |
| `evidence.schema.json` | Shape of `evidence.json`, which the evidence build writes |
| `test_contract.py` | Checks all of the above against each other |

## Fixtures

Every number in `fixture/` is invented. `/meta` says `placeholder: true` and the web shows a banner while it does.

- `meta.json`, `calendar.json`, `cells.json`, `hotspot_rows.json`: Sumatra. `calendar.json` is the default search (July 2002 to the data-through date) and `cells.json` is September 2015.
- `problems/`: one answer per problem code.
- `examples/`: states Sumatra cannot show (a very small area, an area outside the tuning regions, every flag state, the NOAA-20 comparison once it has run). They assume a store with wider coverage than the Sumatra fixture.

The fixtures are generated: `uv run python tools/build_fixture.py`. Edit that script, not the JSON.

## Rules the contract carries

- Every number the web shows is a served field. The web formats and draws; it never sums, ranks, averages, rounds or compares.
- Counts are rounded to 1 decimal and ratios to 2, once, by the service.
- `null` means outside the record or not loaded. `0` means no hotspots.
- A calendar cell is always a whole month. A date range that cuts a month only labels it.
- Two periods are served separately: `reference_period` (medians, means, anomalies) and `flag_reference_years` (flag thresholds).
- Every request except `GET /meta` carries the `record_version` from `/meta`. If it is out of date the answer is `410 version_superseded`.

## Checks

    uv run pytest contract
