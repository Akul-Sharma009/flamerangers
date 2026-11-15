# Test plan: harmonization head-to-head

Written 7 Nov 2026 from `GUARDRAILS.md`. Nothing here has been run. No locked data was opened, and no combination, winner or BMAD work is included.

The sets, margin, tie-breaks and order of work are copied from the "Selection rule" and are not changed. Any change I'd suggest is in section 13, for Akul to decide.

> **Updated 7 Nov, after this plan was written.** Sections 6, 8, 9, 11 and 13 now include these changes:
> - The noise test uses 5° tile-years.
> - Baseline (c) is tested for non-inferiority against Terra (P1).
> - The record switches from Aqua to converted VIIRS at the end of 2021 (P2).
> - Selection scoring happens on 12 Nov evening.
> - A blind reviewer judges the trap table.
> - The final set is never reused, even if too few anomalies appear.
>
> - Punjab is added as reported only, GWIS joins step 5 if it can be scored, and a region-month comparator sits beside M1.
>
> All questions in section 13 are answered, and all its proposals are adopted.

**Marked ASSUMED:** GUARDRAILS leaves some details open, and scoring can't start without them. Those details carry this tag. They are this plan's choices, fixed before any data was seen.

## 1. What this plan does not allow

- No product build before 14 Nov. All code here is throwaway.
- No looking at locked data before step 5.
- No combinations until step 3 calls for them.

## 2. What is compared

**Single approaches:** all 13 survivors in `research/screening.md`. Akul chose to test all of them on 7 Nov. Each is specified on its own in section 7, so dropping one later changes nothing else.

**Baselines:**

| ID | Rule | How it is set here |
|---|---|---|
| (a) | Raw splice | Raw Suomi NPP counts in every held-out month |
| (b) | One global factor | Total Aqua hotspots ÷ total Suomi NPP hotspots, pooled over the tuning set. A truly global fit would read the locked regions, so it is not used. |
| (c) | Aqua only | Aqua's own record. Scored on criteria 2 and 3 only, against the Terra referee (section 6). |

**Comparator, shown only, never picked:** a per-region, per-calendar-month factor (Aqua total ÷ Suomi NPP total for each region and calendar month, pooled over the tuning set). It is reported beside M1, to show whether M1's extra detail adds anything over the simpler table. Locked regions use the pooled factor for that calendar month. Adopted 7 Nov.

**Incumbent:**

| Incumbent | Can it be scored? |
|---|---|
| INPE Queimadas | Yes. Its rule is baseline (c), so it is scored once, as (c). |
| GWIS Country Profiles | Unknown. Depends on check D5 in section 9. If values can't be exported, it is recorded as "can't be scored". Values are not read off charts. |
| NASA FIRMS | No. It distributes the records separately, so it provides inputs and not a series. |

If GWIS can be scored, every approach is re-clipped to GWIS's admin units for that comparison, in selection years only.

## 3. Region boundaries

These are fixed now and apply to every set. They were chosen from geography and general biome knowledge `[unverified: general domain knowledge]`, not from fire data or known fire events. Coordinates are decimal degrees, WGS84.

| Region | Status | Boundary | 1° cells (before land mask) |
|---|---|---|---|
| Australian grassland | Tuning | 127°E ≤ lon < 141°E, 21°S ≤ lat < 15°S | 84 |
| Amazon forest | Tuning | 60°W ≤ lon < 52°W, 12°S ≤ lat < 5°S | 56 |
| Sumatra | Tuning | Polygon below | Not a box |
| Southern African savanna | Locked | 20°E ≤ lon < 35°E, 18°S ≤ lat < 8°S | 150 |
| Siberian boreal forest | Locked | 100°E ≤ lon < 135°E, 56°N ≤ lat < 68°N | 420 |
| Punjab cropland | Reported only, added 7 Nov | 73.5°E ≤ lon < 77°E, 29.5°N ≤ lat < 32.5°N | 10.5 |

**Sumatra polygon**, as (lon, lat) in order, closing back to the first point:

(94.8, 6.3), (97.5, 6.3), (99.4, 4.4), (100.7, 3.0), (101.9, 2.2), (103.3, 1.15), (104.0, 0.5), (105.0, −0.9), (107.0, −1.5), (107.0, −3.4), (106.1, −5.5), (105.87, −5.9), (105.4, −6.25), (103.5, −6.6), (98.0, −3.5), (94.8, 1.5)

It includes Sumatra and its offshore islands, including Nias, Mentawai and Bangka. It excludes the Malay Peninsula, Singapore, Batam, Bintan, Belitung and Java. A box would have included the peninsula.

**Applied to all five:**

- Keep only points on land, using Natural Earth 1:10m land. Record the version at download.
- Grid cells align to whole degrees (1°) and to multiples of 0.25°. Cells cut by a boundary count only the hotspots inside it.
- A month is a calendar month of the UTC acquisition date.

**Checked:** 74 landmark coordinates, written from memory, fell on the expected side of each boundary. No fire data was used.

**Overlap with the regions named in the approach files:** Mato Grosso's forest and southern Pará overlap Amazon forest, and northern Australia overlaps Australian grassland. Both follow the same rules as those regions. "Sumatra-Kalimantan" counts as Sumatra in part. Southern Africa and Siberia are locked in any form.

## 4. Common data

Every approach is scored against the same truth. Nobody cleans their own truth.

- **Aqua and Terra:** MCD14ML standard data, split by `satellite`.
- **VIIRS:** Suomi NPP 375 m standard data. Approaches using the 750 m gridded product take their own input, but truth stays the same.
- **Confidence:** keep all classes. No confidence filter is applied.
- **Day and night:** totals use both. An approach that needs a split recomputes it from solar zenith angle, on every record.
- **Static sources:** apply the same mask to all records. The first choice is the FIRMS static thermal anomalies mask, which is a third-party global product. If D2 shows it can't be used, apply the Giglio et al. 2006 rule, where a 1 km cell with fire on 50 or more days a year counts as persistent. That is built from tuning years in tuning regions only, so the two locked regions would stay unmasked. Report that to Akul as a data problem.
- **Truth:** cleaned Aqua monthly hotspot count, at each scale.

**Inputs in held-out months:** the approach sees only Suomi NPP data in those months, plus the fixed 2003–2011 history. All MODIS is hidden, including Terra. This matches the situation the record is built for, after MODIS ends. Showing Terra would let an approach copy nearly the answer. NOAA-20 is not an input in scored months, so all approaches see the same data.

## 5. How the sets are used

Copied from GUARDRAILS.md, unchanged:

| Set | Regions | Years | Use |
|---|---|---|---|
| Tuning | Sumatra, Australian grassland, Amazon forest | 2014, 2016, 2017, 2020 | Fitting and adjusting candidates |
| Selection | Same three regions | 2015, 2018 | Head-to-head comparison and designing combinations |
| Final (locked) | Same three regions | 2019, 2021 | The final pick, used once |
| Final (locked) | Southern African savanna, Siberian boreal forest | 2014–2021 | The final pick, used once |
| Reported only | All five regions | 2012–2013 and 2022 onward | Shown separately; never used for the pick |
| Reported only | Punjab cropland | 2012 onward | Small crop fires; never used for the pick |

**These sets override what the approach files propose.** Their training windows, such as 2013–2021, and their holdout schemes are replaced. Every approach fits on the tuning set only.

**Lock rules in practice:**

1. Don't download the two locked regions at all, in any year, before step 5.
2. Don't download 2019 or 2021 for any region before step 5.
3. If a source only offers global files, clip it inside the read step, before anything is summed or printed. Then assert that zero rows fall in a locked region or year.
4. Pooled or global fitting never includes locked regions. This covers baseline (b), biome pooling and any mask built by us.
5. Charts count as inspection. A country chart spanning 2019 and 2021 is locked data, so GWIS and FIRMS pages are checked for capabilities and not read for values.
6. Reported-only data is computed after step 5, for all regions. That is the simplest way to keep it out of the pick. The drift tests in 1B and 4A wait until then.
7. The 2003–2011 history is outside every set, so it can be used for the three tuning regions. For locked regions it is computed only during step 5.

## 6. Metrics

GUARDRAILS names the metrics. Items marked ASSUMED are the exact forms it leaves open.

### Scales and reporting

- Every score is reported at 0.25°, 1° and whole region.
- Early overlap is 2014–2017 and late overlap is 2018–2021. ASSUMED
- **Decision scale:** 1° for error and flags, whole region for ranking and seasonal metrics. ASSUMED. The margin needs one number, and GUARDRAILS doesn't say which scale gives it.

### Common unit

Criterion 1 needs one target, so every approach is scored on its count view against Aqua hotspots. ASSUMED. Approaches built on another unit (1B, 3B, 4B, M3) also report scores in that unit, with the same calculation applied to Aqua. Those scores are shown but don't decide. Approaches that correct for cloud will differ from raw Aqua by design, so the count-view score may understate them.

### Criterion 1: error and bias

- **Error:** mean absolute error per 1° land cell-month, computed for each region. ASSUMED. GUARDRAILS cites no field standard.
- **Comparing A with B:** the reduction in each region is 1 − error(A) ÷ error(B). The headline is the median across regions, because regions differ in size and fire level.
- **Bias:** (total predicted − total truth) ÷ total truth, per region.
- **Baseline (c)** is left out, as stated in GUARDRAILS.

### Criterion 2: anomaly flags and ranking

**Flag rule, the same for every approach and for truth.** ASSUMED

1. A flag is a cell-month above the 90th percentile of the same calendar month over 2003–2011, in Aqua history. It must also reach at least 10 hotspots, so that 1 becoming 3 is never flagged.
2. Held-out years never enter their own reference.
3. Truth flags apply the same rule to held-out Aqua.

The 90th percentile is the line 3A proposed and comes from no field standard. The floor of 10 is a judgement call.

**Scores:**

- **Precision:** true flags ÷ raised flags, pooled across regions. Report the raised and true flag counts beside it, as GUARDRAILS requires.
- **Recall:** reported only, because precision alone rewards flagging rarely.
- **Native flags:** approaches with their own flag logic (1B, 2A, 3A, 4B) report those as well, with the share of months withheld. These don't decide, so that approaches flagging less can't gain precision by doing so. ASSUMED
- **Month ranking:** Spearman correlation over held-out months per region, plus overlap of the top k months, where k is one tenth of the months, rounded up.
- **Year ranking:** share of year pairs in the right order per region.

### Criterion 3: seasonal agreement

From Giglio et al. 2006, section 3.2, read directly. `[verified]`

- **Peak month:** the calendar month with the highest count.
- **Season length:** the number of months whose count is at least 10% of the annual count.
- **Scores:** months of peak error, circular so December and January are 1 month apart, and absolute difference in season length.

Two differences from the paper, both ASSUMED: it used 5-year averages per grid cell with overpass-corrected counts, while this plan uses each region-year, rebuilt in every bootstrap draw from that draw's resampled tile-years, and uses plain counts.

### Reported only

Timeliness is reported as data freshness of the current month and doesn't decide the pick.

### Terra referee, for baseline (c) only

With Aqua as truth, baseline (c) would score perfectly, because it is the answer key. GUARDRAILS.md now names the truth series and the test:

- **Aqua is truth** for criteria 1, 2 and 3 across approaches, and for (a) and (b).
- **Terra is the referee** for comparing against (c), on criteria 2 and 3 only. Terra's flags use Terra's own 2003–2011 history.
- Approaches that use Terra as an input (1B, 2A) are refitted without it for this comparison.
- **Against (c), the test is non-inferiority, not "beat".** Flag precision and month-ranking Spearman are each no more than 0.05 below (c)'s, with the 95% interval for each difference staying above −0.05. Peak month and season length are not worse beyond noise. (c) is still reported in full.

Terra shares Aqua's instrument, so this still favours (c), which is why the test is non-inferiority. Section 11 covers the outcomes.

### Noise test

- **Method:** 95% percentile block bootstrap, 10,000 draws, seed 20261114.
- **Blocks:** 5° tiles × year, as GUARDRAILS.md sets out. Tiles align to multiples of 5° and keep only land inside the region. A tile with fewer than 5 land 1° cells joins the adjacent tile in the same region that shares its longest edge.
- **Stratified by region:** each draw resamples tile-years within each region, so no region drops out of the median.
- **Paired:** both approaches use the same resampled blocks.
- **"Beyond noise":** the interval for the difference excludes zero.

The selection set has about 30 tile-years. Neighbouring tiles are not fully independent, so intervals may be somewhat too narrow; say so when reporting a close call. Count the blocks once the land mask is applied, before any scoring, and report the number. Year ranking still rests on two years per region, which tiles don't help.

## 7. Candidate specifications

All are fitted on the tuning set once, then frozen. There is no refit on selection data before the final run.

**Unseen regions:** nothing may be fitted in the locked regions, because that would use the truth being tested. Each approach needs a rule for them, frozen before step 5.

| ID | In held-out months | Rule for locked regions |
|---|---|---|
| 1A | Emulate from Suomi NPP. Scan, FRP and pixel area as inputs. | Pooled detection model, no region term |
| 1B | Suomi NPP witness only. Tuning fit may use Terra and NOAA-20 where the method uses them. | Pooled gains |
| 2A | Suomi NPP observer only. Whole families hidden, as its text says. | Population-level terms |
| 2B | Sum of hotspot weights | Region input set to missing |
| 3A | Quantile delta mapping fitted at 1°, pooling the region and ±1 calendar month. Live fit off. | Pooled map from the three tuning regions |
| 3B | Fixed floor, no fit. Filtered hotspots as count view. Burn-days as own unit. | Same floor |
| 4A | Suomi NPP link only. Transfer table by regime, season and day or night. | Pooled table, with partial-pooling mean |
| 4B | VNP14A1 fire pixels with the residual table. Rate as own unit. | Pooled residual |
| M1 | Table by land cover, region, month and intensity, with parent fallback | Fallback tier without region |
| M2 | Boosted model. Neighbouring and previous-month inputs come from VIIRS only. | Region input set to missing |
| M3 | Harmonized FRP. Count view is FRP ÷ mean Aqua FRP per hotspot, by region and calendar month, from tuning. ASSUMED, as its page leaves this open. | Pooled ratio and mean FRP |
| M4 | Emulated hotspots, fixed seed | Pooled curve |
| M5 | Quantile map, pooled as in 3A | Pooled map |

**3B floor:** fix it before tuning, from published limits, and never adjust it on overlap, because "no fitted correction" is its claim. The source so far gives 3.7 MW at night and up to 40 MW in daytime side view [S10, preprint]. Read the daytime nadir value from the full text and record it here first.

**No tuning region is boreal,** so land-cover and biome approaches have no boreal training data for Siberia. That is the point of an unseen region, and it is a hard test for them.

**Not scored here:** carbon (M3), the 2000–2002 Terra link, and any switch date. Scoring on held-out overlap treats every month as converted, so it can't choose a switch date.

## 8. Order of work

Steps 1–5 are copied from GUARDRAILS.md. The notes say how each is carried out.

**Before step 1**

- Akul answers the open questions in section 13. The survivor choice is made: all 13.
- A fresh Opus subagent judges all 13 approaches against the GUARDRAILS.md trap list, from method text only, with no author self-assessments. Unknown cells stay unknown. Save the result as `research/trap-review.md` and freeze it before any scores exist. Tie-break 2 reads it and nothing else. The self-reported table in `research/screening.md` is kept for reference only.
- Run the checks in section 9.
- Save the frozen scoring code with a date.

**Step 1.** Score single approaches, the baselines and the incumbent where possible on the selection set.

**Step 2.** If one approach is a clear winner on every criterion, it goes to the final set with no combination.

- "Clear winner" means better beyond noise than every other single approach on each of: error, absolute bias, flag precision, month ranking, peak month and season length.
- The approach must also not lose beyond noise to (a) or (b) on any of these.
- The bootstrap alone decides this. The 5% figure applies only to combinations.

**Step 3.** If approaches win on different criteria or cases, generate 1–3 combinations in separate subagents. Each part must measurably add something the others lack, through a clear mechanism. "No combination is justified" is a valid answer.

- A "win" means beyond noise. A "case" means a region or a defined group of months.
- If nothing wins beyond noise anywhere, there is nothing to combine.

**Step 4.** Use the selection set to choose the best combination. This favours combinations, because they were designed on the same data, so it cannot be the final pick.

**Step 5.** Run the final set once on the best single approach, the best combination if there is one, the baselines, and the incumbent if its values can be exported. Apply the margin.

- **GWIS:** scored here only if check D5 shows its values can be exported. Every approach is re-clipped to GWIS's admin units for that comparison. GWIS values for locked regions or years are not read before this step.

- **Best single approach:** the lowest error on the selection set. Any approach within noise of it, on both error and absolute bias, is tied with it. If error and bias point in different directions beyond noise, error comes first, because the margin is stated on error.
- **Tie-breaks, in order:** (1) the remaining criteria above; (2) more known traps handled; (3) easier to defend scientifically; (4) simpler. Tie-breaks 3 and 4 need a blind judgement, by someone who sees only the brief and GUARDRAILS.md.
- **Freeze first:** save the parameters, the unseen-region rules and the code before opening any locked data.

**The combination must meet all of these on the final set, otherwise the simpler approach wins:**

- At least 5% lower error on criterion 1, taken as the median across regions
- A 95% block bootstrap interval for that difference, using the noise test in section 6, that excludes zero
- Precision of anomaly flags no more than 0.05 lower

A combination within noise of a single approach loses.

**Checking against the baselines,** on the final set:

- Against (a) and (b): lower error beyond noise, and not worse beyond noise on any other criterion. ASSUMED, as GUARDRAILS says "beat" without defining it.
- Against (c): non-inferior against the Terra referee, using the test in section 6 as set out in GUARDRAILS.md.

**Too few anomalies:** a single flag moves precision by 0.05 when 20 flags were raised, which is the size of the margin. The trigger is set from selection-set counts after step 1, before step 5: if either approach raises fewer than 20 flags there, or truth holds fewer than 20, use cross-validation. Leave out one region-year at a time across tuning and selection only, and say the evidence is weaker. The final set is never reused. If it holds fewer than 20 flags, report the counts and call that evidence weaker. Decided by Akul, 7 Nov.

**Rules that always apply:**

- If the final set is used more than once, it is no longer locked, and the evidence must be described as weaker.
- Sets change only before any candidate is scored on them, with the reason recorded. Valid reasons are the 13 Nov resources or a data problem.
- A win here uses Suomi NPP-era overlap, so it doesn't show that NOAA-20 or NOAA-21 data are comparable.
- Choices that metrics can't score, such as calendar design, use a blind review.
- Akul records the candidates, combinations, margin, result and why the losers lost in `DECISIONS.md`.

**After step 5:** compute the reported-only years for all five regions, and the pretend-ending and drift tests. These never change the pick.

## 9. Schedule and checks

**Status: decided 7 Nov.** Akul chose to score the selection set on 12 Nov evening, not to wait for 13 Nov (question 3 in section 13). The reasoning below is kept for the record.

| When | Work | Data allowed |
|---|---|---|
| 7–8 Nov | Akul's answers to section 13. Data checks D1–D6. | Tuning only, and metadata |
| 9–11 Nov | Fit all 13 approaches. Run the throwaway tests in section 10. | Tuning only |
| By evening 12 Nov | Scoring ready to run. All approaches fitted and frozen, scoring code written. Dry run: score the full pipeline leaving out one tuning year at a time, to catch bugs without touching selection data. | Tuning only |
| 12 Nov evening | Steps 1–2: run the frozen scoring once | Selection |
| 13 Nov | Steps 3–5: combinations if justified, then the final run once. Read the resources and briefing. A conflict with the scored sets is recorded as a known limitation; the sets can't change once scored. | Final, once |
| 14 Nov | Build starts on the chosen method | — |

**What waiting protects.** Once any candidate is scored on the selection set, three things freeze: the sets, the margin and the tie-breaks. The 13 Nov resources are a valid reason to change a set, and a SaRC researcher might suggest a different margin. Scoring before 13 Nov gives up the chance to act on either.

**How much it's worth.** Probably little. The resources are most likely a list of datasets, so the chance they force a change is low. The locked final set, not the selection set, is the main safeguard, and scoring early doesn't touch it.

**What it costs.** If scoring is ready by 12 Nov, the selection run only applies frozen models, which takes hours. If scoring isn't ready, waiting costs nothing, because it couldn't run earlier anyway. The real time risk is heavy fitting, such as 1B or 2A, slipping into 14 Nov, and that happens whether or not the team waits.

**Data checks.** All stay within tuning data or metadata:

| ID | Check | If it fails |
|---|---|---|
| D1 | Header of one VIIRS standard file, Amazon 2016: is there a `type` field? | Mask handles it for all records |
| D2 | FIRMS static mask: can it be downloaded and used? | Fallback in section 4 |
| D3 | V2 mask classes for cloud and land in VNP14A1, from the guide | 1B, 3B, 4B reported to Akul |
| D4 | SEVIRI and Himawari: archive dates and access for 2014, 2016, 2017, 2020 | 2A's Test 2 reopens, reported to Akul |
| D5 | GWIS: is there an export, what is its unit, and which admin levels? Capabilities only, no charts for 2019, 2021 or locked regions. | Recorded as "can't be scored" |
| D6 | Size of the tuning download, and whether FIRMS allows area and year requests | Clip in the read step |

A data problem found here is a valid reason to change a set, before anything is scored on it.

## 10. Throwaway tests

Every test in the approach files touches selection data, locked data or both, except M4, so none can run as written. These are tuning-only versions. Pass and fail lines stay the authors' own, not published values.

**A failed test removes nothing.** The result goes to Akul, because removal isn't part of the selection rule.

| ID | Conflict in the original | Tuning-only version | Proven wrong if |
|---|---|---|---|
| 1A | 2015 is selection | Three tuning regions, peak months. Fit 2016, predict 2017 at 1°. | No better than (b) in 2 of 3 regions, or FRP at 50% detection differs by more than a factor of 2 |
| 1B | Southern Africa, 2019 and 2021 locked; 2023–2025 reported only | No tuning-only form. Runs after step 5. | As written |
| 2A | 2021 locked | Inject the same drifts into Aqua and Suomi NPP over tuning years, in three tuning regions. Terra stands in for NOAA-20 as the clean anchor, because only 2020 has NOAA-20. | 90% interval misses −3% or includes zero in 2 of 3 regions |
| 2B | 2019 locked | Three tuning regions, Aug–Oct 2017. Train Aug–Sep, predict Oct at 1°. | Error and bias not both below a per-region ratio in 2 of 3 regions |
| 3A | 2015, 2018, 2019, 2021 | Three tuning regions. Fit 2014, 2016, 2017; test 2020. | Precision below 0.7, or not 0.10 above (b). Expect about 4 flags, so this is very weak. |
| 3B | 2018, 2019 | Three tuning regions, 2016, 2017, 2020 | Standard deviation of the log ratio doesn't halve, or Sumatra's median ratio falls outside 0.8–1.25. Sumatra replaces Punjab and Kalimantan. |
| 4A | Siberia, 2015, 2018, 2019, 2021, reported years | First link only. Three tuning regions. Fit Aqua to Suomi NPP on 2014, 2016, 2017; predict 2020. The rest runs after step 5. | No better than (b) in 2 of 3 regions, or median top-decile error above 30%. The original used 4 of 6. |
| 4B | Siberia, 2019 | Three tuning regions, all of 2017 | Spread of the ratio not one-third smaller than for 375 m counts. Three regions make this weak. |
| M1 | 2015, 2018, 2019, 2021, reported years | Sumatra and Amazon, leaving out one tuning year at a time | Doesn't beat region-only factors in both regions, or worsens top-10 ranking |
| M2 | 2015, 2019 | Sumatra, leaving out one tuning year at a time | Underestimates top months more than the table, or doesn't beat it. No tuning year holds a 2015-size peak, so the capping risk stays untested. |
| M3 | As M1 | Sumatra and Amazon, tuning years | FRP ratio varies as much as the count ratio or more |
| M4 | None if the year is tuning | Sumatra, Jun–Oct 2014, passes under 30 minutes apart | Doesn't beat (b) on count error and FRP distribution |
| M5 | As M1; the 2015 peak is selection | Sumatra and Amazon, leaving out one tuning year at a time | Doesn't beat (b), or the highest tuning month falls outside its held-out range |

## 11. If nothing beats the baselines

**Rules for every case:**

- The final set still runs once, as step 5 says. It's the only test on unseen regions.
- Nothing is tuned further using final data. A re-run makes the evidence weaker and must be labelled so.
- Tuning a new version and rescoring it on the selection set isn't provided for in the order of work, so it needs Akul's decision.
- The result is stated plainly in the pitch. A negative result is a valid scientific finding.

| Outcome on the final set | What happens |
|---|---|
| A candidate beats (a) and (b) and is non-inferior to (c) | It's the solution |
| A candidate beats (a) and (b) but is inferior to (c) | It doesn't meet the baseline rule, and the write-up says so. Real Aqua stays as the record through December 2021. The candidate is used from January 2022, because Aqua is less trustworthy after its last orbit adjustment and (c) has no values once Aqua ends. |
| Nothing beats (b), (a) is beaten | (b) is the conversion. The finding is that nothing tested improved on one global factor. |
| Nothing beats (a) | Stop and take this to Akul. A raw splice has a known jump, so this outcome would suggest that the scoring has gone wrong. |

P1 (non-inferiority against (c)) and P2 (the end-2021 switch date) were both adopted on 7 Nov. P1 makes the second row less likely.

## 12. What a good score can't show

- **It shows agreement with Aqua, not truth about fire.** No independent reference exists for global counts.
- **It can't reward drift handling.** The scored years stop at 2021, and the drift years are reported only. So 1B and 2A can't show their main claim in the pick. Tie-break 2 gives partial credit only.
- **It says nothing about NOAA-20 or NOAA-21,** or about 2000–2002.
- **The selection set is small.** It has 6 region-years. Tile-year blocks give the noise test about 30 blocks, but they aren't fully independent. With two years per region, year ranking is one comparison per region. A clear winner there may be chance, especially with 13 approaches and no multiple-comparison correction.
- **The final set's three tuning regions only have late years,** 2019 and 2021. Early years in the final set come from the two locked regions alone.
- **2021 may include some drift.** 2B's sources date Aqua's crossing-time change to mid-2021.
- **A 0.05 precision margin may be finer than the data can resolve,** even above the floor in section 8.
- **No cropland region is scored,** though the brief includes agricultural burning. See section 13.

## 13. For Akul

**Decisions needed**

1. **Which survivors go forward?** Answered 7 Nov: all 13.
2. **Is the Terra referee acceptable for baseline (c)?** Answered 7 Nov: yes, with P1 adopted. Both are now in GUARDRAILS.md.
3. **Should selection scoring wait until after the 13 Nov gate?** Answered 7 Nov: no. Score on 12 Nov evening (section 9).
4. **Do you accept the ASSUMED details?** Answered 7 Nov: yes, all of them. The ones that matter most are the 1° decision scale, the 90th percentile flag with a floor of 10, the count view as common unit, and the stratified bootstrap.
5. **Is the outcome in section 11 right** when a candidate beats (a) and (b) but is inferior to (c)? Answered 7 Nov: yes, with P2 adopted.

**Proposed changes, none applied**

| Proposal | Why | Catch |
|---|---|---|
| **Adopted 7 Nov.** Add Punjab to the reported-only row | No region tests small cropland fires, which is the stated failure case for 1A and M4 | Neither valid reason for a set change applies, so this is your call. It wouldn't affect the pick. |
| **P1. Adopted 7 Nov, now in GUARDRAILS.md. Test (c) for non-inferiority, not "beat".** Keep Terra as referee. A candidate passes against (c) if, against Terra, its flag precision and its month-ranking Spearman are each no more than 0.05 below (c)'s, with the 95% bootstrap interval for each difference staying above −0.05. Peak month and season length must not be worse beyond noise. (c) is still reported in full. | Aqua and Terra share an instrument and algorithm, so (c) will almost certainly beat a VIIRS-based estimate against Terra. A test with a known answer can't tell candidates apart. Terra stays as referee because it's the only independent record in MODIS units: VIIRS would be circular, and geostationary covers only some regions. Non-inferiority testing is a recognised method, used in clinical trials. 0.05 matches the existing precision margin. | Weakens the "beat all three" rule in GUARDRAILS.md, so only Akul can make this change. It must be decided before selection scoring. |
| **P2. Adopted 7 Nov, recorded in DECISIONS.md. Fixed switch date: end of 2021.** Real Aqua through December 2021, converted VIIRS from January 2022. Recorded in DECISIONS.md as ASSUMED, revisit if the reported-only years show Aqua drifting earlier or later than expected. This replaces "while Aqua is healthy" in section 11. | "Healthy" isn't defined, so it would be decided after seeing results. 2021 is Aqua's last inclination adjustment and the last scored year, so it's the last year with evidence. Every candidate's record is real Aqua up to the switch and converted VIIRS after it, so losing to (c) on overlap only confirms why Aqua is kept until then. | The switch date isn't scored by this plan (section 7). The Terra-Aqua inclination dates conflict across sources, but Aqua's is 2021 in both. |
| **Adopted 7 Nov.** Add GWIS to step 5 if it can be scored | The head-to-head rule says the incumbent is scored on the same data, but step 5 doesn't list it | Needs locked-year GWIS values |
| **Adopted 7 Nov.** Report a per-region, per-calendar-month ratio beside M1 | 2A and 2B both call (b) a low bar. M1's scoring already includes region-only factors. | It would be a comparator only, never picked |
