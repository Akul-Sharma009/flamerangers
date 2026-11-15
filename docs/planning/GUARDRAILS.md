# Guardrails: Harmonized burning activity calendar (NASA Space Apps 2026)

Read this with the brief. It defines what any solution will be measured against.
It deliberately contains no solution approaches.

## Problem
Satellites have tracked active fire hotspots for over two decades, but the record is split across MODIS and VIIRS, whose data cannot be compared directly. Fire managers lack a consistent picture of when and where burning occurred. The challenge asks for a web application with a harmonized burning activity calendar, early 2000s to present, for a selected area and date range, in which the sensor of origin no longer matters.

## Incumbent
- GWIS Country Profiles: closest match. Fire history at national and sub-national level, with thermal anomalies from NASA FIRMS. Sources disagree on date coverage (2002–2019 vs 2002–2024), so check the live app.
- NASA FIRMS: distributes the sensors' records separately.
- INPE Queimadas: reads trends from one reference satellite and one overpass time: NOAA-12 for 1998–2002, then Aqua MODIS. Other satellites stay out of the trend series. Its FAQ says the NOAA-12 to Aqua change caused a break in counts. It planned to move to Suomi NPP when Aqua stops, with no published method. Whether that plan changed after Suomi NPP ended was not found.

## Dumb baseline
A solution must beat (a) and (b), and must not be worse than (c):
- (a) Raw splice: MODIS counts until VIIRS starts, raw VIIRS counts after.
- (b) One global scale factor applied to every region and month.
- (c) Aqua only: the single-satellite rule INPE uses. It can only be scored on past data, because it ends when Aqua does.

**Truth.** Aqua is truth for every comparison except those against (c), because (c) is Aqua itself and would score perfectly. Against (c), Terra is the referee. Terra shares Aqua's instrument, so this still favours (c). That is why (c) is tested for non-inferiority, not beaten.

**Non-inferiority against (c),** scored against Terra:
- Flag precision and month-ranking Spearman correlation are each no more than 0.05 below (c)'s, with the 95% interval for each difference staying above −0.05.
- Peak month and season length are not worse beyond noise.
- Approaches that use Terra as an input are refitted without it for this comparison.
- (c) is still reported in full, including where it wins.

## Metrics
- Recognized: error and bias on held-out overlap months, reported per region. The domain research found no field standard for harmonizing these records, so this stays as standard practice without a field source.
- Seasonal agreement: month of peak burning and fire season length per region, the measures Giglio et al. 2006 used to compare Terra with Aqua. This is a published measure that suits a calendar.
- Failure cost: precision of anomaly flags, because a false "unusual month" misleads emergency managers. Also report whether the top months and years keep their ranking, since the brief asks exactly that.
- Timeliness: not a forecasting system as briefed, so report data freshness of the current month rather than lead time.

Report every score at more than one spatial scale, because the MODIS and VIIRS relationship changes with scale. Report early and late overlap years separately, so drift shows up. The early and late split is this project's choice, not a published practice.

Head-to-head rule: the incumbent, the baselines and the solution are scored on the same data with the same metrics.

## Selection rule
Fixed before any comparison is run. See "Choosing between approaches" in the global CLAUDE.md. The values below are ASSUMED in DECISIONS.md, and no pick has been made yet.

Criteria that matter, in priority order:
1. Error and bias on held-out months
2. Precision of anomaly flags, and ranking of top months and years
3. Seasonal agreement

Timeliness is reported but does not decide the pick. Aqua only is left out of criterion 1, as stated under the baselines.

Margin a combination must beat the best single approach by, on the final set:
- At least 5% lower error on criterion 1, taken as the median across regions
- A 95% block bootstrap interval for that difference, using the noise test below, that excludes zero
- Precision of anomaly flags no more than 0.05 lower

If it misses any of these, the simpler approach wins. The same bootstrap decides whether a single approach is a clear winner beyond noise.

Tie-breaks for two single approaches within noise, in order:
1. The remaining criteria above
2. More known traps handled, as judged by a blind reviewer from method text only, before any scores exist
3. Easier to defend scientifically
4. Simpler

Noise test, used for every "beyond noise" call:
- **Blocks:** 5° tiles × year. Tiles align to multiples of 5° and keep only land inside the region. A tile with fewer than 5 land 1° cells joins the adjacent tile in the same region that shares its longest edge.
- **Resampling:** stratified by region, so each draw resamples tile-years within each region and no region drops out. Both approaches use the same draws.
- **Size:** about 30 blocks in the selection set, compared with 6 if whole region-years were used. Neighbouring tiles are not fully independent, so intervals may be somewhat too narrow. Say so when reporting a close call.

Data, all at monthly level:

| Set | Regions | Years | Use |
|---|---|---|---|
| Tuning | Sumatra, Australian grassland, Amazon forest | 2014, 2016, 2017, 2020 | Fitting and adjusting candidates |
| Selection | Same three regions | 2015, 2018 | Head-to-head comparison and designing combinations |
| Final (locked) | Same three regions | 2019, 2021 | The final pick, used once |
| Final (locked) | Southern African savanna, Siberian boreal forest | 2014–2021 | The final pick, used once |
| Reported only | All five regions | 2012–2013 and 2022 onward | Shown separately, because of early bad scans and orbit drift; never used for the pick |
| Reported only | Punjab cropland | 2012 onward | Small crop fires, which no scored region covers; never used for the pick |

Order of work:
1. Score single approaches, the baselines and the incumbent where possible on the selection set.
2. If one approach is a clear winner on every criterion, it goes to the final set with no combination.
3. If approaches win on different criteria or cases, generate 1–3 combinations in separate subagents. Each part must measurably add something the others lack, through a clear mechanism. "No combination is justified" is a valid answer.
4. Use the selection set to choose the best combination. This favours combinations, because they were designed on the same data, so it cannot be the final pick.
5. Run the final set once on the best single approach, the best combination if there is one, the baselines, and the incumbent if its values can be exported. Apply the margin.

Rules for the data:
- Nobody inspects the locked regions or years before step 5. Fix their exact boundaries first.
- Sets can change only before any candidate is scored on them, with the reason recorded. Valid reasons are the 13 Nov resources or a data problem.
- If the final set is used more than once, it is no longer locked, and the evidence must be described as weaker.
- Report anomaly flags as counts as well as precision. Set the "too few anomalies" trigger from selection-set counts before the final run. If it is triggered, cross-validate over tuning and selection only, and say the evidence is weaker. The final set is never reused; if it holds few flags, report the counts and call that evidence weaker.
- A win here uses Suomi NPP-era overlap, so it does not show that NOAA-20 or NOAA-21 data are comparable.
- Choices that metrics cannot score, such as calendar design, use a blind review by someone who sees only the brief and this file.

## Known traps
- The reference is not stable. Terra and Aqua are drifting from their orbits, so late overlap years may be a weaker reference. End dates: Aqua Sept 2027 in NASA and CAMS sources; Terra Feb 2027 (NASA) or Jan 2027 (CAMS). The older Aug 2026 Aqua date appears superseded, because FIRMS still lists Aqua with no end notice. Last inclination adjustments: Aqua 2021; Terra 2020 (NASA Terra page) or 2022 (Giglio slides).
- Neither record is a single series. Terra starts Nov 2000, Aqua joins July 2002. VIIRS 375 m starts 20 Jan 2012, and NOAA-20 and NOAA-21 joined Suomi NPP later. Adding satellites can change counts with no change in fire.
- The VIIRS record has its own platform change. Suomi NPP stopped delivering new data on 2 Nov 2026, so current-month VIIRS data must come from NOAA-20 and NOAA-21. Every overlap paper read so far uses Suomi NPP, and no comparison of NOAA-20 or NOAA-21 with MODIS was found.
- Early VIIRS data had bad scans. FIRMS reports spurious Level 1 radiances in the first 18–24 months, addressed by revised processing in 2015. Whether they remain in the current archive is not stated.
- History and "current month" are different products. The `type` field (vegetation, volcano, static land source, offshore) is documented only for standard-quality MCD14ML. The VIIRS near-real-time field list has no `type`, and the sources do not settle whether VIIRS standard files do, so check the header of one downloaded file. Near-real-time data is not science quality, and standard data arrives with a 2–3 month lag.
- The day/night flag is set differently. Near-real-time data uses orbit direction, while standard data uses solar zenith angle. Any day or night split crosses that boundary.
- Hotspot location files are incomplete for counting. FIRMS warns they carry no cloud or missing-data information and can mislead if other pixel classes are ignored. It also says Level 2G products account for overlapping orbits to avoid double counting, which it does not claim for the location files.
- Confidence is not comparable. VIIRS uses low, nominal and high categories. Earth Engine warns that the field's meaning may vary by region.
- A hotspot is not a fire. The brief's "number of fires" blurs the two.
- Cloud and heavy smoke can hide fires (FIRMS, GWIS), though INPE says smoke plumes do not interfere. Detection probability for powerful fires falls below 30% for MODIS and 40% for VIIRS in some equatorial areas (Sofiev et al. 2026, preprint). This matters for the Singapore haze angle. Smouldering peat may also bias detection. `[unverified: from general domain knowledge]`
- No independent reference exists for global hotspot counts. Landsat and ASTER validate detection, and some regions have ground-based fire records, but neither validates a merged global series. The plan must state what a good score does and does not prove.
- Official resources arrive on 13 Nov, one day before the build, so the plan must be able to change.

## Domain research prompt
Run on 7 Nov 2026. The checked result is in `research/domain-research.md`.

> How do experts in satellite fire monitoring build consistent multi-decade active fire records across MODIS and VIIRS? Cover operational centres (FIRMS, GWIS, CAMS GFAS, INPE Queimadas) and peer-reviewed work. List the main families of approach, the data each needs, how each is evaluated, which metrics are standard, and which is used operationally today. Flag how each handles orbit drift, added satellites, fire size, cloud and smoke, and the standard versus near-real-time difference. Verify every citation against a scholarly database and mark anything unchecked [unverified].

## Definition of done (Demo)
Checked in the readiness review before the repo goes public or the project is submitted.

Security:
- [ ] FIRMS key and any other secrets live in a git-ignored `.env`, with a `.env.example` listing the variable names
- [ ] Notebook outputs cleared before committing if they ever printed a key
- [ ] gitleaks runs as a pre-commit hook, plus one full-history scan before going public
- [ ] Dependencies pinned and audited once with `pip-audit` or `npm audit`
- [ ] `/security-review` run before the repo goes public or is submitted

Usability:
- [ ] README says what it does and how to run it from a fresh clone
- [ ] Teammate runs it from a fresh clone on another machine
- [ ] Hosted link stays up through global judging (starts 16 Nov)
- [ ] Every external resource, including open source, is listed in the References field

## Sources
- Official participant FAQ (dates): https://www.spaceappschallenge.org/resources/participant-faqs/
- GWIS: https://gwis.jrc.ec.europa.eu
- GWIS Country Profiles: https://un-spider.org/news-and-events/news/gwis-launches-country-profiles-support-wildfire-risk-management-lac-region
- MODIS to VIIRS transition: https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition
- Terra end of mission: https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/
- CAMS on moving away from MODIS: https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system
- Earthdata transition notice: https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs
- FIRMS attributes: https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs
- Earth Engine FIRMS catalog: https://developers.google.com/earth-engine/datasets/catalog/FIRMS?authuser=0
- Archive coverage dates (secondary source): https://gee-community-catalog.org/projects/firms_vector/
- NASA FIRMS FAQ: https://www.earthdata.nasa.gov/data/tools/firms/faq
- Suomi NPP data notice: https://www.earthdata.nasa.gov/data/alerts-outages/reminder-new-suomi-npp-observations-cease-november-2-2026
- INPE Queimadas FAQ: https://data.inpe.br/queimadas/faq/
- Orbit-drift slides (Giglio, May 2025): https://landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf

Papers, with checked citations and how far each was read, are listed in `research/domain-research.md`. Those used above:
- Giglio et al. 2006: https://doi.org/10.1029/2005JG000142
- Sofiev et al. 2026 (preprint): https://doi.org/10.5194/egusphere-2026-89
