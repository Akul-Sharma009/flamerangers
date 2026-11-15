# Story 2.8 AC3: one global year (2025) through the pipeline

Machine: 10 cores, 16 GB RAM. Extent (-180, -90, 180, 90). Measured numbers are marked "measured"; everything under "Estimates" is extrapolation.

## 1. Inputs (measured)

| Source | Zip | CSV members | Rows | Duplicates dropped | Raw CSV written |
| --- | --- | --- | --- | --- | --- |
| MODIS (Aqua + Terra) | modis_2025_all_countries.zip, 65 MB | 202 | 3,693,555 | 0 | MODIS_SP_2025.csv, 294 MB |
| VIIRS NOAA-20 | viirs-jpss1_2025_all_countries.zip, 329 MB | 217 | 18,376,493 | 9 (-> 18,376,484) | VIIRS_NOAA20_SP_2025.csv, 1,485 MB |
| VIIRS Suomi NPP | viirs-snpp_2025_all_countries.zip, 15.9 MB | 5 readable | 98,621 | 0 | not used |

**The Suomi NPP zip is truncated** (no end-of-central-directory record; the 6th CSV, Angola, is cut off; only 5 countries from A to Angola are readable). It looks like an incomplete download. It needs downloading again (expected about 300+ MB). I left it out of the run (98,621 rows, 5 countries).

Columns (all three): latitude, longitude, brightness (MODIS) or bright_ti4 (VIIRS), scan, track, acq_date, acq_time, satellite, instrument, confidence, version, bright_t31 (MODIS) or bright_ti5 (VIIRS), frp, daynight, type.
Differences from what `ingest.py` expects: none that stop it. `type` is present (ingest uses it when there; it is read as integer). Satellite codes are Aqua, Terra, N20 (SNPP is "N"), all mapped by `ingest.SATELLITES`. `version` is text ("61.03" MODIS, "2" VIIRS), `confidence` is a number for MODIS and a letter for VIIRS: both read as text. Rows are in country order, not date order; clean handled this. File names follow the pipeline (`MODIS_SP_2025.csv`, `VIIRS_NOAA20_SP_2025.csv`).
Country files cover land inside country borders, so they hold fewer rows than the area API (MODIS 3.69 M against the earlier 4.7 M estimate; NOAA-20 18.4 M against 21 M). Only 0.17% of rows were still flagged offshore by clean.
Zip to CSV step: MODIS 10 s, 0.86 GB peak; NOAA-20 55 s, 2.15 GB peak (about 3 s per million rows).

## 2. Pipeline steps on MODIS + NOAA-20 (measured)

| Step | Rows in | Rows out | Time | Peak memory | Output size |
| --- | --- | --- | --- | --- | --- |
| clean (build_extent.build) | 22,070,039 | 22,070,039 stored (0 NRT replaced) | 91 s | 6.4 GB | 565 MB (3 parquet files) |
| convert (convert.build) | 22,070,039 | 22,070,039 | 91 s | 7.4 GB | 562 MB |
| aggregate (aggregate.build) | 22,070,039 | 99,945 cell-months 1 deg, 590,088 cell-months 0.25 deg, 18,662,400 flag rows | 13 s | 7.4 GB | 3.8 MB |

No step failed. Caveats:
- Clean ran with `require_static_inputs=False`: the static-mask tuning years are not in a one-year sample, so no static-source exclusions happen (only "none" and "offshore" appear). A real run adds a static-mask pass over the tuning-year MODIS and Suomi NPP files (not measured).
- Convert ran with no Aqua 2003-2011 history, so the season history is empty (pooled rules; 21.6 M rows pooled, 0.47 M in the three regional rule sets). A real run adds the cost of reading that history (not measured).
- **In 2025 no row of this sample feeds the record**: `core/record.py` has Aqua feeding to 31 Dec 2021, Suomi NPP from 1 Jan 2022 to 2 Nov 2026, and NOAA-20 only from 3 Nov 2026. So convert did no C1 work (rows feeding: 0) and the first convert time is a lower bound.

## 3. Proxy run with C1 work (measured)

To measure the C1 cost, I relabelled the NOAA-20 rows as Suomi NPP (code "N") in a temporary copy (deleted afterwards) and ran clean, convert and aggregate on that alone (18,376,484 rows):

| Step | Time | Peak memory | Output |
| --- | --- | --- | --- |
| clean | 77 s | 6.6 GB | 469 MB |
| convert (18,345,009 rows feed, weight sum 2.66 M Aqua-equivalent hotspots) | 192 s | 6.4 GB | 577 MB |
| aggregate | 13 s | 6.0 GB | 8.5 MB; flags include 24,550 "strong" cells |

So feeding VIIRS convert costs about 10.4 s per million rows, against 4.1 s per million rows when nothing feeds. Aggregate time and memory are set mostly by the fixed 18.7 M flag rows (64,800 cells x 288 months), not by hotspot count.

## 4. Estimates (extrapolation, not measured)

Assumptions: MODIS 4.7 M rows a year for 23.5 years (July 2002 to Dec 2025); each VIIRS satellite 21 M a year; Suomi NPP 2012-2025 (14 years); NOAA-20 2022-2025 (4 years); per-row costs from this sample (raw CSV 81 bytes, clean 25.5 bytes, record 23 bytes for MODIS and 31 bytes for VIIRS, clean 4.1 s per million rows, convert 4.1 s per million rows without C1 and 10.4 s with C1, zip to CSV 3 s per million rows); one process, one satellite-year at a time; this machine.

| Item | Estimate |
| --- | --- |
| Rows: MODIS / Suomi NPP / NOAA-20 / total | 110 M / 294 M / 84 M / about 490 M (about 420 M if the country-file row counts hold) |
| Raw CSV on disk | about 39 GB (the zips: about 9 GB, compression 4.5 times) |
| Clean store | about 12 GB |
| Record store | about 14 GB |
| One published version (grids) | about 50-100 MB (this year: 4-9 MB; 0.25 deg cells grow with years) |
| Time: zip to CSV | about 24 min |
| Time: clean | about 33 min (+ static mask pass, a few min) |
| Time: convert | about 42 min (MODIS 8 + Suomi NPP 2012-2021 non-feeding 14 + Suomi NPP 2022-2025 with C1 15 + NOAA-20 6), + season history read |
| Time: aggregate | about 5 min |
| Total compute | about 1 h 45 min, one machine, one process; download time not included |
| Peak memory | about 7.5-8.5 GB for a 21 M-row satellite-year (16 GB machine) |

Notes for the decision:
- Disk is the constraint. Whole-history raw + clean + record is about 65 GB at once; free disk is 12-17 GB (it moved while I worked). It only works with years done in sequence (the `years` argument exists on clean and convert), raw CSV deleted after each year is cleaned, and clean deleted after its year is converted. The record store (about 14 GB) alone is close to the free space.
- NOAA-20 2022-2025 does not feed the record under the current rules (feeds from 3 Nov 2026 only), so a world run can leave it out: about 84 M rows, 17% of the total, 7 GB raw+clean+record saved, about 13 min.
- Suomi NPP 2012-2021 does not feed the record either (only needed if the 1-degree thresholds history needs it; check `thresholds_1deg`): leaving it out would take out 210 M rows, about 43% of the rows. I did not check whether the thresholds use it.
- Terra is stored but never feeds; the MODIS zip carries it (about 29% of MODIS rows).
- Not measured: download time, the static-mask pass, the Aqua season history, publishing and the CSV exports the service writes.

## 5. Disk and files

Free disk: 12 GB at the start (first `df`; it read 20 GB soon after because other writes were going on), 17 GB at the end. Not under 8 GB, so `raw`, `clean` and `record` were kept (about 2.3 GB: raw 1.8 GB, clean 0.57 GB, record 0.56 GB; the proxy copies were deleted). Delete them with `rm -r` on those three folders. Kept: `grids` (3.8 MB), `grids2` (8.5 MB, the proxy run), this report.
Scripts and outputs were kept on the data owner's machine only (not committed): the zip-to-CSV, clean, convert and aggregate steps, and the proxy run.
