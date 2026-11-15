# Submission text (Story 6.5, draft)

Drafted Sunday 15 Nov 2026 from `master` at the Story 3.7 merge. A draft for the project lead; nothing here is submitted yet.

How to use it:

- Each form field is one section below. The text to paste sits between the `field` comments.
- Every sentence about how C1 scored is quoted from `evidence/claims.yaml`, word for word, with its id in bold brackets. When pasting, drop the `**[id]**` label and keep the sentence unchanged. Shorten by leaving a claim out, never by rewording it. `docs/submission/test_text.py` checks the quotes, the banned words and the word counts.
- `[pending: ...]` marks text that waits for something not on `master` yet. Fill it, or cut the sentence, before submitting. Nothing marked pending is described as if it existed.
- It says "hotspots" throughout. Official product names and citations are used exactly as published, even where they contain the other word (decided by the lead, 15 Nov); Story 6.1 supplies them.

**Limits.** Story 6.5 gives no word or character limit, and neither does the brief's list of fields (the Singapore organisers' email of 13 Nov names Project Summary, Project Demo, Final Project Link and Project Details; the judging guide adds References and the Members tab). Each section states its word count, counted as pasted (labels dropped, pending markers counted as they stand). Check the live form for limits before pasting.

## 1. Project name

<!-- field:name -->
Harmonized burning activity calendar
<!-- /field:name -->

Words: 4. The repository's title; the lead may want a shorter name.

## 2. Challenge

<!-- field:challenge -->
Harmonization of MODIS and VIIRS Hot Spots
<!-- /field:challenge -->

Words: 7. The challenge title as the brief gives it.

## 3. Project Summary

What the organisers ask for: the solution, the problem it addresses, and its impact.

<!-- field:summary -->
Every haze season, people in Singapore ask whether Sumatra is burning more than usual [pending: Story 6.1, a checked source on transboundary haze]. Answering that needs a record that compares this month with the same months of past years. Satellites have counted hotspots since 2002, but the record changes instrument: Aqua MODIS, then VIIRS, a finer sensor that counts hotspots differently [pending: Story 6.1, product documentation]. Joined as they are, the years after the change do not read on the same scale as the years before.

We built a public web calendar of satellite hotspots: every month from July 2002 to now for a chosen land area, coloured on one scale. It holds real Aqua MODIS counts through December 2021 and, from January 2022, VIIRS counts converted to Aqua-equivalent by one frozen method, C1. The change is drawn as a ruled line, not hidden. Sumatra opens by default, and a current-month card sets this month so far against the same days of every past year.

C1 was chosen by a rule fixed before scoring and tested on held-back years against named baselines. The results are stated as they came out:

> **[count-error-vs-b]** C1 has 27.9% lower count error than one global factor, baseline (b), on the final set, 95% interval 18.6% to 30.5%, beyond noise. It also passed against the raw splice, baseline (a). Baseline (c), Aqua only, is not scored on count error.

> **[flag-precision-vs-b]** C1 failed the flag-precision test against (b): 0.704 against 0.736. Under the rule fixed beforehand the outcome was "nothing beat one global factor", and the project lead kept C1 as a recorded deviation after seeing the scores.

The impact is one public link, with no login, where haze and air-quality desks, scientists who study burning and land managers can read two decades of hotspots on one scale [pending: web address]. Today the published record covers Sumatra; the evaluated regions [pending: Story 2.8] and a current month refreshed daily [pending: Story 2.9] are still to come.
<!-- /field:summary -->

Words: 327.

## 4. Project Demo

The organisers accept either a 30-second video or a 7-slide deck. The lead chose the deck on 14 Nov (`DECISIONS.md`); its slides and words are in `docs/pitch/storyline.md`.

<!-- field:demo -->
A 7-slide deck: the question, the instrument change and what exists today, Sumatra from 2002 to now, this month in one sentence, how C1 was chosen, where it is weaker, and how to use it. [pending: Story 6.5 demo assets, made from the deployed app]
<!-- /field:demo -->

Words: 45. The deck itself is the field's content; this line only describes it if the form asks for one. What the slides need is in `docs/submission/demo-assets.md`.

## 5. Final Project Link

Must be publicly accessible.

<!-- field:link -->
[pending: web address]
<!-- /field:link -->

Words: 3. The service runs on Vercel; the web app's host is not chosen yet. The hosted service still answers from the fixture until the data owner redeploys it with a published record (`docs/handoff.md`, Next, item 2).

## 6. Project Details

What the organisers ask for: approach, tools, technologies and NASA datasets used.

<!-- field:details -->
**What it does.** The calendar page draws a year-by-month grid for the chosen land area, newest year at the top, each month coloured by its hotspot count on one scale. Year totals with their ranks end each row and calendar-month medians foot each column. The switch from Aqua MODIS to converted VIIRS, between December 2021 and January 2022, is a ruled line with a note. Months outside the record are hatched, so they never look like zero; near-real-time, incomplete and range-cut months carry marks that do not rely on colour. Every month shows its exact served count and provenance on hover, focus or tap, and the same data is available as a table. The reader picks a featured area, draws one on a map, or types its coordinates, and can narrow the dates. A current-month card gives the count so far, the median for the same days of past years and a ruler with one mark per past year. An evidence page states the outcome in plain words and holds a head-to-head table of every scored method. The service also writes an analytics CSV and a hotspots CSV for any search.

Still to come: per-cell provenance and caveats [pending: Story 3.6], the anomaly view [pending: Story 3.8], the most active months and years [pending: Story 3.9], an accessibility and phone-width pass [pending: Story 3.10], download controls and picture downloads [pending: Story 4.3, Story 4.4], and the evidence page's Aqua-only, limits and about-the-data sections [pending: Story 5.5, Story 5.6, Story 5.7].

**How it works.** A pipeline downloads hotspots per satellite from NASA FIRMS, in standard and near-real-time form; standard data replaces near-real-time data for each satellite-day. Every row is kept with its attributes; offshore rows and persistent static heat sources are marked, not deleted. Through December 2021 the record is the real Aqua MODIS count. From January 2022 each VIIRS hotspot is weighted by C1, so a month's weights add up to an Aqua-equivalent count. C1 blends two methods: a transfer table of Aqua-to-VIIRS ratios per calendar month, by day and by night, measured in years when both satellites flew; and a per-footprint detection model that groups VIIRS hotspots into the patches one Aqua pixel covers and estimates the chance Aqua would have detected each, from radiative power and viewing angle. The blend weight differs inside and outside each area's burning season. C1's parameters were fitted on tuning years and frozen; the product's code was rebuilt from the method notes and reproduces the scored predictions within 1e-6. The pipeline grids the record at 1° and 0.25°, computes the statistics and two tiers of anomaly flags, and publishes a versioned store. A read-only service answers the web app and writes the CSVs; every number has one implementation and the browser computes none. A check confirms the calendar, the analytics CSV and the hotspot rows agree.

**How C1 was chosen.** The rule and its margins were fixed before scoring. Thirteen single approaches were compared on selection years, then three combinations of the two leaders. The two leaders, 4A and 1A, and the best combination, C1, went on to held-back years never used for tuning, each against (a) the raw splice, (b) one global factor and (c) Aqua only.

> **[count-error-vs-b]** C1 has 27.9% lower count error than one global factor, baseline (b), on the final set, 95% interval 18.6% to 30.5%, beyond noise. It also passed against the raw splice, baseline (a). Baseline (c), Aqua only, is not scored on count error.

> **[flag-precision-vs-b]** C1 failed the flag-precision test against (b): 0.704 against 0.736. Under the rule fixed beforehand the outcome was "nothing beat one global factor", and the project lead kept C1 as a recorded deviation after seeing the scores.

> **[trade-off-recall]** The trade-off: on the final set C1's flags caught more of the true anomalies than (b)'s (recall 0.761 against 0.690) and were right less often. In plain words, more true alerts and more false alarms.

> **[margin-vs-4a]** On the final set C1 had 3.9% lower count error than 4A, 95% interval 1.7% to 5.8%, short of the margin fixed beforehand, so under that rule the simpler 4A was preferred; 4A also failed the flag-precision test against (b).

> **[comparator-vs-b]** On the final set, the region-month comparator, one factor per region and calendar month that was never eligible for the pick, passed the test against (b): 10.3% lower count error, 95% interval 4.1% to 10.8%, and higher flag precision (0.756 against 0.736). C1 has 18.4% lower count error than the comparator, 95% interval 8.2% to 22.8%, and lower flag precision (0.704 against 0.756), both beyond noise.

> **[best-of-three]** The final-set score is slightly optimistic because C1 is the best of three.

**Where it is weaker.**

> **[southern-africa-flags]** On the final set, flags in southern Africa were right less than half the time for every candidate method and both baselines: C1 0.453, 4A 0.473, 1A 0.408, (b) 0.459, (a) 0.164.

> **[aqua-through-2021]** Real Aqua is the record through December 2021 because every method failed against Aqua only.

> **[tiers-selection-only]** The two flag tiers were checked on selection years only.

> **[noaa20-untested]** NOAA-20 is untested against Aqua. The comparison of NOAA-20 with Suomi NPP is reported only.

The record holds satellite hotspot counts over land. It holds no smoke, haze, air quality or burned area, and cloud, thick smoke and smouldering peat can hide burning from the satellites.

**What exists today.** NASA FIRMS serves MODIS and VIIRS hotspots, each sensor as it is, and offers no harmonization or climatology tool; FIRMS and Worldview map hotspot dots for a date; GWIS distributes burned area, not hotspot counts; INPE's operational rule keeps to one reference satellite, Aqua [pending: Story 6.1, links for FIRMS, Worldview, GWIS and INPE]. This project joins MODIS and VIIRS into one monthly record in Aqua units, chosen by a rule fixed before scoring, and states its own failures beside the numbers.

**Tools and technologies.** Python 3.14 with uv, FastAPI, Uvicorn, DuckDB, PyArrow, Shapely, NumPy and pandas for the pipeline and the service; React, TypeScript, Vite, D3, MapLibre GL, Terra Draw, topojson-client and world-atlas (Natural Earth land outlines) for the web app; pytest, Vitest and Playwright for tests; gitleaks for secret scanning; Vercel hosts the service. The code is open in the public repository [pending: repository address].

**NASA datasets.** [pending: Story 6.1]. Named in field 7.
<!-- /field:details -->

Words: 1034. Long; if the form has a limit, cut "Still to come", "What exists today" and the `comparator-vs-b` claim first.

## 7. NASA data

The brief: name each NASA dataset, give its source link, and explain how it supports the solution. Story 6.1 (the data owner drafts, the lead reviews) writes this field. What 6.1 lists, from its criteria: the MODIS and VIIRS hotspot products from FIRMS, in standard and near-real-time form, per satellite; and the VIIRS swath product used to fit C1. Each with its source link, its required citation, and one or two sentences on its use.

<!-- field:nasa-data -->
[pending: Story 6.1]
<!-- /field:nasa-data -->

Words: 3.

## 8. References

Every external resource: code, text, images, even open source. Story 6.1 writes this field: the datasets, Natural Earth, the papers cited, every open-source library and any public repository consulted, each checked against its source or marked `[unverified]`.

Items this draft relies on, for 6.1 to cover: a checked source on Singapore's transboundary haze (summary); product documentation for the MODIS and VIIRS hotspot products (summary); public links for FIRMS, Worldview, GWIS and INPE's reference-satellite rule (details); Natural Earth, through world-atlas (details); and each library named under "Tools and technologies".

<!-- field:references -->
[pending: Story 6.1]
<!-- /field:references -->

Words: 3.

## 9. Members tab and project link

Not text, but on the submission checklist (Story 6.5, AC3; the judging guide):

- [ ] Both team members on the Members tab, each registered with the local event chosen. No member can be added after submission closes.
- [ ] The project page is public and the Final Project Link (field 5) opens without a login.
- [ ] All required fields filled in English.
- [ ] Submitted before 23:59 SGT, Sunday 15 Nov.

## Needs the lead

1. **Decided 15 Nov: approved.** **Two claims in the summary.** The summary quotes `count-error-vs-b` and `flag-precision-vs-b` only, so the failed test sits right beside the result. The details field quotes ten of the thirteen claims; the three reported-only ones are left for questions, as in the storyline.
2. **Decided 15 Nov: approved.** **"The impact is one public link …"** (summary, last paragraph): typed wording, adapted from the storyline's Influence line.
3. **Decided 15 Nov: exempt.** **Product names.** Official dataset names and citations are used as published; everything the project writes itself says "hotspots".
4. **Use of AI.** The brief's field list does not mention one, but if the live form has a field on the use of AI tools, it needs your wording. This draft has none.
5. **Decided 15 Nov: approved.** **Project name** (field 1): kept as the repository's title.
6. **Wording that depends on unfinished work.** "Any land area" is not used: today the published record covers Sumatra. If Story 2.8 publishes the evaluated regions before submission, the summary's last sentence changes.
