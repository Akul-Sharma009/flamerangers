# Decisions

ASSUMED = not yet tested against alternatives. Treat as an open question.
TESTED = won a head-to-head comparison; evidence recorded below.

## Standing rules (set by Akul)
These are the user's rules from section 0 of the brief, not assumptions to reopen. Only Akul changes them.
- Always prioritise quality. The "ambitious plan" rule in section 0 of the brief is about time only: don't shrink the plan because of the time limit. It is never a reason to choose a weaker option or to break a tie.
- Do not plan around the 48-hour limit.
- Akul alone decides when to stop, and scope cuts happen only during the hackathon. No AI assistant trims scope in advance.
- Order features by dependency, so work is cut from the bottom tier up without breaking anything above.
- No product build before 14 November. Until then: planning, data exploration and small throwaway tests only.

## Planning framework: BMAD
Status: ASSUMED
Decision: Use BMAD Method for planning.
Evidence: The project runs 9 days with 5 components (harmonization, preprocessing, data service, web app, pitch and video). The planning week gives BMAD the time it needs.
Revisit if: BMAD's planning eats the days set aside for data exploration and harmonization tests.

## Ship target: Demo
Status: ASSUMED
Decision: Demo, plus one added requirement: the hosted link stays up through global judging.
Evidence: Judges are the users, and nothing has to run for real users after judging.
Revisit if: The 13 Nov briefing shows that judges or NTUpreneur expect real users, or a real organisation wants to use it.

## Primary metric: error and bias on held-out overlap months, per region
Status: ASSUMED
Decision: Score every candidate on the same held-out overlap months. Report scores at more than one spatial scale, and report early and late overlap years separately.
Evidence: Standard practice for comparing estimates. The domain research (7 Nov) found no field standard for harmonizing these records, so there is no field source. Published work shows the MODIS and VIIRS relationship changes with spatial scale (Li et al. 2018). The early and late split is this project's choice, made so drift shows up.
Revisit if: A field standard turns up, or the 13 Nov resources name a metric.

## Seasonal-agreement metric: peak month and fire season length
Status: ASSUMED
Decision: Report month of peak burning and fire season length per region.
Evidence: Giglio et al. 2006 used these to compare Terra with Aqua, and the product is a calendar. Their abstract covers two MODIS sensors, not MODIS with VIIRS.
Revisit if: The data exploration shows these are too unstable at the regions users select.

## Failure-cost metric: precision of anomaly flags, plus ranking of top months and years
Status: ASSUMED
Decision: Report how many flagged anomalies hold up, and whether the top months and years keep their ranking.
Evidence: A false "unusual month" is the costly error for emergency managers, and the brief asks which months and years had the most activity. The domain research named no better measure.
Revisit if: A SaRC researcher names a better measure.

## Baselines: raw splice, one global scale factor and Aqua only
Status: ASSUMED
Decision: A solution must beat raw splice and one global factor, on the same data and metrics, and must be non-inferior to Aqua only, scored against Terra. The test is in GUARDRAILS.md.
Evidence: The first two are the simplest rules a non-expert would build. Aqua only is the single-satellite rule INPE uses operationally. Changed on 7 Nov: with Aqua as truth, Aqua only is the answer key and can't be beaten, which the test-plan session found. Terra is the only independent record in MODIS units, but it shares Aqua's instrument, so the test is non-inferiority, a recognised method, rather than "beat". The 0.05 limit matches the anomaly-precision margin and is a judgement call.
Revisit if: The data exploration shows a simpler rule that performs better than any of them, or a SaRC researcher names a better referee or limit. Any change must be made before candidates are scored on the selection set.

## Approach generation: subagents do not see section 5 of the brief
Status: ASSUMED
Decision: Subagents that generate competing approaches get sections 1–4 of the brief and GUARDRAILS.md only. One of them, the domain-expert lens, also gets `research/domain-research.md`. Akul's ideas and the companion ideas document join afterwards as one more competitor.
Evidence: Section 5 contains solution ideas, which would anchor the alternatives. The research file lists expert methods, which would anchor every subagent if all saw it, but approach generation must include how domain experts solve the problem.
Revisit if: A subagent needs a data or timeline fact from section 5 or the research file; give it that fact on its own.

## Selection process: head-to-head first, combinations only if complementary
Status: ASSUMED
Decision: Follow the "Choosing between approaches" rule in the global CLAUDE.md, using the order of work in GUARDRAILS.md. Single approaches and baselines compete first. Up to 3 combinations are generated only if the results show approaches are complementary. The simpler approach wins unless a combination clears the margin on the final set.
Evidence: Akul added this rule on 7 Nov to fill a gap, because the process compared approaches but never defined selection or combination. Combinations usually look better on paper, so only held-out data should decide.
Revisit if: The first head-to-head results make the order of work impossible to follow, or Akul changes the rule. The global rule also asks that a combination fit the time and complexity budget. The standing rules bar planning around the 48-hour limit, so complexity counts here but time alone does not reject a combination. Akul decides if the two conflict.

## Combination margin: 5% lower error, beyond noise, without losing anomaly precision
Status: ASSUMED
Decision: On the final set, a combination needs at least 5% lower error (median across regions), a 95% block bootstrap interval for the difference that excludes zero, and anomaly-flag precision no more than 0.05 lower.
Evidence: No published margin was found, and no data has been scored yet, so 5% and 0.05 are judgement calls. Lowered from 10% because few test years already make the bootstrap strict, and 10% could reject a real quality gain. The bootstrap covers noise, which a fixed percentage alone would not.
Revisit if: Akul or a SaRC researcher names a better value. Any change must be made before candidates are scored on the selection set.

## Tie-breaks: quality first, then simplicity
Status: ASSUMED
Decision: Two single approaches within noise are separated by, in order: the remaining criteria, then more known traps handled, then which is easier to defend scientifically, then simplicity. A combination within noise of a single approach loses.
Evidence: A difference within noise is not evidence that one is better. These tie-breaks use real quality differences before falling back to simplicity. A combination within noise has no proven quality gain and adds parts that can fail.
Revisit if: Akul changes the order. Any change must be made before candidates are scored on the selection set.

## Held-out data: fixed splits by year, plus two unseen regions
Status: ASSUMED
Decision: Use the tuning, selection, final and reported-only sets in GUARDRAILS.md. Southern African savanna and Siberian boreal forest are locked regions.
Evidence: Whole years are held out because months within a year are related. Unseen regions test whether a method works beyond the regions it was tuned on, which matters because users can select any area. The final years should include large fire years so anomaly flags can be tested; that is from general knowledge and is unchecked. 2012–2013 and 2022 onward stay out of the pick because of early bad scans and orbit drift. These years are provisional, because the research found no published cutoff.
Revisit if: The data checks or the 13 Nov resources show a problem with a set. Any change must be made before candidates are scored on it, with the reason recorded.

## Noise test: 5° tile-years, stratified by region
Status: ASSUMED
Decision: Every "beyond noise" call uses a block bootstrap over 5° tiles × year, stratified by region, as set out in GUARDRAILS.md.
Evidence: Changed on 7 Nov from whole region-years. The selection set has only 6 region-years, which give 27 possible bootstrap outcomes, so most of the 13 candidates would tie and the tie-breaks would decide the pick instead of the data. Tiles give about 30 blocks. Neighbouring tiles are not fully independent, so intervals may be too narrow, which is the accepted cost.
Revisit if: The tuning data show that neighbouring tiles move almost together, or the tile count is far below 30 once land masking is applied. Any change must be made before candidates are scored on the selection set.

## Selection scoring date: 12 Nov evening
Status: ASSUMED
Decision: Score the selection set on 12 Nov evening, once fitting is frozen. Steps 3–5 finish on 13 Nov, so the method is settled before the build starts on 14 Nov.
Evidence: Waiting for the 13 Nov resources would push combinations and the final pick into the hackathon. The test plan judged waiting to be worth little, because the resources are most likely a list of datasets. Decided by Akul on 7 Nov.
Revisit if: Fitting isn't frozen by 12 Nov evening. If the 13 Nov resources conflict with the scored sets, record the conflict as a known limitation; the sets can't change once scored.
Update 13 Nov: triggered. Nothing was fitted or scored, no data was downloaded, and no FIRMS key exists yet. Akul's new decision (13 Nov): test all 13 survivors, starting today and running overnight. Steps 1–5 of the selection rule finish before the build starts at 9am on 14 Nov, then BMAD planning runs on the chosen method. What happens if it isn't finished by then is Akul's call.
13 Nov resources: the official resource is the FIRMS page only. It lists near-real-time MODIS (Collection 6.1) and VIIRS 375 m from Suomi NPP, NOAA-20 and NOAA-21, confirms Suomi NPP stopped delivering new data on 2 Nov 2026, gives no Terra or Aqua end notice, and offers no harmonization or climatology tool. Archive download needs an Earthdata Login. Nothing in it conflicts with the sets, margin or tie-breaks.

## Record switch: real Aqua through Dec 2021, converted VIIRS from Jan 2022
Status: ASSUMED
Decision: When the chosen method is inferior to Aqua only, or for any record built from it, real Aqua is used through December 2021 and converted VIIRS from January 2022. This replaces "while Aqua is healthy" in the test plan.
Evidence: "Healthy" wasn't defined, so it would have been decided after seeing results. 2021 is Aqua's last inclination adjustment and the last scored year, so it's the last year with evidence. Decided by Akul on 7 Nov (test-plan proposal P2).
Revisit if: The reported-only years show Aqua drifting earlier or later than expected. This never changes the pick.

## Trap table: judged by a blind reviewer
Status: ASSUMED
Decision: A fresh Opus subagent judges all 13 surviving approaches against the GUARDRAILS.md trap list, from method text only, and sees no author self-assessments. The table is frozen before any scores exist, and tie-break 2 reads only that table.
Evidence: The current table copies each author's claims about their own approach. The table rewarded detail on paper rather than handling. Decided by Akul on 7 Nov.
Revisit if: The reviewer can't judge a trap from method text alone; it records that cell as unknown instead of guessing.

## Too few anomalies: the final set stays single-use
Status: ASSUMED
Decision: Set the fallback trigger from selection-set flag counts before step 5. If it is triggered, cross-validate over tuning and selection only. If the final set holds few flags, report the counts and call that evidence weaker; the final set is never reused.
Evidence: The test plan's fallback cross-validated over every set, including the final set, which used locked data a second time, and its trigger depended on final counts. Decided by Akul on 7 Nov.
Revisit if: The selection set itself holds too few flags to set a trigger.

## Test-plan details: accepted as written, plus three additions
Status: ASSUMED
Decision: Accept the test plan's ASSUMED grading details: 1° squares for error and flags, whole regions for ranking and seasons, flags above the 2003–2011 90th percentile with at least 10 hotspots, and Aqua hotspot counts as the common unit. Also add Punjab cropland as a reported-only region, score GWIS in step 5 if its values can be exported, and show a per-region, per-calendar-month factor beside M1 as a comparator that is never picked.
Evidence: None of the grading details is a field standard, but each is defensible and had to be fixed before scoring. Punjab covers small crop fires, which no scored region does, without affecting the pick. GWIS follows the head-to-head rule for the incumbent. The comparator shows whether M1's extra detail adds anything. Decided by Akul on 7 Nov.
Revisit if: The tuning data show flags are too rare at 1°, or check D5 shows GWIS can't be exported. Any change must be made before candidates are scored on the selection set.
Update 13 Nov: the dry run on tuning data found 639 truth flags at 1°, so flags are not too rare. Check D5 (`research/data-checks.md`) found GWIS distributes burned area and fire events, not hotspots, so under this rule GWIS is recorded as "can't be scored" and is not built. Check D2 failed (the FIRMS static mask isn't distributed), so the Giglio 2006 fallback in the test plan applies.

## Scoring harness: 17 choices where the plan was silent
Status: ASSUMED
Decision: Use `tests/shared/` as the one scoring code for every candidate. Its 17 choices are listed in section 7 of `tests/README.md` (land-cell rule, tile merging, static fallback detail, day/night at 85°, percentile interpolation, Aqua history for approach flags against Terra, bootstrap aggregation, ties, Spearman edge cases, per-cell ranking at fine scales, "lowest error" among 13, tie-break 1 order, comparator fallback, 6-decimal rounding, all held-out months given at once). Keep the FIRMS `type` field as a column and don't filter on it.
Evidence: Each is the simplest reading of the plan, and none changes the sets, margin, tie-breaks or metrics. Accepted by Akul on 13 Nov. 50 unit tests pass. A dry run on tuning data reproduces the expected order: (a) far worst, (b) and the comparator close. Filtering on `type ≠ 0` would affect only 1.2% of records, and the VIIRS labels may be unreliable in version 2 files, so filtering would treat the two sensors unequally.
Revisit if: A candidate session finds the interface can't express its method. All 17 choices freeze when step 1 runs.

## Product choices from the PRD (P1, P2, P4, P9, P10)
Status: ASSUMED
Decision: These come from section 15 of the PRD (`_bmad-output/planning-artifacts/prds/prd-SpaceApps-2026-11-13/prd.md`).
- P1: the app's anomaly flag uses the scored rule on each whole 1° cell the AOI overlaps, shown as "N of M cells flagged", with no flag on the AOI total.
- P2: the historical median uses all complete prior years from 2003, and the reference period is printed on every comparison.
- P4: the record starts July 2002.
- P9: the work is split 60/40 (teammate on the data side, Akul on the frontend), and the data contract and fixture are frozen first.
- P10: the build stops at 21:00 SGT Sunday, then come the definition-of-done checks, the video and the page, and the pitch leads with Sumatra and Singapore haze.
The PRD's other proposals (P3, P5–P8, P11) stay proposals until Akul picks them.
Evidence: Chosen by Akul in the PRD session on 13 Nov. P1 keeps the flag at the scale the evidence covers.
Revisit if: The section 15 "revisit if" lines are met. For P9, that means the teammate's skills (PRD Q1) suggest a different split.

Update 13 Nov: the P9 split stands (PRD Q1 answered).

## 2A: tested without geostationary anchors
Status: ASSUMED
Decision: Test 2A (latent fire activity model with drift anchors) using FIRMS data only, with no Himawari or SEVIRI anchors. Record it as a weaker version of the approach, and keep 2A in the head-to-head.
Evidence: Check D4 (`research/data-checks.md`) found Himawari has no 2014 data and its approval can take days, SEVIRI needs an account, and neither covers the Amazon well. Testing the version as designed isn't possible before 9am on 14 Nov. Decided by Akul on 13 Nov.
Revisit if: 2A wins or comes close. In that case, adding the anchors is a post-hackathon upgrade, and the result must be described as being for the version without anchors.

## Tie-break 2 count: cells both blind reviewers marked H
Status: ASSUMED
Decision: For tie-break 2 ("more known traps handled"), an approach's count is the number of trap cells in `research/trap-review.md` that both reviewers marked H. Disagreements, P, N and ? count nothing. Counts, fixed 13 Nov before step 1: 1A 1, 1B 5, 2A 3, 2B 3, 3A 3, 3B 3, 4A 5, 4B 4, M1 1, M2 1, M3 2, M4 1, M5 1. They are passed to `run_selection --trap-counts`.
Evidence: The trap review deliberately totals nothing and leaves disagreements unresolved, but `decide.best_single` needs one number. Counting only agreed H cells is the most literal reading of "handled" and needs no judgement about disagreements. Set by the lead session before any selection scores existed.
Revisit if: Akul prefers a different count (for example P as half). Any change must be made before step 1 runs.

## Step 5 and candidate-build details (13 Nov)
Status: ASSUMED
Decision:
- Step 5 is run by `tests/run_final.py` (`tests/README.md` section 9). Its choices F1–F9 are listed there. F1: the two locked regions get a static-source mask built by the same Giglio 2006 rule from their own 2014–2021 records, all satellites, because they have no tuning years. This catches VIIRS-only gas flares in eastern Siberia.
- Before step 5 scores anything, every approach is refitted and must reproduce its step 1 selection predictions byte for byte (freeze check).
- Candidates whose `predict()` needs extra data for step 5 years or regions fetch it through an optional `prepare_final` hook, limited to Suomi NPP inputs and static maps.
- The FIRMS area API labels MODIS rows version 6.03 where the country files say 6.2 for the same days. Two test requests matched row for row, so this is treated as a label difference only.
- 1A, 1B and 2B were first built before `EARTHDATA_TOKEN` existed. The lead had them upgraded to use the Earthdata products their method text asks for, so all candidates had the same data access. The token-free versions are kept as `candidate_tokenfree.py` with their dry-run results in NOTES.md, and only the upgraded versions are scored.
- 3B left out the daily fire masks (about 27 hours of download). They feed only its own-unit view, which never decides, so its count view is unaffected.
Evidence: Lead review, 13 Nov. The freeze check and gating are covered by unit tests (76 pass), and the scoring code hash is unchanged (`1ae6e8e4f8007627`).
Revisit if: The freeze check fails for any approach, or step 5 downloads show a problem with the locked boundaries.

## Final pick rule: best of 4A, 1A and C1 beyond noise, no 5% margin
Status: ASSUMED
Decision: Step 5 scores 4A (best single), 1A and C1 (best combination) once, with the baselines. The pick is whichever of the three beats the other two on error beyond noise (the GUARDRAILS noise test) without being worse beyond noise on any other measure. If none does, the existing tie-breaks decide: a combination within noise of a single approach loses, and 4A stays ahead of 1A on tie-break 2. This replaces the 5% combination margin and the "best single only" rule for step 5. Extra build work for a more complex method is not a reason to reject it.
Evidence: Decided by Akul on 14 Nov, after selection steps 1 and 4 and before any final-set data was downloaded. Akul's reason: the goal is the best solution to a real problem, the standing rule puts quality first, and he would hold this view whatever the selection scores were. The 5% figure was a judgement call (see "Combination margin"). 4A and 1A tied on the selection set and were separated only by the trap review, and 4A is untested on unseen regions. The noise test still guards against picking on luck.
Revisit if: Never after step 5 runs. Because the pick is the best of three on the final set, the winner's final-set score is slightly optimistic; say so in one sentence wherever that score is reported.

## Selection record
Status: TESTED. Steps 1–5 ran on 13–14 Nov. The final set was used once (run `685423734cfe`, results `data/results/final_20261113T172020Z.json`).

**Candidates.** All 13 single approaches (1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, M1, M2, M3, M4, M5), baselines (a), (b) and (c), and the region-month comparator. GWIS could not be scored (check D5).

**Step 1, selection set (2015 and 2018, 28 blocks).** Error is against (b), as the median across regions, with the 95% interval. `*` means beyond noise.
- 4A 32.3% lower [17.0, 40.5]*, flag precision 0.865. 1A 30.4% lower*, 0.853. Within noise of each other on error and bias.
- 2B 12.3% lower*, M5 7.9% lower*, M1 6.4% lower*. 3A, 2A, M2 and 4B within noise of (b). 1B, M3, M4 and 3B worse than (b) beyond noise.
- No clear winner. 4A was the best single approach: lowest error, and ahead of 1A on tie-break 2.
- Files: `data/results/selection_20261113T145716Z.json`, `research/selection-step1-evidence.md`.

**Steps 3–4, combinations.** 1A beat 4A beyond noise only in the Australian fire season, and 4A beat 1A off-season in all three regions, so three combinations were built in separate subagents. All three came out as blends of 4A and 1A.
- C1 (season-dependent weights): 3.3% lower error than 4A [1.3, 5.1]*, precision 0.861.
- C3: the same design as C1, with a difference of 0.000. C1 was taken forward by the lead session, because tie-breaks 3 and 4 would have needed a blind judgement between two copies of one design.
- C2 (one flat weight): 2.9% lower than 4A*. C1 beat it beyond noise by 0.8%.
- File: `data/results/selection_20261113T151303Z.json`. The selection set was scored twice (steps 1 and 4), as the order of work requires.

**Step 5, final set (268 blocks: three tuning regions 2019 and 2021, southern Africa and Siberia 2014–2021).** Scored: 4A, 1A, C1, the baselines and the comparator. Rule: "Final pick rule" above.

| | Error vs (b) | Flag precision | Flag recall | Flags raised (truth 4,021) |
|---|---|---|---|---|
| (b) | — | 0.736 | 0.690 | 3,770 |
| 4A | 20.2% lower [12.6, 25.5]* | 0.702 | 0.791 | 4,530 |
| 1A | 19.0% lower [13.5, 22.2]* | 0.673 | 0.750 | 4,480 |
| C1 | 27.9% lower [18.6, 30.5]* | 0.704 | 0.761 | 4,343 |

- **Among the three: C1.** It beat 4A on error by 3.9% [1.7, 5.8]* and 1A by 3.2% [0.3, 6.3]*, and was not worse beyond noise than either on any other measure. The runner printed "4A" because it still applies the replaced 5% margin.
- **Against (a):** all three pass.
- **Against (b):** all three fail. Each has lower error and lower absolute bias beyond noise, and each is worse beyond noise on pooled flag precision (4A −0.034, 1A −0.063, C1 −0.032). Under test-plan section 11 this outcome reads "(b) is the conversion".
- **Against (c), Terra referee:** all three fail on precision (C1 −0.094 [−0.121, −0.065]). So do (b) and the comparator. "Record switch" above therefore applies: real Aqua through December 2021.
- **Too few flags:** not triggered.
- **Comparator (shown only, never picked):** it beat (b) on error (10.3% lower*) and on precision (+0.020*). C1 beat it on error by 18.4%* and was worse on precision by 0.052*.

**Why the losers lost.**
- 4A and 1A: C1 beat each on final-set error beyond noise. 1A was also worse than 4A beyond noise on precision and month ranking.
- C2: C1 beat it beyond noise on the selection set. C3: the same design as C1.
- 2B, M5, M1: beat (b) on the selection set, but with less than half of 4A's error reduction. M5 also failed non-inferiority to (c) on precision.
- 3A, 2A, M2, 4B: within noise of (b) on error.
- 1B (12.6% higher error than (b)*), M3 (33.8% higher*), M4 (119% higher*, recall 0.43), 3B (5.8 times (b)'s error): worse than (b) beyond noise.

**What the scores can't show.** See test-plan section 12. Because C1 is the best of three on the final set, its final-set score is slightly optimistic.

## Method: C1 for counts, kept after failing the baseline rule on flag precision
Status: TESTED for count error and bias. Deviation from the baseline rule on flag precision.
Decision: The build uses C1 to convert Suomi NPP counts into Aqua-equivalent counts. This departs from test-plan section 11, which gives (b) as the conversion when no candidate beats it on every measure. Akul decided this on 14 Nov, after the step 5 scores were seen. The write-up must not say C1 "beat the baselines". It says C1 cut count error against (b) by 27.9% on the final set and failed the flag-precision test, and that flags are unreliable in the savanna region tested.
Evidence: Final set, used once (see "Selection record"). C1's error is lower than (b)'s beyond noise, including in the two regions no method had seen. (b) runs 24% low in southern Africa and 36% high in Siberia; C1 runs 7% low and 20% high. Read after the result and without noise intervals, so weaker evidence: the pooled precision gap comes from southern Africa, where every method's flags are right less than half the time ((b) 0.46, C1 0.45, 4A 0.47) and (b) raises fewer of them (1,453 against 2,064 for C1) because it undercounts. C1's precision is at or above (b)'s in Australia, the Amazon and Siberia, and below it in Sumatra (under 50 flags) and marginally in southern Africa. Across all regions C1 catches 284 more true anomalies than (b) and raises 289 more false ones. A blend of (b) and C1 was considered and rejected: (b) adds no information C1 lacks, and no unused data is left to design or test it on.
Revisit if: Never by rescoring the final set. A new region or year with trustworthy Aqua data would be a fresh test.

## Anomaly flags: two tiers, strong at 1.5 times the threshold
Status: ASSUMED (exploratory, decided after step 5)
Decision: The calendar shows anomaly flags in two tiers. A flag is "strong" when the converted count is at least 1.5 times the cell's calendar-month threshold, and "marginal" when it is flagged below that. Counts and the flag rule itself are unchanged. The figure 1.5 was fixed before the check ran.
Evidence: `research/tier_check.py`, selection years only (2015 and 2018, three tuning regions, saved step 4 predictions, nothing fitted). For C1, strong flags were right 311 times in 332 (0.937) and marginal flags 91 in 135 (0.674), a difference of +0.263 [+0.180, +0.372] by the GUARDRAILS noise test. The gap holds in each of the three regions and at 1.25 and 2.0. Showing strong flags only would lower recall from 0.848 to 0.656. Limits: the idea came from the step 5 result, and it is not tested in southern Africa or Siberia, where the precision problem showed. The final set was not reread.
Revisit if: Reported-only data or a new region shows strong flags are no more reliable than marginal ones there. Then drop the tiers and keep the caveat.

## Demo format: deferred until after the build
Status: ASSUMED
Decision: The organisers' email (13 Nov, recorded in the brief, section 3) allows either a 30-second video or a 7-slide presentation. Akul will choose after the build, depending on which presents the solution better. Until then the plan keeps both possible: every screen and evidence figure must be exportable as an image for slides and short enough to show in a 30-second video. This answers PRD Q7 (video rules).
Evidence: Decided by Akul on 13 Nov.
Revisit if: The build finishes. The choice is Akul's.

## Architecture: prebuilt record store, read-only Python service, static web app
Status: ASSUMED
Decision: A pipeline builds an immutable, versioned record store. A read-only Python service answers the frontend from it, and holds the one implementation of every statistic. The web app only renders. The rules are AD-1 to AD-17 in `_bmad-output/planning-artifacts/architecture/architecture-SpaceApps-2026-11-14/ARCHITECTURE-SPINE.md`. Chosen by Akul on 14 Nov over static files queried in the browser.
Evidence: It fits the P9 split, because the teammate owns every number in Python. A web check on 14 Nov found no free API host confirmed to hold 5–15 GB, so the service is a stateless container that reads the store from a base path or URL, and the host is not fixed yet. The store size is an estimate, not a measurement.
Fallback, chosen by Akul on 14 Nov: a Streamlit app on Streamlit Community Cloud over the same `burncal/core`, replacing the React frontend. Its docs give up to 2.7 GB memory and 50 GB storage for free (figures dated February 2024, changeable without notice), and apps sleep after 12 hours without traffic. It was not chosen as the main route because the custom calendar, keyboard access and a distinctive look are harder there.
Revisit if: Story 1.3's test deploy or Story 2.8's measured store size shows no host can serve the API at the cost Akul accepts. Then Akul decides whether to switch to the fallback.

## After Suomi NPP: NOAA-20 alone feeds the record from 3 Nov 2026
Status: ASSUMED
Decision: One VIIRS satellite feeds any day. Suomi NPP feeds through 2 November 2026 and NOAA-20 from 3 November 2026, with C1 applied unchanged and every such month labelled as an untested satellite. NOAA-21 appears as raw counts only. Chosen by Akul on 14 Nov over averaging NOAA-20 and NOAA-21.
Evidence: None from the tests: C1 was scored on Suomi NPP only, and no comparison of NOAA-20 with MODIS was found. One feeding satellite keeps the count from changing when a satellite is added (PRD FR-1).
Revisit if: A published NOAA-20 to Suomi NPP comparison turns up, or the first NOAA-20 months show a visible step against late Suomi NPP months in the same areas.

## Static sources worldwide: the persistence rule
Status: ASSUMED
Decision: Static sources are excluded everywhere by the rule the scoring used (test plan §4: a 1 km cell with fire on 50 or more days in a year), built from 2014–2021 records of all satellites, as step 5 did for the two unseen regions (F1). Chosen by Akul on 14 Nov over the FIRMS `type` field. This answers PRD Q3 and adopts P8.
Evidence: It keeps the app's counts meaning what the evidence measured. Near-real-time data has no `type`, and VIIRS labels were unreliable before the May 2025 files. The test plan attributes the rule to Giglio et al. 2006; that attribution is `[unverified]`.
Revisit if: Building the worldwide mask proves unworkable in the build, or the paper does not support the 50-day figure.

## C1 outside the scored regions, and the current-month comparison (lead's proposals)
Status: ASSUMED. Akul accepted both proposals on 14 Nov (03:55 SGT) without changes; neither is tested
Decision:
- AD-4: inside the three tuning-region boundaries C1 uses that region's fitted rules; everywhere else it uses the pooled rules scored in southern Africa and Siberia. The fire-season mask uses the region's 2003–2011 Aqua history in the six evaluated regions and a fixed 5° tile's history elsewhere.
- AD-15: the current month is compared with the same span of days in past years (PRD P3, Q4).
Evidence: The pooled rules are what the final set scored in unseen regions. The tile rule is an untested extension; the C1 notes put the season switch at about 0.3% over a flat blend, so the choice of tile should matter little. C1's weights are per hotspot, so daily sums exist, but C1 was validated at monthly level only.
Revisit if: Akul prefers another rule, or converted counts show a visible step at a tuning-region boundary.

## Plan reviews: changes applied after Codex and the red-team (14 Nov)
Status: ASSUMED
Decision: Akul said "apply all you agree with" on 14 Nov, after the lead's merged list of both reviews. Applied to `epics.md`, the architecture spine and `TEAMMATE-HANDOFF.md`:
- Evidence wording: "lower count error than (a) and (b)", never "every baseline", because (c) is not scored on count error. The claims now carry the reported-only result, including that 4A alone passed the (b) test there while C1 did not, and the precision and recall trade-off.
- Checkpoints (see the next entry), a download-time and quota estimate before any global run, a smoke test of the pinned stack, and the harness's library versions recorded with the parity targets.
- Story 2.10, a reported-only comparison of NOAA-20 with Suomi NPP (see below), and Story 6.6, a pitch storyline drafted on Saturday with Sumatra haze as the local-impact framing.
- The savanna caveat on the map and on the gallery card (HANDOFF 3b step 7).

Rejected, with the reason:
- Codex: keep NOAA-20 out of the record. Akul already chose NOAA-20 ("After Suomi NPP"), and without it there is no current month, which the brief asks for.
- Codex: make a bounded set of regions the release criterion. That is a scope cut, and only Akul cuts scope. The checkpoints and the gate before the world run cover the risk.
- Red-team: let the browser sum grid cells as a hosting fallback. It breaks AD-8, which keeps the UI, the CSVs and the images agreeing.
- Red-team: publish 4A alone by default if parity fails. It would change the method the product runs, so it stays Akul's decision at the checkpoint.
- Red-team: hide the strong tier in unevaluated cells. AD-9 already labels it on every surface.
Evidence: The Codex output (verdict "needs attention", four findings) and the red-team report (twelve findings), both from 14 Nov. The red-team subagent saw only the brief, the three plan files and the HANDOFF section 2 numbers. No finding was tested; these are review opinions.
Revisit if: A checkpoint shows one of the rejected options is needed. Then it goes to Akul.

## Checkpoints: flags to the owner, not deadlines
Status: ASSUMED
Decision: The plan's checkpoint times (table in `epics.md`, "Checkpoints") are not hard deadlines. At each time, the session working with the story's owner tells that owner where the item stands and checks again about every hour. A missed checkpoint stops nothing and cuts nothing. Decided by Akul on 14 Nov, in place of the red-team's fixed time limits.
Evidence: Akul's instruction. The times themselves are the red-team's suggestions and the lead's, not measured.
Revisit if: The first checkpoints show the times are badly placed.

## NOAA-20 against Suomi NPP: a reported-only comparison
Status: ASSUMED (planned, not run)
Decision: Story 2.10 compares C1-converted NOAA-20 counts with C1-converted Suomi NPP counts over January 2022 to October 2026 in the six evaluated regions, using the test plan's error and bias measures. The result is shown on the current-month card and the evidence page as "reported only, not a validation against Aqua". Nothing is fitted from it, C1 stays frozen and the final set is not read.
Evidence: None yet. It answers part of the open question on NOAA-20 below and the "revisit if" of "After Suomi NPP". It shows agreement between two VIIRS satellites, not agreement with Aqua.
Revisit if: The difference is large in some region. Then Akul decides how the card words it; C1 is not adjusted.

## UI concept: Ledger + Reading
Status: ASSUMED
Decision: The interface is one ledger-style page: a headline sentence written from served values, a ruler placing this year's same-days count among past years, and the year × month grid beside them, with the limits as footnotes. The rules are in `UI-CONCEPT.md`. Chosen by Akul on 14 Nov from five concepts generated in separate subagents. It adds one contract field: each past year's count for the same days as the current month.
Evidence: The lead's scores (in `UI-CONCEPT.md`) and one throwaway mockup with invented numbers, `mockups/hero-ledger-reading.html`, checked by screenshot at 1280 px. Not tested with a user. 375 px was not verified.
Revisit if: The mockup or a user test shows the insight takes more than about 5 seconds to read.

## Globe of unusual burning: added as Tier 3 (FR-36)
Status: ASSUMED
Decision: A globe marks each 1° cell by its flag state in the harmonized record for one month, and selecting a place opens its calendar. It is a secondary view in the last tier (Stories 8.9 and 8.10). Added to scope by Akul on 14 Nov. His first idea, a globe of hotspots for a date or in real time, was not taken: FIRMS and Worldview already show that, raw hotspot dots do not show the harmonization, and "how fires behaved" claims more than detections can support.
Evidence: None. The effort (a few hours on each side) is a guess. The globe is close to empty until the world store exists.
Revisit if: The world store is not built, or the cell response for a worldwide month is too large to load in time.

## Open questions
- **Region-specific or biome-specific C1 parameters (added 14 Nov).** Should C1's parameters be fitted per region or per biome from the worldwide 2012–2021 Aqua and Suomi NPP overlap, tested on held-out years fixed beforehand? The reason to ask: C1 ran 16.8% low in southern Africa on the reported-only run, 4A did better there, and every method's flags were right less than half the time. This would be a new selection round, not a patch. C1 stays frozen for the build. Whether to add it as a labelled last-tier experiment is Akul's call.

Findings below come from `research/domain-research.md` (7 Nov). Partial answers stay open until tested.
- Does scaling hotspot counts frame the problem correctly? The tests planned for Mon 9 Nov take a count conversion for granted, so that framing must compete with alternatives. The research adds doubt without settling it: most expert work uses FRP, and the VIIRS to MODIS count ratio varies widely by area.
- Which incumbent can actually be scored head to head on the same data? INPE's single-satellite rule can be reproduced. GWIS's technical page describes no merging of the sensors, but its date coverage and regional detail still need checking in the live app.
- Are Terra and Aqua still delivering data? FIRMS lists both with no end notice, which is indirect evidence, so confirm from the data. Aqua's end date is Sept 2027; Terra's is Feb 2027 or Jan 2027 depending on the source.
- Which overlap years are a trustworthy reference? No published cutoff was found. Drift bounds the late end (last inclination adjustments: Aqua 2021, Terra 2020 or 2022), and early VIIRS bad scans may bound the early end. The provisional answer is the 2014–2021 range in the held-out data decision.
- How do NOAA-20 and NOAA-21 compare with Suomi NPP and MODIS? Suomi NPP stopped delivering on 2 Nov 2026, and no such comparison was found.
- Does the VIIRS archive have a `type` flag for volcanoes and static industrial sources? Near-real-time data has none. The sources do not settle the standard files, so check the header of one downloaded file. Partly answered 13 Nov: the standard country files for both sensors have a `type` field, but the VIIRS labels had a bug that was fixed only in v3 files (May 2025).
- How should the current month be handled when near-real-time data differs from the historical product? The differences are documented, but no published method for adjusting near-real-time counts was found.
- How much do cloud, smoke and smouldering peat bias the Singapore haze angle? Equatorial detection can be low, but nothing was quantified for peat or the region. Ask a SaRC researcher.
- What does a hold-out score prove when no independent reference exists for global counts? It shows sensor agreement, not fire truth. Landsat, ASTER and regional ground records can check parts of the result.
- What is the global data volume, and how does it affect preprocessing and hosting at $0?
- Who does what? The split of work and the teammate's skills are not stated.
- When did the challenge statement become public? The brief says resources arrive 13 Nov, but public repos for this challenge date from 10 Oct.
- At least 8 public repos already target this challenge. What would make this project stand out on Creativity? Do not read them before approaches are generated, and list any you use in the References field.
- At the 13 Nov briefing: who judges, how many teams Singapore nominates, and what Parsimoni looks for.
