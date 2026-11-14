# Demo assets: what to capture (Story 6.5)

A shot list for the 7-slide deck in `docs/pitch/storyline.md`, so the images can be made quickly once the app is deployed. Nothing here is captured yet.

## Before capturing

- The deployed app, answering from a published record: `/meta` says `placeholder: false` [pending: web address; real service on Vercel, `docs/handoff.md` Next, item 2]. Fixture numbers are invented and must never appear in the deck.
- Converted counts are public only after the parity gate passes at publish (AD-2).
- Built with `VITE_REPO_URL` set, so the evidence page links its planning files.
- Capture at 1280 × 800 for slides, and one phone shot at 375 × 812. Light theme, browser zoom 100%, no cursor, no dev tools.
- Every number on a slide is read off a screenshot. None is typed by hand.

## Shots, in deck order

| # | Slide | Screen and area | What must be visible | Waits on |
| --- | --- | --- | --- | --- |
| 1 | 1 | Calendar, Sumatra (opens by default), whole record | The full grid behind the title; the current-month card's headline | Real counts; card sentence (contract 0.4.0) |
| 2 | 2 | Calendar, Sumatra, crop on 2019 to 2024 | The ruled line between December 2021 and January 2022 and its note | Real counts. Use Story 7.2's raw-against-harmonized view instead if it is built |
| 3 | 3 | Calendar, Sumatra, whole record | Newest year on top, year totals with rank rings, the medians row, the legend | Real counts; Story 3.9 if the busiest months and years get their own view |
| 4 | 3 | Phone, 375 px, Sumatra | The same calendar at phone width | Story 3.10 |
| 5 | 4 | Current-month card, Sumatra | Headline sentence, the ruler of past years with the median tick, the record-high sentence | Contract 0.4.0 sentences; Story 2.9 for a current month refreshed daily |
| 6 | 4 | Anomaly view, Sumatra | Both flag tiers | Story 3.8 |
| 7 | 4 | Download controls | The analytics CSV, hotspots CSV and picture links | Stories 4.3, 4.4 |
| 8 | 4 (inset) | Calendar, a second area | Any land area works | Story 2.8. Use an evaluated region (Punjab is in the featured list); otherwise drop the inset and say "the evaluated regions" |
| 9 | 4 (inset) | Area picker, drawing tab | A drawn polygon on the map | Nothing: on `master` today |
| 10 | 5 | Evidence page, first screen | The outcome (`flag-precision-vs-b`) and "The scores behind it" | Nothing: on `master` today |
| 11 | 5 | Evidence page, head-to-head, final set, pooled, 1° | Every method's scores and the paired differences with intervals | Nothing: on `master` today |
| 12 | 6 | Evidence page, head-to-head, final set, southern Africa | The region's flag precision for every method | Nothing: on `master` today |
| 13 | 6 | Evidence page, limits section | What the scores can't show | Story 5.6 |
| 14 | 7 | Calendar, Sumatra, with the address bar | The link, no login | Web address |

Shots 10 to 12 can be taken now from a local build (`cd web && npm run build && npm run preview`), because the evidence page reads `evidence.json`, not the service.

## The Sumatra journey (optional 30-second recording)

The lead chose the deck, so a recording is optional. If one is made, in this order: the calendar opens on Sumatra (3 s); the eye goes down the grid to the ruled line (5 s); hover September of a high year to show its count and provenance (5 s); scroll to the current-month card and its ruler (7 s); open "Change area", draw a box elsewhere and the calendar reloads (5 s); end on the evidence page's outcome (5 s). It needs shots 1, 2, 5 and 10 to be ready, and real counts.
