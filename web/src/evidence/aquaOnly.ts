// Story 5.5: Aqua only and the incumbent.
//
// Everything this section shows comes from evidence.json: the Terra-referee score
// tables with (c), the paired differences against (c), every non-inferiority check in
// the scoring files' `decisions`, the GWIS result and the fixed claim on what the
// record keeps. The words typed here explain the test and name columns; they hold no
// number (aquaOnly.test.tsx checks that no digit appears outside the method names C1,
// 4A and 1A). Nothing is computed: the view only picks tables, rows and cells by key
// (AD-8).
import type { Claim, Evidence, Figure } from "./types";
import {
  DEFAULT_SCALE,
  H2H_COPY,
  Missing,
  POOLED,
  SETS,
  claimById,
  normalise,
  regionOptions,
  scaleOptions,
  scoresOf,
  tableById,
  type Choice,
  type HeadToHeadView,
  type Option,
} from "./headToHead";

/** The incumbent first, then the rows in Story 5.4's order. */
export const REFEREE_ROW_ORDER = ["c", "C1", "4A", "1A", "b", "a", "cmp"] as const;
/** The approaches tested against (c): the candidates, then the baselines and the comparator. */
export const CANDIDATES = ["C1", "4A", "1A"] as const;
export const OTHERS = ["b", "a", "cmp"] as const;
/** The four checks of the non-inferiority test, as the scoring files name them. */
export const CHECKS = ["precision", "spearman", "peak_month", "season_length"] as const;
/** What the record keeps: real Aqua through the switch. */
export const RECORD_CLAIM = "aqua-through-2021";
/** The test against (c) on the final set, as a fixed claim. */
export const TEST_CLAIM = "aqua-only-every-method-failed-precision";
/** The final run's result for GWIS. */
export const GWIS_POINTER = "/decisions/final/gwis";

/**
 * Where each set keeps its non-inferiority results. The final run splits them: the
 * candidates' results under `final` (the pick rule), everyone's under `not used for
 * the pick`. The first prefix that holds an approach is used.
 */
const DECISION_PREFIXES: Record<(typeof SETS)[number], { prefix: string; forPick: boolean | null }[]> = {
  final: [
    { prefix: "/decisions/final/non_inferior_to_c", forPick: true },
    { prefix: "/decisions/not used for the pick/non_inferior_to_c", forPick: false },
  ],
  selection: [{ prefix: "/decisions/non_inferior_to_c", forPick: null }],
};

export const AQUA_COPY = {
  heading: "Aqua only and the incumbent",
  intro:
    "The usual way to keep a long hotspot record is to read one satellite and keep reading it. Baseline (c), Aqua only, is that rule: Aqua MODIS counts alone, with no conversion. It is also the rule INPE's Queimadas programme uses for its series, so that incumbent is scored once, as (c).",
  recordHeading: "What the record keeps from Aqua only",
  recordAfter:
    "After the switch the record does not fall back on Aqua only: Aqua is less reliable after its last orbit adjustment, and Aqua only has no values once the satellite stops.",
  whyHeading: "Why (c) is tested for non-inferiority",
  why: [
    "Scored against real Aqua counts, Aqua only would be perfect, because it is the answer key. So for (c) the truth is Terra, the other satellite that carries MODIS, with flags drawn from Terra's own history.",
    "Terra carries the same instrument and detection algorithm as Aqua, so this referee still favours (c): a converted VIIRS estimate can hardly beat it, and a test whose answer is known in advance cannot tell methods apart. Terra stays the referee because it is the only independent record in MODIS units; judging VIIRS-based estimates against VIIRS would be circular.",
    "So the rule fixed before scoring asks whether a method is no worse than (c), not whether it beats it. Its flag precision and its month-rank correlation must each be no more than a fixed margin below those of (c), with the whole interval of each difference above that margin, and its peak month and season length must not be worse beyond noise. This is a non-inferiority test, a standard design in clinical trials. The margin is stated in the test plan. (c) is still reported in full below.",
  ],
  testHeading: "The test against (c)",
  testIntro:
    "Yes means the method passed that check. Under each result is the paired difference against (c), against the Terra referee, with its interval. The final pick used the final set; the selection set is shown beside it.",
  approachHeader: "Approach",
  passHeader: "non-inferior to (c)",
  candidatesGroup: "The candidates",
  othersGroup: "The baselines and the comparator",
  forPickNote:
    "On the final set only the candidates' results count toward the pick. The baselines' and the comparator's come from the part of the scoring file marked not used for the pick.",
  refereeHeading: "Aqua only in full",
  refereeIntro:
    "Every approach and (c) scored against the Terra referee. Choose the set, the region and the scale. Hover over a number to see the field of the scoring file it was read from.",
  otherHeading: "The other incumbents",
  gwisName: "GWIS, the Global Wildfire Information System",
  gwisReason:
    "Its exportable files hold burned area and fire events, not hotspot counts, so it has nothing to score in the unit of this record. Its values were not read off its charts.",
  firmsName: "NASA FIRMS",
  firmsReason:
    "It distributes each satellite's hotspots separately. It provides this record's inputs, not a single series, so it has nothing of its own to score.",
} as const;

export interface CheckCell {
  key: string;
  /** Passed this check (yes or no). */
  result: Figure;
  /** The paired difference against (c), with its interval and beyond-noise mark. */
  diff: Figure | null;
}

export interface TestRow {
  key: string;
  label: string;
  pass: Figure;
  checks: CheckCell[];
  /** On the final set: true when the result is the pick rule's, false when not used for the pick. */
  forPick: boolean | null;
}

export interface AquaOnlyView {
  choice: Choice;
  sets: Option[];
  regions: Option[];
  scales: Option[];
  setLabel: string;
  record: Claim;
  test: { claim: Claim; checks: { key: string; label: string }[]; candidates: TestRow[]; others: TestRow[]; note: string; hasNotForPick: boolean };
  referee: HeadToHeadView["scores"] & { note: string };
  gwis: Figure;
}

function testRows(evidence: Evidence, set: Choice["set"], names: readonly string[]): TestRow[] {
  const decisions = new Map(tableById(evidence, `${set}.decisions`).rows.map((r) => [r.key, r.cells.value]));
  const pairs = new Map(tableById(evidence, `${set}.comparisons.terra`).rows.map((r) => [r.key, r.cells]));
  const labels = new Map(tableById(evidence, `${set}.terra.${DEFAULT_SCALE}.${POOLED}`).rows.map((r) => [r.key, r.label]));
  return names.map((a) => {
    const at = DECISION_PREFIXES[set].find((p) => decisions.get(`${p.prefix}/${a}/pass`));
    if (!at) throw new Missing(`evidence.json has no non-inferiority result for ${a} on the ${set} set`);
    const base = `${at.prefix}/${a}`;
    const diffs = pairs.get(`${a} vs c (Terra referee)`);
    if (!diffs) throw new Missing(`evidence.json has no Terra-referee difference for ${a} on the ${set} set`);
    const label = labels.get(a);
    if (!label) throw new Missing(`evidence.json has no Terra-referee row for ${a} on the ${set} set`);
    return {
      key: a,
      label,
      pass: decisions.get(`${base}/pass`)!,
      checks: CHECKS.map((c) => {
        const result = decisions.get(`${base}/checks/${c}`);
        if (!result) throw new Missing(`evidence.json has no ${c} check for ${a} on the ${set} set`);
        return { key: c, result, diff: diffs[c] ?? null };
      }),
      forPick: at.forPick,
    };
  });
}

/** Everything the Aqua-only section shows for one choice. Throws if evidence.json lacks a table, row or claim it needs. */
export function aquaOnlyView(evidence: Evidence, wanted: Choice): AquaOnlyView {
  const choice = normalise(evidence, wanted, "terra");
  const source = evidence.sources.find((s) => s.set === choice.set);
  if (!source) throw new Missing(`evidence.json has no source for the ${choice.set} set`);
  const pairs = tableById(evidence, `${choice.set}.comparisons.terra`);
  const refereeTable = tableById(evidence, `${choice.set}.terra.${choice.scale}.${choice.region}`);
  const finalDecisions = new Map(tableById(evidence, "final.decisions").rows.map((r) => [r.key, r.cells.value]));
  const gwis = finalDecisions.get(GWIS_POINTER);
  if (!gwis) throw new Missing(`evidence.json has no decision "${GWIS_POINTER}"`);
  const candidates = testRows(evidence, choice.set, CANDIDATES);
  const others = testRows(evidence, choice.set, OTHERS);
  return {
    choice,
    sets: SETS.map((s) => ({ key: s, label: H2H_COPY.setNames[s] })),
    regions: regionOptions(evidence, choice.set, choice.scale, "terra"),
    scales: scaleOptions(evidence, choice.set, "terra"),
    setLabel: source.label,
    record: claimById(evidence, RECORD_CLAIM),
    test: {
      claim: claimById(evidence, TEST_CLAIM),
      checks: CHECKS.map((c) => {
        const col = pairs.columns.find((x) => x.key === c);
        if (!col) throw new Missing(`table "${pairs.id}" has no column "${c}"`);
        return { key: c, label: col.label };
      }),
      candidates,
      others,
      note: pairs.note ?? "",
      hasNotForPick: [...candidates, ...others].some((r) => r.forPick === false),
    },
    referee: { ...scoresOf(refereeTable, REFEREE_ROW_ORDER), note: refereeTable.note ?? "" },
    gwis,
  };
}
