# CSV specification

Both CSVs are UTF-8, comma-separated, with a header block, then one line of column names, then the rows. The service builds them from the same objects it returns as JSON, so every number equals the one `/calendar` serves.

## Header block

Every line starts with `# `. Lines appear in this order; `key: value` on each.

| Key | Value | In |
| --- | --- | --- |
| `title` | "Harmonized burning activity calendar: monthly analytics" or "...: hotspots" | both |
| `aoi_id`, `aoi_name`, `aoi_area_km2` | From the `/calendar` answer. `aoi_name` is empty when none was sent. | both |
| `aoi_geometry` | The area as GeoJSON on one line | both |
| `date_range` | `start` to `end`, as requested | both |
| `record_version`, `data_through` | As served | both |
| `record_switch` | "Aqua MODIS counts through 2021-12; converted VIIRS counts from 2022-01" (dates from `/meta`) | both |
| `count_unit` | `unit_label` from `/meta` | both |
| `reference_period` | Start and end year | analytics |
| `flag_reference_years` | Start and end year | analytics |
| `row_filter` | "rows that feed the record" or "all satellites" | hotspots |
| `row_count_note` | "After December 2021 the number of rows differs from the harmonized count. The `weight` column sums to the harmonized count over rows where `feeds_record` is true and `excluded_reason` is none." | hotspots |
| `counting_limits` | One line per limit, from the about-the-data text | both |
| `citation` | One line per dataset used | both |

## `/analytics.csv`: one row per month

Months are the same ones `/calendar` returns, in order. An empty cell means `null`. `0` means no hotspots.

| Column | From `/calendar` |
| --- | --- |
| `aoi_id` | `aoi.aoi_id` |
| `year`, `month` | From `months[].month` |
| `harmonized_count` | `count` |
| `null_reason` | `null_reason` |
| `source` | `source` |
| `raw_aqua`, `raw_terra`, `raw_snpp`, `raw_noaa20`, `raw_noaa21` | `raw.*` |
| `inputs` | `inputs`, written as `SATELLITE:QUALITY:days` joined by `;`, with `*` after each one that feeds the record |
| `complete` | `complete` |
| `partial_reasons` | `partial_reasons`, joined by `;` |
| `validated_satellite` | `validated_satellite` |
| `historical_median` | `median` |
| `reference_mean` | `reference_mean` |
| `ratio_to_median` | `ratio_to_median` |
| `anomaly_count`, `anomaly_pct` | `anomaly_count`, `anomaly_pct` |
| `cells_flagged_strong`, `cells_flagged_marginal`, `cells_total` | The same fields |
| `reference_year`, `provisional` | The same fields |
| `rank` | `rank` |

## `/hotspots.csv`: one row per hotspot

Rows are inside the area and inside the exact dates requested. By default only rows that feed the record are returned; `all_satellites: true` returns every satellite's rows. Rows are never dropped by cleaning: an excluded row is returned with its reason and a weight of 0.

Columns are the properties of `HotspotRow` in `openapi.yaml`, in this order:

| Column | Meaning |
| --- | --- |
| `latitude`, `longitude` | Degrees, WGS84 |
| `acq_datetime_utc` | Acquisition time, ISO 8601, UTC |
| `satellite` | `AQUA`, `TERRA`, `SNPP`, `NOAA20` or `NOAA21` |
| `instrument` | `MODIS` or `VIIRS` |
| `confidence` | As FIRMS gives it: 0 to 100 for MODIS; `l`, `n` or `h` for VIIRS. Not used as a filter. |
| `frp` | Fire radiative power in MW, as FIRMS gives it |
| `daynight` | `D` or `N`, recomputed from solar zenith angle |
| `type` | FIRMS inferred hot spot type; empty for near-real-time rows |
| `quality` | `SP` or `NRT` |
| `feeds_record` | Whether this satellite feeds the record on this date |
| `excluded_reason` | `none`, `offshore` or `static` |
| `weight` | The row's contribution to the harmonized count, unrounded |

## Large hotspot downloads

When the file would be large, the service answers `413` with code `too_large_for_sync`, the estimated rows and megabytes, and the list of years. The web shows the estimate and requests one year at a time with the `year` field. No search is refused.
