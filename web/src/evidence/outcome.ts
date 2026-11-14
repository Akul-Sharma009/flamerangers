// Story 5.3: the first screen of the evidence view.
//
// Every sentence about how C1 performed is a fixed claim from evidence/claims.yaml,
// taken from evidence.json by id and printed word for word. The words typed here
// only describe the method and the page; they hold no number (outcome.test.ts
// checks that no digit appears outside the method names C1, 4A and 1A).
import type { Claim, Evidence } from "./types";

/** The outcome: the test-plan outcome row that applies, and the recorded deviation. */
export const OUTCOME_CLAIM = "flag-precision-vs-b";
/** What the outcome means for the record. */
export const RECORD_CLAIM = "aqua-through-2021";
/** The scores the outcome rests on, in reading order. */
export const SCORE_CLAIMS = ["count-error-vs-b", "trade-off-recall", "margin-vs-4a", "best-of-three"] as const;

export interface OutcomeView {
  outcome: Claim;
  record: Claim;
  scores: Claim[];
}

/** Picks the first screen's claims. Throws if one is missing, so a renamed claim fails the tests and the page shows a problem instead of a gap. */
export function outcomeView(evidence: Evidence): OutcomeView {
  const byId = new Map(evidence.claims.map((c) => [c.id, c]));
  const pick = (id: string): Claim => {
    const claim = byId.get(id);
    if (!claim) throw new Error(`evidence.json has no claim "${id}"`);
    return claim;
  };
  return { outcome: pick(OUTCOME_CLAIM), record: pick(RECORD_CLAIM), scores: SCORE_CLAIMS.map(pick) };
}

export const COPY = {
  kicker: "Evidence",
  title: "What the test found",
  recordHeading: "What it means for the record",
  recordAfter:
    "The months after the sensor change are VIIRS counts converted by C1, the method kept as the deviation, not by one global factor.",
  scoresHeading: "The scores behind it",
  scoresNote: "Each sentence on this page about how C1 scored is one of the project's fixed claims, quoted as written.",
  methodHeading: "How C1 converts the counts",
  methodIntro:
    "After the sensor change the record is fed by VIIRS, a finer sensor that counts hotspots differently from Aqua MODIS. C1 estimates, month by month, how many hotspots Aqua MODIS would have counted. It blends two methods:",
  methodParts: [
    {
      name: "A transfer table (4A).",
      text: "For each calendar month, by day and by night, the ratio of Aqua hotspots to VIIRS hotspots, measured in years when both satellites were flying. Months with few hotspots lean on broader averages.",
    },
    {
      name: "A per-footprint detection model (1A).",
      text: "It groups VIIRS hotspots into the larger patches that one Aqua pixel covers, then estimates the chance that Aqua would have detected each patch from its fire radiative power and the viewing angle, with an allowance for hotspots Aqua sees that VIIRS does not.",
    },
  ],
  methodBlend:
    "C1 adds the two with a weight set by the fire season: one weight in an area's fire-season months and another outside them. Each area's fire season comes from its own Aqua history. Its parameters were fitted on tuning years and frozen before the final test, and are never refitted.",
  methodScope: "C1 changes only the converted months. The Aqua months are the real counts, left as they are.",
  filesHeading: "The record behind this page",
  filesIntro: "The rules were fixed before the final set was scored. Copies of the planning record are in the public repository:",
  filesPending: "This build does not know the repository's address, so the files are named without links.",
} as const;

/** The three planning files the view links to. Story 6.3 copies them into docs/planning/. */
export const RECORD_FILES = [
  { label: "Guardrails", path: "docs/planning/GUARDRAILS.md", what: "the rules the project set itself, including the definition of done" },
  { label: "Test plan", path: "docs/planning/test-plan.md", what: "the baselines, the measures and the outcome rules, fixed before scoring" },
  { label: "Selection record", path: "docs/planning/DECISIONS.md", what: "every planning decision, with its status and evidence" },
] as const;

/** A link into the public repository, or null when its address is not configured. */
export function repoLink(repoUrl: string | null, path: string): string | null {
  return repoUrl === null ? null : `${repoUrl}/blob/master/${path}`;
}
