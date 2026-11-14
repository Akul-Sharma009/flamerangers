// Story 5.6: what the scores can't show.
//
// The eight limits of the test plan's section 12, the note on the flag tiers, the
// reported-only run and the NOAA-20 comparison. Every number comes from evidence.json:
// a limit names the table, row and cell of each figure it quotes, and the reported-only
// run reuses Story 5.4's tables. The words typed here hold no number (limits.test.tsx
// checks that no digit appears outside the method and satellite names). Nothing is
// computed: the view only picks tables, rows and cells by key (AD-8).
import type { Claim, Evidence, Figure } from "./types";
import {
  DEFAULT_SCALE,
  Missing,
  POOLED,
  byYearOf,
  claimById,
  normalise,
  pairsOf,
  regionOptions,
  scaleOptions,
  scoresOf,
  tableById,
  type HeadToHeadView,
  type Option,
} from "./headToHead";

export const REPORTED_ONLY = "reported_only";
export const NOAA20 = "noaa20_check";
/** The rows of the reported-only run's tables, in Story 5.4's order. */
export const RO_ROWS = ["C1", "4A", "1A", "b", "a", "cmp"] as const;
/** The fixed claims on the reported-only run, in reading order. */
export const RO_CLAIMS = ["reported-only-vs-b", "reported-only-4a", "reported-only-regions"] as const;
/** The fixed claim on the flag tiers. */
export const TIERS_CLAIM = "tiers-not-checked-everywhere";
/** Where the reported-only run keeps its test results. */
const RO_DECISIONS = "/decisions/shown only";

/** A figure in evidence.json, by table id, row key and cell key. */
interface Ref {
  table: string;
  row: string;
  cell: string;
}
/** Part of a limit: words, a figure, a fixed claim, or the names of a set's regions. */
type Part = string | { fig: Ref } | { claim: string } | { regions: string };

const fig = (table: string, row: string, cell: string): Part => ({ fig: { table, row, cell } });
/** The last year the final set scored, as the final file lists Sumatra's years. */
const LAST_SCORED_YEAR = fig("final.years", "/years/sumatra", "1");

/** The eight limits of test plan section 12, in its order. */
export const LIMITS: { id: string; title: string; body: Part[]; years?: string }[] = [
  {
    id: "aqua-not-truth",
    title: "They show agreement with Aqua, not the truth on the ground.",
    body: [
      "Every score compares a method with Aqua MODIS hotspot counts, or with Terra's in the test against (c). Those are satellite detections, and no independent reference for hotspot counts exists worldwide. A good score means a method agrees with Aqua, not that it counts the burning on the ground correctly.",
    ],
  },
  {
    id: "drift",
    title: "They can't reward handling Aqua's drift.",
    body: [
      "The scored years stop at ",
      LAST_SCORED_YEAR,
      ". The later years, when Aqua's overpass time drifts after its last orbit adjustment, are scored only in the reported-only run below, which never changes the pick. So approaches built to handle drift, such as 1B and 2A in the first selection run, could not show that strength in the pick. One tie-break, the number of known traps an approach handles, gave them partial credit.",
    ],
  },
  {
    id: "other-satellites",
    title: "They say nothing about NOAA-20, NOAA-21 or the years before Aqua.",
    body: [
      "Every scored month converts Suomi NPP counts; NOAA-20 was not an input in any of them, though it feeds the record's newest months. ",
      { claim: "noaa20-untested" },
      " NOAA-21 never feeds the record. The years before Aqua, when only Terra flew, are not scored, and the record starts with Aqua.",
    ],
  },
  {
    id: "small-selection",
    title: "The selection set is small.",
    body: [
      "It holds ",
      { regions: "selection" },
      " in ",
      fig("selection.years", "/years", "0"),
      " and ",
      fig("selection.years", "/years", "1"),
      ". Its noise test rests on ",
      fig("selection.run", "/blocks/total", "value"),
      " blocks, each one tile in one year, which are not fully independent, so its intervals may be somewhat too narrow. Year ranking rests on ",
      fig("selection.approaches.region.sumatra", "C1", "year_pairs"),
      " pair of years in each region. A clear winner there may be chance: many approaches were compared on it, with no correction for multiple comparisons.",
    ],
  },
  {
    id: "final-late-years",
    title: "In the final set, the tuning regions have only late years.",
    body: [
      "Sumatra, Australian grassland and Amazon forest, the regions used for tuning, were scored only in years of the late overlap, so the final set's early years come only from southern Africa and Siberia, the regions held back from tuning. The years each region was scored:",
    ],
    years: "final.years",
  },
  {
    id: "drift-in-last-year",
    title: "The last scored year may include some drift.",
    body: [
      LAST_SCORED_YEAR,
      " is the last scored year, and the sources gathered for approach 2B date the change in Aqua's crossing time to the middle of that year. The record still uses real Aqua through that year.",
    ],
  },
  {
    id: "precision-margin",
    title: "The precision margin may be finer than the data can resolve.",
    body: [
      "The test against (c) lets a method's flag precision fall at most a fixed margin below that of (c). That margin may be finer than the data can resolve, even where enough flags were raised to score precision at all. Its size is in the test plan.",
    ],
  },
  {
    id: "no-cropland",
    title: "No cropland region is scored.",
    body: [
      "The challenge includes agricultural burning, but neither the selection set nor the final set holds a cropland region. Punjab, a cropland region, is only in the reported-only run below, so its results never changed the pick.",
    ],
  },
];

export const LIMITS_COPY = {
  heading: "What the scores can't show",
  intro:
    "A score shows only what was tested. These are the limits the test plan names, in its order, with what each means for this record. The few numbers in them are read from the scoring files, like every other number on this page.",
  tiersHeading: "The two flag tiers",
  tiersBefore: "The calendar shows each flag as strong or marginal.",
  reportedHeading: "The reported-only run",
  notForPick: "Not used for the pick",
  reportedIntro:
    "After the final set was scored, the same frozen methods were run once more on years outside both sets and on Punjab: years before the scored overlap, and years after the switch, which the record converts. These results never change the pick; the order of work kept them out of it before any was computed.",
  yearsHeading: "Years in this run",
  testsHeading: "The tests, applied to this run",
  testsIntro:
    "The same tests as the final pick's, for information only. A dash means the test does not apply to that row. The test against (c) uses the Terra referee.",
  testC: "non-inferior to (c)",
  scoresIntro: "Choose the region and the scale. Hover over a number to see the field of the scoring file it was read from.",
  noaaHeading: "NOAA-20 against Suomi NPP",
} as const;

export type Shown = { kind: "text"; text: string } | { kind: "fig"; f: Figure } | { kind: "claim"; claim: Claim };

export interface LimitView {
  id: string;
  title: string;
  body: Shown[];
  years: YearsRow[] | null;
}

export interface YearsRow {
  key: string;
  label: string;
  years: Figure[];
}

export interface RoTestRow {
  key: string;
  label: string;
  a: Figure | null;
  aWorseOn: Figure[];
  b: Figure | null;
  bWorseOn: Figure[];
  c: Figure | null;
}

export interface RoChoice {
  set: typeof REPORTED_ONLY;
  region: string;
  scale: string;
}

export interface ReportedOnlyView {
  choice: RoChoice;
  regions: Option[];
  scales: Option[];
  label: string;
  file: string;
  about: { key: string; label: string; figure: Figure }[];
  claims: Claim[];
  years: YearsRow[];
  tests: RoTestRow[];
  scores: HeadToHeadView["scores"];
  byYear: HeadToHeadView["byYear"];
  pairs: HeadToHeadView["pairs"];
  blocks: { label: string; figure: Figure | null }[];
}

export type Noaa20View = { ran: false } | { ran: true; label: string; file: string; rows: { key: string; label: string; figure: Figure }[] };

export interface LimitsView {
  limits: LimitView[];
  tiers: Claim;
  reported: ReportedOnlyView;
  noaa20: Noaa20View;
}

function figureAt(evidence: Evidence, ref: Ref): Figure {
  const row = tableById(evidence, ref.table).rows.find((r) => r.key === ref.row);
  const f = row?.cells[ref.cell];
  if (!f) throw new Missing(`table "${ref.table}" has no figure at row "${ref.row}", cell "${ref.cell}"`);
  return f;
}

/** The region names of a set as words: "A, B and C". */
function regionNames(evidence: Evidence, set: string): string {
  const names = regionOptions(evidence, set, DEFAULT_SCALE).filter((r) => r.key !== POOLED).map((r) => r.label);
  if (names.length === 0) throw new Missing(`evidence.json has no regions for the ${set} set`);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function yearsOf(evidence: Evidence, id: string): YearsRow[] {
  return tableById(evidence, id).rows.map((r) => ({
    key: r.key,
    label: r.label,
    years: Object.values(r.cells).filter((f): f is Figure => f !== null),
  }));
}

function limitView(evidence: Evidence, spec: (typeof LIMITS)[number]): LimitView {
  const body: Shown[] = spec.body.map((p) => {
    if (typeof p === "string") return { kind: "text", text: p };
    if ("fig" in p) return { kind: "fig", f: figureAt(evidence, p.fig) };
    if ("claim" in p) return { kind: "claim", claim: claimById(evidence, p.claim) };
    return { kind: "text", text: regionNames(evidence, p.regions) };
  });
  return { id: spec.id, title: spec.title, body, years: spec.years ? yearsOf(evidence, spec.years) : null };
}

function roTests(evidence: Evidence): RoTestRow[] {
  const rows = new Map(tableById(evidence, `${REPORTED_ONLY}.decisions`).rows.map((r) => [r.key, r.cells.value]));
  const labels = new Map(tableById(evidence, `${REPORTED_ONLY}.approaches.${DEFAULT_SCALE}.${POOLED}`).rows.map((r) => [r.key, r.label]));
  const worse = (test: string, a: string) =>
    [...rows.entries()]
      .filter(([k, v]) => k.startsWith(`${RO_DECISIONS}/${test}/${a}/worse_beyond_noise_on/`) && v)
      .map(([, v]) => v as Figure);
  return RO_ROWS.map((a) => {
    const label = labels.get(a);
    if (!label) throw new Missing(`evidence.json has no reported-only row for ${a}`);
    return {
      key: a,
      label,
      a: rows.get(`${RO_DECISIONS}/beats_a/${a}/pass`) ?? null,
      aWorseOn: worse("beats_a", a),
      b: rows.get(`${RO_DECISIONS}/beats_b/${a}/pass`) ?? null,
      bWorseOn: worse("beats_b", a),
      c: rows.get(`${RO_DECISIONS}/non_inferior_to_c/${a}/pass`) ?? null,
    };
  });
}

function reportedOnlyView(evidence: Evidence, wanted: Omit<RoChoice, "set">): ReportedOnlyView {
  const choice = normalise(evidence, { set: REPORTED_ONLY, region: wanted.region, scale: wanted.scale } as RoChoice);
  const source = evidence.sources.find((s) => s.set === REPORTED_ONLY);
  if (!source) throw new Missing("evidence.json has no reported-only source");
  const scores = scoresOf(tableById(evidence, `${REPORTED_ONLY}.approaches.${choice.scale}.${choice.region}`), RO_ROWS);
  const approaches = scores.rows.map((r) => ({ key: r.key, label: r.label }));
  return {
    choice,
    regions: regionOptions(evidence, REPORTED_ONLY, choice.scale),
    scales: scaleOptions(evidence, REPORTED_ONLY),
    label: source.label,
    file: source.file,
    about: tableById(evidence, `${REPORTED_ONLY}.about`).rows.map((r) => {
      const f = r.cells.value;
      if (!f) throw new Missing(`reported-only about row "${r.key}" has no figure`);
      return { key: r.key, label: r.label, figure: f };
    }),
    claims: RO_CLAIMS.map((id) => claimById(evidence, id)),
    years: yearsOf(evidence, `${REPORTED_ONLY}.years`),
    tests: roTests(evidence),
    scores,
    byYear: byYearOf(tableById(evidence, `${REPORTED_ONLY}.by_year`), choice.region, approaches),
    pairs: pairsOf(tableById(evidence, `${REPORTED_ONLY}.comparisons`)),
    blocks: tableById(evidence, `${REPORTED_ONLY}.run`).rows.map((r) => ({ label: r.label, figure: r.cells.value })),
  };
}

function noaa20View(evidence: Evidence): Noaa20View {
  const source = evidence.sources.find((s) => s.set === NOAA20);
  if (!source) return { ran: false };
  const rows = tableById(evidence, `${NOAA20}.figures`).rows.flatMap((r) => (r.cells.value ? [{ key: r.key, label: r.label, figure: r.cells.value }] : []));
  return { ran: true, label: source.label, file: source.file, rows };
}

/** Everything the section shows for one choice of region and scale in the reported-only run. Throws if evidence.json lacks a table, row or claim it needs. */
export function limitsView(evidence: Evidence, wanted: { region: string; scale: string }): LimitsView {
  return {
    limits: LIMITS.map((l) => limitView(evidence, l)),
    tiers: claimById(evidence, TIERS_CLAIM),
    reported: reportedOnlyView(evidence, wanted),
    noaa20: noaa20View(evidence),
  };
}

