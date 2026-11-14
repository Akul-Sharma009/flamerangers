# Cleaning differences: Sumatra Aqua monthly counts

## What was compared

For the four Sumatra tuning years (2014, 2016, 2017, 2020) we compared two sets of Aqua monthly fire counts per 1-degree land cell:

- the counts the research harness produced (the reference), and
- the counts from this product's cleaning step, rebuilt from the raw NASA FIRMS standard-processing files.

The comparison covers 3,600 cell-months (75 land cells, 4 years, 12 months). The reference holds 41,377 Aqua detections.

Both sides keep a detection only when it is inside the Sumatra boundary and on land (Natural Earth 1:10m land, v5.1.1). Both assign cells by the south-west corner of the 1-degree cell and months by UTC calendar month. Day or night is recomputed from the sun's position and does not change which rows are counted.

The two sides differ in how they decide that a spot is a persistent heat source (a "static" source such as a flare or industrial site). Both use the same test: a 30 arc-second cell (about 1 km) with detections on 50 or more distinct UTC days in one year. They differ in which years and satellites feed the test.

| | Harness rule (variant H) | Product rule (variant P) |
|---|---|---|
| Years used to find static cells | the four tuning years | every year from 2014 to 2021 |
| Satellites used | MODIS (Aqua and Terra), Suomi NPP | all ingested: MODIS, Suomi NPP, NOAA-20 |
| Static cells found | 17 | 125 |
| Static detections | removed | marked "static" and left out of counts |

Source files used: MODIS standard files for 2002 to 2026, Suomi NPP VIIRS standard files for 2012 to 2026, and NOAA-20 VIIRS standard files for 2018 to 2021 (the only NOAA-20 years available when this was run). Product result may change when more NOAA-20 years are added.

## Result

**Variant H (harness rule): exact match.** All 3,600 cell-months agree: 41,377 detections on both sides, zero cell-months differ, total absolute difference 0. The land layer, the region boundary, cell and month assignment and the static test are therefore reproduced exactly.

**Variant P (product rule): 13 cell-months differ.** Product counts total 41,362 against 41,377, which is 15 fewer detections (0.04 percent). The other 3,587 cell-months agree. Every difference is the product being lower by 1 or 2 detections.

## Differences and causes

All 15 detections are Aqua detections that the product marks as static and the harness keeps. No difference comes from the land edge, the region boundary or any other step. Variant H, which differs from P only in the static rule, matches exactly.

| Cell (south-west corner) | Year-month | Product minus harness | Cause |
|---|---|---|---|
| 101 E, 1 N | 2014-01 | -1 | static in P only |
| 101 E, 1 N | 2014-10 | -1 | static in P only |
| 101 E, 1 N | 2020-12 | -2 | static in P only |
| 102 E, 1 S | 2014-02 | -1 | static in P only |
| 102 E, 1 S | 2014-03 | -2 | static in P only |
| 102 E, 1 S | 2014-06 | -1 | static in P only |
| 103 E, 4 S | 2016-07 | -1 | static in P only |
| 103 E, 4 S | 2020-01 | -1 | static in P only |
| 103 E, 4 S | 2020-02 | -1 | static in P only |
| 103 E, 4 S | 2020-04 | -1 | static in P only |
| 103 E, 4 S | 2020-05 | -1 | static in P only |
| 103 E, 4 S | 2020-06 | -1 | static in P only |
| 104 E, 4 S | 2016-01 | -1 | static in P only |

"Static in P only" means a 1 km cell that the product treats as a persistent source because it had 50 or more fire days in a year the harness did not look at, or because NOAA-20 detections lifted it over 50 days. Across the 13 cell-months, 9 small cells are involved:

| Reason the cell is static under the product rule only | Cells |
|---|---|
| 50 or more fire days in a year outside the tuning years (2015, 2018 or 2019), using the same satellites as the harness | 6 |
| 50 or more fire days only once NOAA-20 detections are added (2019 or 2020) | 3 |

## What this means

The harness counts persistent-source detections that the product removes. The product's wider static test (more years, more satellites) is deliberate, so these small differences are expected and are not errors in either set of counts. They are 0.04 percent of detections and never more than 2 in one cell-month.
