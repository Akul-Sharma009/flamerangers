// Story 5.4: the head-to-head table.
//
// Everything this view shows comes from evidence.json: the figures (as their
// `display`), the approach, region and scale names (row labels and table titles),
// the notes and the fixed claims. The words typed here only name columns and
// explain marks; they hold no number (headToHead.test.tsx checks that no digit
// appears outside the method names C1, 4A and 1A). Nothing is computed: the view
// only picks tables and cells by key and decides which of them to show (AD-8).
import type { Claim, Evidence, EvidenceTable, Figure } from "./types";

/** The two sets Story 5.4 shows. The reported-only set is left to Story 5.6. */
export const SETS = ["final", "selection"] as const;
export type SetKey = (typeof SETS)[number];

/** Row order: the candidates, then the baselines, then the comparator. */
export const ROW_ORDER = ["C1", "4A", "1A", "b", "a", "cmp"] as const;
/** Which approach leads a pair in the differences table; a pair's mirror is dropped. */
const PAIR_ORDER = ["C1", "4A", "1A", "cmp", "b", "a"];
/** Table ids use these keys. The decision scale for error and flags is the default. */
export const DEFAULT_SCALE = "1";
export const POOLED = "pooled";
/** The period tags the scoring files give each year. */
const PERIOD_ORDER = ["early", "late"];

export const H2H_COPY = {
  heading: "Head to head",
  intro:
    "Every approach scored on the same months against real Aqua hotspot counts. Choose the set, the region and the scale. Hover over a number to see the field of the scoring file it was read from.",
  setLegend: "Set",
  regionLegend: "Region",
  scaleLegend: "Scale",
  setNames: { final: "Final set", selection: "Selection set" },
  approachHeader: "Approach",
  noValue: "no value",
  dashNote:
    "A dash means the scoring file holds no value at this level. Flag precision has none where no flag was raised; the count beside it says so.",
  flagsRight: "right of",
  flagsRaised: "raised",
  recallOf: "of",
  recallTrue: "true anomalies",
  topOf: "top",
  pairsOf: "of",
  pairsWord: "pairs",
  differencesHeading: "Paired differences",
  differencesScope:
    "The scoring files give paired differences pooled over all regions only, so this table does not change with the region or scale chosen above.",
  pairHeader: "Pair",
  beyondMark: "◆",
  withinMark: "◇",
  beyond: "beyond noise",
  within: "within noise",
  legendBeyond: "beyond noise: the interval excludes zero",
  legendWithin: "within noise",
  leadPairs: "C1 against each of the others",
  otherPairs: "The other pairs",
  runHeading: "Blocks behind the intervals",
  finalHeading: "How the final set was used",
  ruleHeading: "The rule the final pick used",
  ruleText:
    "Under the rule fixed before scoring, a method passes the test against (a) or (b) when its count error is lower beyond noise and it is worse beyond noise on no other measure. A combination such as C1 must also beat the best single approach by the margin fixed beforehand, or the simpler approach is preferred.",
  testA: "passed the test against (a)",
  testB: "passed the test against (b)",
  worseOn: "worse beyond noise on",
  marginLine: "Margin test",
  against: "against",
  outcomeLine: "Outcome under the rule",
  selectionHeading: "How the selection set was used",
  periodWord: "Period",
  byYearScope:
    "Count error for each year, with the bias under it, grouped under the period the scoring file gives each year. The files hold these at a single scale, named in the title, whatever scale is chosen above, and with no interval.",
  yearHeader: "Region and year",
} as const;

export const CANDIDATES = ["4A", "1A", "C1"] as const;

export interface Choice {
  set: SetKey;
  region: string;
  scale: string;
}

export interface Option {
  key: string;
  label: string;
}

export interface ScoreColumn {
  key: string;
  label: string;
  unit: string | null;
  /** The figures shown under the main one, with the words between them. */
  sub: (cells: Record<string, Figure | null>) => (string | Figure | null)[] | null;
}

export interface ScoreRow {
  key: string;
  label: string;
  cells: Record<string, Figure | null>;
}

export interface PairRow {
  key: string;
  label: string;
  cells: Record<string, Figure | null>;
}

export interface FinalNotes {
  label: string;
  bestOfThree: Claim;
  margin: Claim;
  tests: { approach: string; a: Figure; aWorseOn: Figure[]; b: Figure; bWorseOn: Figure[] }[];
  marginTest: { combination: Figure; single: Figure; pass: Figure; winner: Figure };
  outcome: Figure;
}

export interface SelectionNotes {
  label: string;
  evidenceNote: Figure;
}

export interface YearGroup {
  period: Figure;
  rows: { key: string; label: string; cells: Record<string, Figure | null> }[];
}

export interface HeadToHeadView {
  choice: Choice;
  sets: Option[];
  regions: Option[];
  scales: Option[];
  scores: { title: string; columns: ScoreColumn[]; rows: ScoreRow[] };
  pairs: { columns: { key: string; label: string }[]; c1: PairRow[]; others: PairRow[]; note: string };
  blocks: { label: string; figure: Figure | null }[];
  byYear: { title: string; note: string; approaches: { key: string; label: string }[]; groups: YearGroup[] };
  final: FinalNotes | null;
  selection: SelectionNotes | null;
}

class Missing extends Error {}

function tableById(evidence: Evidence, id: string): EvidenceTable {
  const t = evidence.tables.find((x) => x.id === id);
  if (!t) throw new Missing(`evidence.json has no table "${id}"`);
  return t;
}

function claimById(evidence: Evidence, id: string): Claim {
  const c = evidence.claims.find((x) => x.id === id);
  if (!c) throw new Missing(`evidence.json has no claim "${id}"`);
  return c;
}

/** The part of a table title after its last comma: the scale ("Scores, Sumatra, 1°"). */
function titleScale(title: string): string {
  return title.slice(title.lastIndexOf(", ") + 2);
}

/** The part between the first and last comma: the region ("all regions, pooled"). */
function titleRegion(title: string): string {
  return title.slice(title.indexOf(", ") + 2, title.lastIndexOf(", "));
}

/** The scales a set has, in the build's order, from its pooled approach tables. */
export function scaleOptions(evidence: Evidence, set: SetKey): Option[] {
  const prefix = `${set}.approaches.`;
  const suffix = `.${POOLED}`;
  return evidence.tables
    .filter((t) => t.id.startsWith(prefix) && t.id.endsWith(suffix))
    .map((t) => ({ key: t.id.slice(prefix.length, -suffix.length), label: titleScale(t.title) }));
}

/** The regions a set has at a scale, pooled first, from its approach tables. */
export function regionOptions(evidence: Evidence, set: SetKey, scale: string): Option[] {
  const prefix = `${set}.approaches.${scale}.`;
  return evidence.tables
    .filter((t) => t.id.startsWith(prefix) && !t.id.slice(prefix.length).includes("."))
    .map((t) => ({ key: t.id.slice(prefix.length), label: titleRegion(t.title) }));
}

/** A choice the set holds: an unknown region or scale falls back to pooled and the default scale. */
export function normalise(evidence: Evidence, choice: Choice): Choice {
  const scales = scaleOptions(evidence, choice.set);
  const scale = scales.some((s) => s.key === choice.scale) ? choice.scale : DEFAULT_SCALE;
  const regions = regionOptions(evidence, choice.set, scale);
  const region = regions.some((r) => r.key === choice.region) ? choice.region : POOLED;
  return { set: choice.set, scale, region };
}

const sub = {
  precision: (c: Record<string, Figure | null>) => [c.flags_true, H2H_COPY.flagsRight, c.flags_raised, H2H_COPY.flagsRaised],
  recall: (c: Record<string, Figure | null>) => [H2H_COPY.recallOf, c.flags_truth, H2H_COPY.recallTrue],
  topk_overlap: (c: Record<string, Figure | null>) => (c.topk_k ? [H2H_COPY.topOf, c.topk_k] : null),
  year_pair_share: (c: Record<string, Figure | null>) => (c.year_pairs ? [H2H_COPY.pairsOf, c.year_pairs, H2H_COPY.pairsWord] : null),
} as Record<string, ScoreColumn["sub"]>;

/** The measures Story 5.4 names, in its order; the counts go under the rate they explain. */
const SCORE_KEYS = ["mae", "bias", "abs_bias_median", "precision", "recall", "spearman", "topk_overlap", "year_pair_share", "peak_month_error", "season_length_diff"];

function scoresOf(table: EvidenceTable): HeadToHeadView["scores"] {
  const byKey = new Map(table.rows.map((r) => [r.key, r]));
  const rows = ROW_ORDER.map((k) => byKey.get(k)).filter((r): r is EvidenceTable["rows"][number] => r !== undefined);
  // A measure the file holds at no row of this level (count error when pooled, the
  // median across regions for one region) is left out rather than shown as dashes.
  const columns = SCORE_KEYS.filter((key) => rows.some((r) => r.cells[key] != null)).map((key) => {
    const col = table.columns.find((c) => c.key === key);
    if (!col) throw new Missing(`table "${table.id}" has no column "${key}"`);
    return { key, label: col.label, unit: col.unit ?? null, sub: sub[key] ?? (() => null) };
  });
  return { title: table.title, columns, rows };
}

function pairsOf(table: EvidenceTable): HeadToHeadView["pairs"] {
  const rank = (name: string) => PAIR_ORDER.indexOf(name);
  const kept = table.rows.filter((r) => {
    const [first, second] = r.key.split(" vs ");
    return rank(first) >= 0 && rank(second) >= 0 && rank(first) < rank(second);
  });
  kept.sort((x, y) => {
    const [a1, a2] = x.key.split(" vs ");
    const [b1, b2] = y.key.split(" vs ");
    return rank(a1) - rank(b1) || rank(a2) - rank(b2);
  });
  return {
    columns: table.columns.map((c) => ({ key: c.key, label: c.label })),
    c1: kept.filter((r) => r.key.startsWith("C1 vs ")),
    others: kept.filter((r) => !r.key.startsWith("C1 vs ")),
    note: table.note ?? "",
  };
}

/** Each year's count error and bias, grouped by the file's period tag in the order the file gives. */
function byYearOf(table: EvidenceTable, region: string, approaches: { key: string; label: string }[]): HeadToHeadView["byYear"] {
  // Row keys are pointers like /southern_africa/2014; a region's rows start with its key.
  const rows = region === POOLED ? table.rows : table.rows.filter((r) => r.key.startsWith(`/${region}/`));
  const groups: YearGroup[] = [];
  for (const r of rows) {
    const period = r.cells.period;
    if (!period) throw new Missing(`table "${table.id}", row "${r.key}" has no period`);
    let group = groups.find((g) => g.period.display === period.display);
    if (!group) groups.push((group = { period, rows: [] }));
    group.rows.push({ key: r.key, label: r.label, cells: r.cells });
  }
  // Early overlap before late, as the story reads; any other tag keeps the file's order after them.
  const rank = (g: YearGroup) => {
    const i = PERIOD_ORDER.indexOf(String(g.period.value));
    return i < 0 ? PERIOD_ORDER.length : i;
  };
  groups.sort((x, y) => rank(x) - rank(y));
  return { title: table.title, note: table.note ?? "", approaches, groups };
}

function decision(rows: Map<string, Figure | null>, ptr: string): Figure {
  const f = rows.get(ptr);
  if (!f) throw new Missing(`evidence.json has no decision "${ptr}"`);
  return f;
}

function finalNotes(evidence: Evidence, label: string): FinalNotes {
  const rows = new Map(tableById(evidence, "final.decisions").rows.map((r) => [r.key, r.cells.value]));
  const worse = (test: string, a: string) =>
    [...rows.entries()]
      .filter(([k, v]) => k.startsWith(`/decisions/final/${test}/${a}/worse_beyond_noise_on/`) && v)
      .map(([, v]) => v as Figure);
  return {
    label,
    bestOfThree: claimById(evidence, "best-of-three"),
    margin: claimById(evidence, "margin-vs-4a"),
    tests: CANDIDATES.map((a) => ({
      approach: a,
      a: decision(rows, `/decisions/final/beats_a/${a}/pass`),
      aWorseOn: worse("beats_a", a),
      b: decision(rows, `/decisions/final/beats_b/${a}/pass`),
      bWorseOn: worse("beats_b", a),
    })),
    marginTest: {
      combination: decision(rows, "/decisions/final/margin/combination"),
      single: decision(rows, "/decisions/final/margin/single"),
      pass: decision(rows, "/decisions/final/margin/pass"),
      winner: decision(rows, "/decisions/final/margin/winner"),
    },
    outcome: decision(rows, "/decisions/final/outcome"),
  };
}

function selectionNotes(evidence: Evidence, label: string): SelectionNotes {
  // The final run's own note on the selection set.
  const rows = new Map(tableById(evidence, "final.decisions").rows.map((r) => [r.key, r.cells.value]));
  return { label, evidenceNote: decision(rows, "/decisions/final/evidence_note") };
}

/** Everything the head-to-head section shows for one choice. Throws if evidence.json lacks a table or claim it needs. */
export function headToHeadView(evidence: Evidence, wanted: Choice): HeadToHeadView {
  const choice = normalise(evidence, wanted);
  const source = evidence.sources.find((s) => s.set === choice.set);
  if (!source) throw new Missing(`evidence.json has no source for the ${choice.set} set`);
  const run = tableById(evidence, `${choice.set}.run`);
  const scores = scoresOf(tableById(evidence, `${choice.set}.approaches.${choice.scale}.${choice.region}`));
  const approaches = scores.rows.map((r) => ({ key: r.key, label: r.label }));
  return {
    choice,
    sets: SETS.map((s) => ({ key: s, label: H2H_COPY.setNames[s] })),
    regions: regionOptions(evidence, choice.set, choice.scale),
    scales: scaleOptions(evidence, choice.set),
    scores,
    pairs: pairsOf(tableById(evidence, `${choice.set}.comparisons`)),
    blocks: run.rows.map((r) => ({ label: r.label, figure: r.cells.value })),
    byYear: byYearOf(tableById(evidence, `${choice.set}.by_year`), choice.region, approaches),
    final: choice.set === "final" ? finalNotes(evidence, source.label) : null,
    selection: choice.set === "selection" ? selectionNotes(evidence, source.label) : null,
  };
}

/** The scoring-file field a figure was read from, for its tooltip. */
export function sourceOf(f: Figure): string {
  return `${f.source.file}#${f.source.pointer}`;
}
