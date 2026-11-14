# Harmonized burning activity calendar

NASA Space Apps 2026. A public web app: for any land area, every month from July 2002 to now, coloured by the number of satellite hotspots on one consistent scale. Real Aqua MODIS counts through December 2021; VIIRS counts converted to Aqua-equivalent by a frozen method called C1 from January 2022.

This is the product repo and it is public. The planning record (PRD, architecture, epics, selection evidence, frozen test harness) lives in a separate private repo. If a `CLAUDE.local.md` exists, read it first: it says where the planning record is on this machine and what to read.

Build stops Sunday 15 Nov 2026, 21:00 SGT. Submission closes 23:59.

## Layout

| Folder | What it is | May not |
| --- | --- | --- |
| `contract/` | `openapi.yaml`, the Sumatra fixture, shared specs. Written first. | Contain logic |
| `burncal/core/` | Pure functions: cleaning, C1, grids, statistics, flags. `params/` holds C1's frozen numbers and the parity targets. | Read files, call the network, read the clock |
| `burncal/pipeline/` | Ingest, clean, convert, aggregate, publish. The only code that holds a key. | Serve requests |
| `burncal/service/` | Read-only API over one store version; writes the CSVs. | Write the store, hold secrets, call FIRMS |
| `evidence/` | `scoring/` (score files, copied unchanged), `claims.yaml`, the evidence build. | Retype or recompute a score |
| `web/` | React app. Renders what the service returns. | Compute any number |
| `store/` | Build output, git-ignored. | Be committed |

`core` imports no other layer. Nothing imports the planning repo's test harness. `tools/check_imports.py` checks this (`uv run python tools/check_imports.py`).

## Rules

- **Commits:** ask the project lead before every commit and every push. Only the lead cuts scope.
- **Public repo:** no secrets, no local paths and no remarks about people in any committed file. Keys live in a git-ignored `.env`; never print them.
- **C1 is frozen.** Never refit it, never read or rescore the held-back final-set data, and never fit anything from test data. `burncal/core` is rebuilt from the method notes and `burncal/core/params/c1_params.json`, and must reproduce the parity targets in `burncal/core/params/parity/` within 1e-6 before any converted count is published (AD-2).
- **Claims:** never write that C1 "beat the baselines" or had lower error than "every baseline". Use the fixed sentences in `evidence/claims.yaml` (epics Story 5.1) once it exists.
- **Numbers:** every number has one implementation, in `core`; the service rounds once. The browser computes no number (AD-8).
- **Words:** the UI and docs say "hotspots", never "fires".
- **Missing is not zero:** `null` means outside the record or not loaded; `0` means no hotspots.
- **Files in `evidence/scoring/` and `burncal/core/params/` are copies.** Never edit them; each folder's `MANIFEST.json` lists their hashes.
- **Reviews** (Codex, red-team, security review, readiness checks, code review) are run by the project lead. A Codex adversarial review runs once the first working prototype runs, and a Codex review before the repo goes public.
- **Checkpoints** in the epics are flags, not deadlines. At each listed time, tell the story's owner where the item stands, then check again about every hour.
- **Usage:** one story per session, read only the files a story needs, and use subagents only for self-contained work with a clear spec.
- **UI work** follows the planning record's `UI-CONCEPT.md`.

## Where the build records live

| File | Holds |
| --- | --- |
| `DECISIONS.md` | Every build-time decision, with status (ASSUMED or TESTED), evidence and a "revisit if" line |
| `sprint-status.yaml` | Story status. This copy is the live one. |
| `docs/handoff.md` | Short running status and build log for the next session |

Keep all three current here. Never write to the planning record.

## Parity note

The harness that scored C1 ran on Python 3.12.15, numpy 2.5.4 and pandas 3.1.1. The product pins Python 3.14. If the parity check misses, check the version difference first.
