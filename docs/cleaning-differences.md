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

## September 2006 at 105°E 6°S: two hotspots on a small island

The one Sumatra threshold miss (September at 105°E 6°S: 21.0 against 20.6) comes from September 2006, where the product has 41 Aqua hotspots in that cell and the harness history has 39.

What the product's 41 rows are (checked 15 Nov 2026, from the area-API file `MODIS_SP_2006.csv`):

- All 41 are kept by cleaning: daytime, `type` 0, version 6.03, none static, none offshore.
- All 41 fall in September by UTC time and by the FIRMS date, so no row moves month. The nearest row to a month edge is on 2 September.
- None lies within 0.01° of a cell edge, so no row moves cell. There are no duplicate rows.
- **Two rows lie on a small island** of about 0.002 deg² (about 25 km²) at 105.49°E 5.94°S, in the Sunda Strait north-east of Krakatau. The island's name (probably Sebesi) is not confirmed. Every other row is on the main Sumatra coast or inland, at least 1 km from the coastline.

41 − 2 = 39, the harness's count. The harness read the FIRMS country archive file for Indonesia, which is cut to a country outline. The product reads the area API, which returns every hotspot inside the box. The likeliest cause is that the country file's Indonesia outline leaves out this island, so its two hotspots never reached the harness. Not confirmed: the harness's country file is not on the data owner's machine, so the two rows could not be matched one by one.

Effect: none on any published number except this one threshold. The two hotspots are real land hotspots by the product's rule (Natural Earth 1:10m land holds the island), so the product keeps them. Every other Sumatra cell-month of 2003–2011 matches the harness history exactly.

To confirm: download the FIRMS country archive file for Indonesia, MODIS 2006 (no key), and check that it lacks these two rows (2006 September, 105.4897°E 5.9377°S and 105.4986°E 5.9365°S).

## Australian grassland at 136°E 16°S: island hotspots again likely

The five Australian threshold misses are all in the cell 136–137°E, 16–15°S, in months 1, 2, 10, 11 and 12, with the product higher (for example 88.2 against 87.0 in October). Earlier notes called this the McArthur River mine cell; the mine (about 16.4°S) is in the cell below, and no row in this cell is static.

What the product's kept Aqua rows of 2003–2011 in this cell show (checked 15 Nov 2026):

| Month | Rows | On small islands | Within 2 km of the mainland coast |
| --- | --- | --- | --- |
| 1 | 5 | 4 | 0 |
| 2 | 3 | 3 | 0 |
| 10 | 435 | 41 | 0 |
| 11 | 285 | 13 | 1 |
| 12 | 36 | 8 | 1 |
| 5–9 (no miss) | 48–836 | 5–84 | 0–5 |

The islands (five land polygons of 0.0004 to 0.022 deg² in Natural Earth 1:10m) lie off the mainland in the Gulf of Carpentaria, likely the Sir Edward Pellew Group (not confirmed). In January and February nearly every hotspot in the cell is on an island. If the harness's Australia country file leaves out these islands, as the Sumatra case suggests, the harness history is lower in exactly the months where island hotspots weigh most. This is consistent with the misses but not proven: months 5–9 also hold island hotspots and match, which may be because their thresholds are set by much larger mainland counts. Not confirmed without the harness's country file.

Effect: none on any count; only these five thresholds differ, by about 1 hotspot.
