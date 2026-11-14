# Pitch storyline (Story 6.6)

Drafted Saturday 14 Nov 2026. The demo is a 7-slide deck. The Singapore organisers accept either a 30-second video or a 7-slide deck; the project lead chose the deck on 14 Nov, because 30 seconds cannot carry the evidence (see `DECISIONS.md`). Story 6.5 turns this into the submission text and the slide images.

Rules this file keeps, and that anything made from it must keep:

- Every sentence about how C1 scored is quoted from `evidence/claims.yaml`, word for word, with its id in brackets. `docs/pitch/test_storyline.py` checks this. Shorten a claim by leaving it out, never by rewording it.
- It says "hotspots", never the other word.
- No number on a slide is typed by hand. Every count, ratio or year comes from a screen of the live app, after real counts are published (Story 2.6). Today the app still shows invented placeholder numbers; none of them may appear in the pitch.
- Haze is the reason the question matters, never something the record measures (see "Haze: what we may and may not say").
- Statements about other tools describe what they offer, with a link in the References field. They never rank other teams' projects.

## One line per judging criterion

The brief's five criteria (section 3; the Singapore email calls the first one "Impact"), each scored 1 to 5.

| Criterion | What the project shows for it | Slides |
| --- | --- | --- |
| Influence (Impact) | One public link, no login, where anyone can pick a land area and read two decades of burning on one scale, starting from a question people in Singapore already ask every haze season. | 1, 7 |
| Creativity | Where existing tools show each satellite's hotspots separately, map burned area, or keep to one reference satellite, this project joins MODIS and VIIRS into one record in Aqua units, chosen by a rule fixed before scoring, and states its own failures beside the numbers. | 2, 4, 5 |
| Validity | C1 was chosen by a rule fixed before scoring and tested on held-back years against named baselines; the results, including the tests it failed and the region where it is weak, are stated as they came out. | 5, 6 |
| Relevance | It does what the challenge asks: harmonized MODIS and VIIRS hotspots in a web app, a monthly calendar from 2002 to now, the current month against the historical median, anomalies, the busiest months and years, accessible colours, and downloads. | 3, 4 |
| Presentation | One place (Sumatra), one question (is it burning more than usual?), one answer in a sentence, then the evidence and its limits. | all |

## The story in five beats

1. **The question.** Every haze season, people in Singapore ask whether Sumatra is burning more than usual. Answering that needs a record that compares this month with the same months of past years.
2. **The problem.** Satellites have counted hotspots since 2002, but the record changes instrument: MODIS on Aqua, then VIIRS, which sees smaller hotspots `[source needed: FIRMS or VIIRS product documentation]`. Joined as they are, the years after the change are not comparable with the years before.
3. **What we built.** A calendar for any land area: every month from July 2002 to now, coloured on one scale. Real Aqua counts through December 2021; from January 2022, VIIRS counts converted to Aqua's scale by one frozen method, C1. The change is drawn as a ruled line, not hidden.
4. **The answer.** Sumatra opens by default. One sentence says how this month compares with the same days of every past year, and a ruler shows each year as a mark.
5. **Why to trust it, and where not to.** How C1 was chosen and how it scored, including the tests it failed and the region where flags are weak.

## The deck

Seven slides. Each names the criteria it serves. Pictures come from Story 6.5's exports of the live app; the words are as below.

### Slide 1: Is Sumatra burning more than usual?

*Influence, Presentation.*

- The question, over the Sumatra calendar.
- Context line on haze, from a checked source (see the haze section).
- What the answer looks like: the served current-month sentence, as one line.
- The link.

Speaker line: beat 1.

### Slide 2: One record, two instruments, and what exists today

*Relevance, Creativity.*

- The problem in one line: from 2022 the hotspot record comes from VIIRS, which sees more than MODIS did, so a raw join breaks the scale.
- What is available today, each with its link in References:
  - NASA FIRMS serves MODIS and VIIRS hotspots, each sensor as it is, and offers no harmonization or climatology tool (checked 13 Nov 2026).
  - FIRMS and Worldview map hotspot dots for a date.
  - GWIS distributes burned area, not hotspot counts, so it could not be scored against the same data.
  - INPE's operational rule keeps to one reference satellite, Aqua; that rule ends when Aqua does `[source needed: Aqua end-of-mission date]`.
- What this project does differently: one monthly record in Aqua units across the change, with the seam drawn.
- If the raw-against-harmonized view (Story 7.x, FR-25) is built, its picture; otherwise the calendar's 2021/2022 ruled line and margin note.

Speaker line: beat 2.

### Slide 3: Sumatra, 2002 to now

*Relevance.*

- The full Sumatra calendar from the live app: newest year at the top, year totals with ranks, calendar-month medians, the 2021/2022 rule.
- A short checklist of what the challenge asks and where the app does it: calendar from the early 2000s, busiest months and years, current month against the median, anomalies, accessible colours, downloads.

Speaker line: beat 3. Name the years that stand out only as the served ranks show them.

### Slide 4: This month, in one sentence

*Relevance, Creativity.*

- The current-month sentence and the ruler of past years over the same days; the record-high sentence under it.
- The anomaly view with its two flag tiers, and the download links.
- A small inset of a second area, to show any land area works.
- How it reads: a printed ledger and one sentence, not a map, KPI cards and a heat ramp.

Speaker line: beat 4.

### Slide 5: How C1 was chosen

*Validity, Creativity.*

- The process, in one line each: the rule and its margins were fixed before scoring; 13 single approaches were compared on selection years, then three combinations of the two leaders; the two leaders, 4A and 1A, and the best combination, C1, went on to held-back years never used for tuning; each faced (a) the raw splice, (b) one global factor and (c) Aqua only.
- The result, as written:

> **[count-error-vs-b]** C1 has 27.9% lower count error than one global factor, baseline (b), on the final set, 95% interval 18.6% to 30.5%, beyond noise. It also passed against the raw splice, baseline (a). Baseline (c), Aqua only, is not scored on count error.

> **[flag-precision-vs-b]** C1 failed the flag-precision test against (b): 0.704 against 0.736. Under the rule fixed beforehand the outcome was "nothing beat one global factor", and the project lead kept C1 as a recorded deviation after seeing the scores.

> **[trade-off-recall]** The trade-off: on the final set C1's flags caught more of the true anomalies than (b)'s (recall 0.761 against 0.690) and were right less often. In plain words, more true alerts and more false alarms.

> **[best-of-three]** The final-set score is slightly optimistic because C1 is the best of three.

- What a simpler method and the margin rule showed:

> **[margin-vs-4a]** On the final set C1 had 3.9% lower count error than 4A, 95% interval 1.7% to 5.8%, short of the margin fixed beforehand, so under that rule the simpler 4A was preferred; 4A also failed the flag-precision test against (b).

> **[comparator-vs-b]** On the final set, the region-month comparator, one factor per region and calendar month that was never eligible for the pick, passed the test against (b): 10.3% lower count error, 95% interval 4.1% to 10.8%, and higher flag precision (0.756 against 0.736). C1 has 18.4% lower count error than the comparator, 95% interval 8.2% to 22.8%, and lower flag precision (0.704 against 0.756), both beyond noise.

Speaker line: read the claims as written. On the deviation, point to the recorded decision (`docs/planning/`, Story 6.3); do not argue it.

### Slide 6: Where it is weaker

*Validity.*

> **[southern-africa-flags]** On the final set, flags in southern Africa were right less than half the time for every candidate method and both baselines: C1 0.453, 4A 0.473, 1A 0.408, (b) 0.459, (a) 0.164.

> **[aqua-through-2021]** Real Aqua is the record through December 2021 because every method failed against Aqua only.

> **[tiers-selection-only]** The two flag tiers were checked on selection years only.

> **[noaa20-untested]** NOAA-20 is untested against Aqua. The comparison of NOAA-20 with Suomi NPP is reported only.

- Southern Africa is the savanna region in the evaluation; the caption says so, not as a new claim.
- What the record cannot see or say: no smoke, haze or burned area; cloud, thick smoke and smouldering peat can hide burning.

Speaker line: read the claims as written.

### Slide 7: Use it

*Influence.*

- The link, no login.
- Who it is for: haze and air-quality desks, scientists who study burning, land managers.
- The NASA datasets, named and linked as Story 6.1 lists them, and how each feeds the record.
- Open code, downloads (analytics CSV, hotspots CSV, every picture), and how the current month stays up to date.

Speaker line: beat 1 again, as an invitation.

### If a judge asks (not on a slide)

The reported-only run never chose anything, but a judge who opens the evidence page will see it. Answer with these, as written:

> **[reported-only-vs-b]** Reported-only run (2012–2013, 2022–2026 and Punjab; never used for the pick), against (b): C1 has 20.2% lower count error, 95% interval 14.8% to 24.6%, and lower flag precision (0.720 against 0.738), both beyond noise. Recall is 0.695 against 0.631.

> **[reported-only-4a]** On that reported-only set 4A alone passed the (b) test (12.2% lower error, precision within noise) and C1 did not. C1 has 6.5% lower error than 4A and 0.008 lower precision. This did not change the pick, because reported-only results never do.

> **[reported-only-regions]** In southern Africa on the reported-only set, 4A did better than C1 (error 45.50 against 51.97) and C1 ran 16.8% low. In Punjab 1A did best (29.45 against C1's 31.59).

## Haze: what we may and may not say

The record holds satellite hotspot counts over land, by month and cell. It holds no smoke, haze, air quality, wind or burned area (UI concept, section 1).

May say:

- That Singapore's haze seasons are a reason people watch burning in Sumatra, stated as context with a public source in the References field `[source needed: a Singapore government or peer-reviewed source on transboundary haze]`.
- That the calendar shows when, and how much, satellites detected hotspots over Sumatra, on one scale across the instrument change.
- The question "is Sumatra burning more than usual?", answered with the served sentence.

May not say:

- That hotspots measure, cause, predict or explain haze in Singapore, or any haze level or air-quality reading.
- That a given year's or month's haze came from Sumatra. Haze also comes from other places upwind, and the record cannot attribute smoke to a source.
- That the record sees all burning. Cloud, thick smoke and smouldering peat can hide burning from the satellites, and how much that matters for Sumatra is not quantified (planning record open question).
- Which years were bad haze years, unless the source above says so. The record can only say which years had the most hotspots.

## Creativity: PRD Q8

**Status: answered in direction by the project lead, 14 Nov 2026; wording ASSUMED.** Creativity is argued against what already exists (the tools and methods people use today), never against other teams' repos. The working line is the Creativity row above. Its parts:

1. **One record across the instrument change.** FIRMS serves each sensor as it is; INPE keeps to one reference satellite. This project converts VIIRS to Aqua units so two decades read on one scale, and draws the seam instead of hiding it.
2. **Chosen by a rule fixed in advance, with the failures published.** The evidence page states the failed tests, the weak region and the optimism of the final score in the same plain words as the result.
3. **A reading, not a dashboard.** The answer is one served sentence and a ruler of each past year over the same days. FIRMS offers no climatology tool.

The statements about FIRMS, Worldview, GWIS and INPE come from the planning record's checks (13 Nov and earlier). Each needs its public link in the References field before the slide is used.

## Needs the lead

- Nothing open in the storyline itself. Slide 5 is the densest slide; check it reads at slide size when Story 6.5 lays it out.

## Decided

- Deck, not video (lead, 14 Nov).
- On the "recorded deviation" sentence, the pitch points to the recorded decision and does not argue it (lead, 14 Nov).
- Q8 is argued against existing tools and methods (lead, 14 Nov).
- Slide 5 states the comparator and margin results, with the sentences `comparator-vs-b` and `margin-vs-4a` added to `claims.yaml` (lead, 14 Nov).

## Not checked yet

- That 2015 and 2019 stand out in Sumatra's calendar, and that the calendar shows no visible step at 2022. Both are what the UI concept expects; neither has been seen on served counts. Check them on the live app after Story 2.6, and say only what the screen shows.
- "Any land area": true once Story 2.8 publishes the world. If it has not when the deck is made, say "the evaluated regions" instead.
- The `[source needed]` marks, and the links for FIRMS, Worldview, GWIS and INPE. Each must be checked and listed in the References field (Story 6.1) before the line is used.
