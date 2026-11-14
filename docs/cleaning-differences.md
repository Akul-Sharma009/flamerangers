# Cleaning differences: Sumatra Aqua monthly counts

## What was compared

For the four Sumatra tuning years (2014, 2016, 2017, 2020) we compared Aqua monthly hotspot counts per 1-degree land cell:

- the counts the research harness produced (the reference), and
- the counts from this product's cleaning step, rebuilt from the raw NASA FIRMS standard-processing files.

The comparison covers 3,600 cell-months (75 land cells, 4 years, 12 months). The reference holds 41,377 Aqua detections.

Both sides keep a detection only when it is inside the Sumatra boundary, on land (Natural Earth 1:10m land, v5.1.1) and not in a static cell. Both assign cells by the south-west corner of the 1-degree cell and months by UTC calendar month. Day or night is recomputed from the sun's position and does not change which rows are counted.

## The static rule

A 30 arc-second cell (about 1 km) is static, a persistent heat source such as a flare or industrial site, when it has detections on 50 or more distinct UTC days in one year. The product uses the rule the harness was scored with:

| | Harness (variant H) | Product (variant P) |
|---|---|---|
| Years used to find static cells | 2014, 2016, 2017, 2020 | 2014, 2016, 2017, 2020 |
| Satellites used | MODIS (Aqua and Terra), Suomi NPP | MODIS (Aqua and Terra), Suomi NPP |
| Rows used | on land, inside the region | on land, anywhere in the build extent |
| Static detections | removed | marked "static", kept, left out of counts |

The only difference is that the product has no region boundary when it finds static cells, so it looks at the whole build extent (Sumatra's bounding box). This finds 32 static cells against the harness's 17; the 15 extra cells are outside the Sumatra boundary and hold no counted Aqua detection.

## Result

**Exact match for both variants.** All 3,600 cell-months agree: 41,377 detections on both sides, zero cell-months differ, total absolute difference 0. Every Aqua detection inside the region is counted the same way by both rules.

## Earlier product rule (not used)

The first product rule used every year from 2014 to 2021 and every ingested satellite. It gave 15 fewer detections (0.04 percent) in 13 cell-months, from 9 small cells that reached 50 days in a non-tuning year or only once NOAA-20 detections were added. The scored rule was chosen instead, so the published record is cleaned the way C1 was scored.

Rerun: `uv run python -m burncal.pipeline.compare_tuning`.
