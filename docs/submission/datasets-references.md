# NASA datasets and references (Story 6.1 draft)

Drafted by the data owner for the lead to review. Fields 7 and 8 below are ready to paste into the submission form, and the last section gives the text for the about page's four data sources (`COPY.margin.sources` in `web/src/about/copy.ts`).

**How each item was checked (15 Nov 2026).** Each DOI was resolved at doi.org, and the landing page it led to was checked against the product. Paper titles, authors, journals and pages come from Crossref. The FIRMS acknowledgement is quoted from the FIRMS tools page. The Natural Earth licence is quoted from its terms of use. Library versions and licences are read from the installed packages, at the versions this repo pins. Anything that could not be checked against its source is marked `[unverified]`.

## Field 7: NASA data

<!-- field:nasa-data -->
**MODIS Collection 6.1 active fire hotspots (Aqua and Terra), from NASA FIRMS.** Standard-quality monthly files (MCD14ML), DOI [10.5067/FIRMS/MODIS/MCD14ML](https://doi.org/10.5067/FIRMS/MODIS/MCD14ML). Near-real-time files (MCD14DL), DOI [10.5067/FIRMS/MODIS/MCD14DL.NRT.0061](https://doi.org/10.5067/FIRMS/MODIS/MCD14DL.NRT.0061). Aqua's hotspots are the record from July 2002 to December 2021, and every converted count is in Aqua units. Terra's hotspots are in the hotspot download but are not counted.

**VIIRS 375 m active fire hotspots (Suomi NPP and NOAA-20), from NASA FIRMS.** Suomi NPP near-real-time (VNP14IMGTDL_NRT), DOI [10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002](https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002). NOAA-20 near-real-time (VJ114IMGTDL_NRT), DOI [10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002](https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002). Standard-quality monthly files for both satellites (Suomi NPP VNP14IMGTML, NOAA-20 VJ114IMGTML) come from the [FIRMS archive download](https://firms.modaps.eosdis.nasa.gov/download/) `[unverified: FIRMS gives no DOI for the standard VIIRS archive on its download, tools or FAQ pages]`. From January 2022, Suomi NPP's hotspots (and NOAA-20's after Suomi NPP stopped on 2 November 2026) are converted to Aqua-equivalent counts by the frozen method C1. The MODIS and Suomi NPP standard files for 2014, 2016, 2017 and 2020 also find fixed heat sources such as gas flares, whose hotspots are left out of every count.

**VIIRS/NPP Active Fires 6-Min L2 Swath 375 m, version 2 (VNP14IMG), from NASA LP DAAC.** DOI [10.5067/VIIRS/VNP14IMG.002](https://doi.org/10.5067/VIIRS/VNP14IMG.002). C1 was fitted on a sample of these swath files from 2014, 2016, 2017 and 2020: 688 granules over the three tuning regions. They give each Suomi NPP hotspot's real view angle and pixel area, which the detection-model half of C1 uses to say how likely Aqua was to see the same heat. The site does not read these files. Their effect is fixed in C1's frozen parameters.

All hotspots are read through FIRMS (https://www.earthdata.nasa.gov/data/tools/firms). Acknowledgement, as FIRMS asks: "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) and NASA's Earth Science Data and Information System (ESDIS)." `[unverified: assembled from three quoted parts of the FIRMS tools page; check the joins against the page]`
<!-- /field:nasa-data -->

## Field 8: References

<!-- field:references -->
**Datasets**
- NASA FIRMS, MODIS Collection 6.1 active fire hotspots, standard (MCD14ML): https://doi.org/10.5067/FIRMS/MODIS/MCD14ML
- NASA FIRMS, MODIS Collection 6.1 active fire hotspots, near real time (MCD14DL): https://doi.org/10.5067/FIRMS/MODIS/MCD14DL.NRT.0061
- NASA FIRMS, VIIRS 375 m Suomi NPP active fire hotspots, near real time (VNP14IMGTDL_NRT): https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002
- NASA FIRMS, VIIRS 375 m NOAA-20 active fire hotspots, near real time (VJ114IMGTDL_NRT): https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002
- NASA FIRMS, VIIRS 375 m Suomi NPP and NOAA-20 standard archive (VNP14IMGTML, VJ114IMGTML): https://firms.modaps.eosdis.nasa.gov/download/ `[unverified: no DOI found]`
- NASA LP DAAC, VIIRS/NPP Active Fires 6-Min L2 Swath 375 m V002 (VNP14IMG): https://doi.org/10.5067/VIIRS/VNP14IMG.002
- Natural Earth, 1:10m land, version 5.1.1 (public domain; "Made with Natural Earth."): https://www.naturalearthdata.com/ (file used: https://github.com/nvkelso/natural-earth-vector, tag v5.1.1, `geojson/ne_10m_land.geojson`)
- world-atlas 2.0.2 (Natural Earth land outlines as TopoJSON, for the web map): https://github.com/topojson/world-atlas
- Natural Earth, 1:10m Admin 0 – Countries and Admin 1 – States, Provinces, version 5.1.2 (public domain; "Made with Natural Earth."), simplified for the country and province picker: https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson

**Papers**
- Koplitz, S. N., Mickley, L. J., Marlier, M. E., Buonocore, J. J., Kim, P. S., Liu, T., Sulprizio, M. P., DeFries, R. S., Jacob, D. J., Schwartz, J., Pongsiri, M., Myers, S. S. (2016). Public health impacts of the severe haze in Equatorial Asia in September–October 2015: demonstration of a new framework for informing fire management strategies to reduce downwind smoke exposure. Environmental Research Letters 11(9), 094023. https://doi.org/10.1088/1748-9326/11/9/094023 (cited for the haze sentence: its abstract names fires in Sumatra and Kalimantan and models the smoke reaching Indonesia, Malaysia and Singapore)
- Giglio, L., Schroeder, W., Justice, C. O. (2016). The collection 6 MODIS active fire detection algorithm and fire products. Remote Sensing of Environment 178, 31–41. https://doi.org/10.1016/j.rse.2016.02.054
- Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. A. (2014). The New VIIRS 375 m active fire detection data product: Algorithm description and initial assessment. Remote Sensing of Environment 143, 85–96. https://doi.org/10.1016/j.rse.2013.12.008
- Mann, H. B. (1945). Nonparametric tests against trend. Econometrica 13(3), 245–259. https://doi.org/10.2307/1907187
- Kendall, M. G. (1938). A new measure of rank correlation. Biometrika 30(1/2), 81–93. https://doi.org/10.2307/2332226
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association 63(324), 1379–1389. https://doi.org/10.1080/01621459.1968.10480934

**Services and pages named in the text**
- NASA FIRMS: https://www.earthdata.nasa.gov/data/tools/firms
- NASA Worldview: https://worldview.earthdata.nasa.gov/
- GWIS, Global Wildfire Information System (GEO and Copernicus): https://gwis.jrc.ec.europa.eu/
- INPE Programa Queimadas: https://terrabrasilis.dpi.inpe.br/queimadas/portal/ `[unverified: the page that states the single reference satellite, Aqua, was not found]`
- Singapore's transboundary haze: National Environment Agency, https://www.haze.gov.sg/ and its FAQ, https://www.nea.gov.sg/our-services/pollution-control/air-pollution/faqs ("Transboundary haze affecting Singapore mainly arises from forest and peat fires in the region."). Neither page names Sumatra; Koplitz et al. (2016) above does.

**Open-source software** (version as pinned, licence)
- Python 3.14 and uv
- FastAPI 0.162.7 (MIT), https://github.com/fastapi/fastapi
- Uvicorn 0.54.0 (BSD-3-Clause), https://uvicorn.dev
- DuckDB 2.0.0 (MIT), https://duckdb.org
- PyArrow 26.0.1 (Apache-2.0), https://arrow.apache.org
- Shapely 2.2.0 (BSD-3-Clause), https://shapely.readthedocs.io
- NumPy 2.5.4 (BSD-3-Clause and others), https://numpy.org
- pandas 3.1.1 (BSD-3-Clause), https://pandas.pydata.org
- PyYAML 6.0.3 (MIT), https://pyyaml.org
- pytest 9.2.0 (MIT), httpx 0.28.1 (BSD-3-Clause), jsonschema 4.26.0 (MIT), for tests
- React 19.3.1 (MIT), https://github.com/react/react
- D3 7.9.2 (ISC), https://github.com/d3/d3
- MapLibre GL JS 6.18.0 (BSD-3-Clause), https://github.com/maplibre/maplibre-gl-js
- Terra Draw 1.39.0 and its MapLibre adapter 1.5.0 (MIT), https://github.com/JamesLMilner/terra-draw
- topojson-client 3.1.0 (ISC), https://github.com/topojson/topojson-client
- TypeScript 7.0.2 (Apache-2.0), Vite 8.3.8 (MIT), Vitest 5.1.0 (MIT), Playwright 1.65.0 (Apache-2.0)
- gitleaks, for secret scanning, https://github.com/gitleaks/gitleaks
- Hosting: Vercel (service); the store is a public Hugging Face dataset
<!-- /field:references -->

## The about page's four data sources

Text to replace each `[pending: Story 6.1]` mark (`COPY.margin.sources`):

| id | Link | Citation |
| --- | --- | --- |
| `modis` | https://doi.org/10.5067/FIRMS/MODIS/MCD14ML (standard), https://doi.org/10.5067/FIRMS/MODIS/MCD14DL.NRT.0061 (near real time) | NASA FIRMS, MODIS Collection 6.1 active fire hotspots (MCD14ML, MCD14DL) |
| `viirs` | https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002 (Suomi NPP), https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002 (NOAA-20), standard archive at https://firms.modaps.eosdis.nasa.gov/download/ | NASA FIRMS, VIIRS 375 m active fire hotspots (VNP14IMGTDL_NRT, VJ114IMGTDL_NRT, VNP14IMGTML, VJ114IMGTML) |
| `viirs-swath` | https://doi.org/10.5067/VIIRS/VNP14IMG.002 | NASA LP DAAC, VIIRS/NPP Active Fires 6-Min L2 Swath 375 m V002 (VNP14IMG) |
| `natural-earth` | https://www.naturalearthdata.com/ | Made with Natural Earth (1:10m land, v5.1.1; public domain) |

## For the lead

- **NOAA-21 is listed on the about page but is not in the record.** The current download plan takes MODIS, Suomi NPP and NOAA-20 only, so no NOAA-21 hotspot is in any published version. Drop `NOAA21` from the `viirs` source's satellites, or say it is not used.
- **The `[unverified]` marks above stay** until someone finds the source: a DOI for the standard VIIRS archive and INPE's reference-satellite page. The submission's haze sentence (field "summary") cites Koplitz et al. (2016), checked on 15 Nov at Crossref and on the publisher's page.
- **Suomi NPP stopped on 2 November 2026** (FIRMS download page and the VNP14IMG catalogue page). The record already switches to NOAA-20 from 3 November.
