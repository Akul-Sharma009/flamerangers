// Pure view model for the calendar grid and its table view. No DOM and no
// arithmetic on served numbers (AD-8): values are grouped, looked up and
// formatted only. Every mark a month carries is read from a served field.
import type { components } from "../api/schema";
import { messages } from "../api/messages";
import { MONTH_NAMES, formatCount, formatYearMonth, parseYearMonth } from "../format";
import {
  anomalyLabel, anomalyLine, anomalyScaleText, buildAnomalyClasses, flagCounts, flagLines, gridSentences, neutralIndex, periodLines, toneOf,
  type AnomalyClass, type GridSentences, type Measure, type Periods, type Tone,
} from "./anomaly";

export type { GridSentences, Measure, Tone } from "./anomaly";

type S = components["schemas"];
export type Calendar = S["Calendar"];
export type Meta = S["Meta"];
type Month = S["Month"];
type NullReason = S["NullReason"];
type PartialReason = S["PartialReason"];
type Quality = S["Quality"];
type YearTotal = S["YearTotal"];

/**
 * Text marks a month can carry, in the order they are written after its count.
 * Printed statistical tables mark figures the same way; the legend and the
 * table's key give the sentence for each (from messages.yaml).
 */
export const MARKS = {
  /** A feeding input is near real time. */
  nrt: "n",
  /** The record starts in this month, or input days are missing. */
  incomplete: "*",
  /** The date range cuts this month; the count is the whole month's. */
  cut: "c",
} as const;
export type MarkKey = keyof typeof MARKS;

export interface CellModel {
  month: string;
  /** Served count, or null (outside the record / not loaded). 0 is a count. */
  count: number | null;
  colourClass: number | null;
  nullReason: NullReason | null;
  /** "count" for any served count including 0, else the null reason. */
  state: "count" | NullReason;
  monthToDate: boolean;
  nrt: boolean;
  incomplete: boolean;
  cut: boolean;
  /** Served `complete`. */
  complete: boolean;
  /** A counted month whose feeding satellite was not part of the validation (served validated_satellite false). */
  unvalidated: boolean;
  /** A converted month: outside the years used to choose the method. */
  afterPick: boolean;
  /** The month the feeding VIIRS satellite changes (meta.satellite_switch); marked on the grid. */
  satelliteSwitch: boolean;
  flag: "strong" | "marginal" | null;
  /** The count as shown: formatted, or "–" for null. */
  label: string;
  /** Text marks after the count, e.g. "n*c". Empty when none. */
  marks: string;
  /** Exact count and provenance, one line each, for the hover/focus/tap card. */
  detail: string[];
  /** Story 3.8: served anomaly_class, and its step on the diverging ramp. */
  anomalyClass: number | null;
  tone: Tone | null;
  /** The cell's text in the anomaly view: the served anomaly_pct, signed; "–" when the count is null. */
  anomalyLabel: string;
  /** The card in the anomaly view: the anomaly first, then the periods, flags and provenance. */
  anomalyDetail: string[];
  /** Served reference_year and provisional. */
  referenceYear: boolean;
  provisional: boolean;
}

export interface TotalModel {
  year: number;
  label: string;
  complete: boolean;
  shareOfMax: number | null;
  /** Served rank among complete years; the detail card states it. */
  rank: number | null;
  /** Rank shown as a mark: set only for years in statistics.top_years. */
  topRank: number | null;
  detail: string[];
}

export interface RowModel {
  year: number;
  cells: CellModel[];
  total: TotalModel | null;
}

export interface MedianModel {
  calendarMonth: number;
  label: string;
  detail: string[];
  /** Story 3.8: the served reference_mean, which the anomaly view's foot row shows. */
  meanLabel: string;
  meanDetail: string[];
}

export interface GridModel {
  rows: RowModel[];
  /** Year of meta.record_switch.viirs_from; the rule is drawn above its row's predecessor. */
  switchYear: number | null;
  /** The month the feeding VIIRS satellite changed, from meta.satellite_switch ("2026-11"). */
  satelliteSwitchMonth: string;
  medians: MedianModel[];
  classes: { index: number; label: string }[];
  unitLabel: string;
  /** "2003–2025", from the served reference period. */
  referenceLabel: string;
  /** "2003–2011", from the served flag reference years. */
  flagReferenceLabel: string;
  /** One per served anomaly break (Story 3.8). */
  anomalyClasses: AnomalyClass[];
  /** The anomaly scale's caption: the contract's sentence, else a label. */
  anomalyScale: string;
}

/** Periods and ramp a month's anomaly lines need; from the calendar, not the month. */
export interface CellContext {
  periods: Periods;
  neutral: number;
  sentences: GridSentences;
}

const INCOMPLETE_REASONS: PartialReason[] = ["record_start", "missing_days"];

/**
 * A quality label's first sentence as a short tag: "standard quality", "near
 * real time". The words are the contract's (labels.quality); only the case of
 * the first letter changes, so it reads inside a list.
 */
export function qualityTag(q: Quality): string {
  const head = messages.labels.quality[q].split(/(?<=\.)\s/)[0].replace(/\.$/, "");
  return head.charAt(0).toLowerCase() + head.slice(1);
}

/**
 * Every input that feeds the month, each with its own quality and served days:
 * "Suomi NPP (VIIRS), 2 days, near real time" (Story 3.6, AC1). A satellite
 * served with both qualities in one month gets one entry for each.
 */
function inputLines(m: Month): string[] {
  return m.inputs
    .filter((i) => i.feeds_record)
    .map((i) => `${messages.labels.satellite[i.satellite]}, ${formatCount(i.days)} ${i.days === 1 ? "day" : "days"}, ${qualityTag(i.quality)}`);
}

/**
 * The sentence for a month whose partial_reasons are empty of record_start,
 * data_through and missing_days. contract 0.3.0 has none; the web types none.
 * TODO(label): notes.month_complete, suggested in DECISIONS.md (Story 3.6).
 */
export function completeNote(): string | null {
  const v = (messages.notes as unknown as Record<string, unknown>).month_complete;
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** The month of the served satellite switch (AD-5), e.g. "2026-11". String slicing only. */
export function satelliteSwitchMonth(meta: Meta): string {
  return meta.satellite_switch.noaa20_from.slice(0, 7);
}

export function buildCell(m: Month, unitLabel: string, switchMonth: string | null = null, ctx: CellContext | null = null): CellModel {
  const fc = flagCounts(m);
  const flag = fc.strong ? "strong" : fc.marginal ? "marginal" : null;
  const nrt = m.inputs.some((i) => i.feeds_record && i.quality === "NRT");
  const incomplete = m.partial_reasons.some((r) => INCOMPLETE_REASONS.includes(r));
  const cut = m.partial_reasons.includes("range_cut");
  const monthToDate = m.partial_reasons.includes("data_through");
  const marks = [nrt ? MARKS.nrt : "", incomplete ? MARKS.incomplete : "", cut ? MARKS.cut : ""].join("");
  const label = m.count === null ? "–" : formatCount(m.count);
  // Provenance and evidence (Story 3.6), each read from a served field.
  const counted = m.count !== null;
  const unvalidated = counted && !m.validated_satellite;
  const afterPick = m.source === "viirs_converted";
  const satelliteSwitch = switchMonth !== null && m.month === switchMonth;

  const head = formatYearMonth(m.month);
  const countLine = counted ? `${label} ${unitLabel}` : messages.labels.null_reason[m.null_reason ?? "outside_record"];
  // Provenance (Story 3.6): the same lines in both views.
  const provenance: string[] = [];
  if (counted) {
    if (m.source) provenance.push(messages.labels.source[m.source]);
    const fed = inputLines(m);
    if (fed.length) provenance.push(`From ${fed.join("; ")}`);
    // The NRT sentence says why such a count can still change; standard quality needs no more than its tag.
    if (nrt) provenance.push(messages.labels.quality.NRT);
  }
  for (const r of m.partial_reasons) provenance.push(messages.labels.partial_reason[r]);
  if (counted && m.complete) {
    const done = completeNote();
    if (done) provenance.push(done);
  }
  if (unvalidated) provenance.push(messages.notes.validated_satellite_false);
  if (satelliteSwitch) provenance.push(messages.notes.satellite_switch);
  if (afterPick) provenance.push(messages.notes.after_pick_years);
  // Flags (Story 3.8): the mark's meaning, then the month's flagged cells per tier on the 1° scale.
  const sentences = ctx?.sentences ?? gridSentences();
  const flagged = flag ? [messages.labels.flag_state[flag], ...flagLines(m, sentences)] : [];
  // Reference years and provisional months say so in both views (Story 3.8, AC3).
  const states: string[] = [];
  if (counted && m.reference_year) states.push(messages.notes.reference_year);
  if (counted && m.provisional) states.push(messages.notes.provisional);

  const detail: string[] = [head, countLine, ...provenance, ...flagged, ...states];

  // The anomaly view's card: the anomaly first, then both periods and the flags,
  // stated even when no cell is flagged (AC4), then the same provenance.
  const anomalyDetail: string[] = counted && ctx
    ? [
        head,
        anomalyLine(m, unitLabel, ctx.periods, sentences),
        countLine,
        ...periodLines(m, unitLabel, ctx.periods, sentences),
        ...(flag ? [messages.labels.flag_state[flag]] : []),
        ...flagLines(m, sentences),
        ...states,
        ...provenance,
      ]
    : detail;

  return {
    month: m.month,
    count: m.count,
    colourClass: m.colour_class,
    nullReason: m.null_reason,
    state: counted ? "count" : (m.null_reason ?? "outside_record"),
    monthToDate,
    nrt,
    incomplete,
    cut,
    complete: m.complete,
    unvalidated,
    afterPick,
    satelliteSwitch,
    flag,
    label,
    marks,
    detail,
    anomalyClass: m.anomaly_class,
    tone: counted && m.anomaly_class !== null && ctx ? toneOf(m.anomaly_class, ctx.neutral) : null,
    anomalyLabel: anomalyLabel(m),
    anomalyDetail,
    referenceYear: m.reference_year,
    provisional: m.provisional,
  };
}

function buildTotal(t: YearTotal, unitLabel: string, topRank: number | null): TotalModel {
  const label = t.total === null ? "–" : formatCount(t.total);
  const detail = [`${t.year}, year total`, t.total === null ? messages.labels.null_reason.outside_record : `${label} ${unitLabel}`];
  if (!t.complete) detail.push(messages.notes.year_incomplete);
  if (t.rank !== null) detail.push(`Rank ${t.rank} of the complete years shown`);
  return { year: t.year, label, complete: t.complete, shareOfMax: t.share_of_max, rank: t.rank, topRank, detail };
}

export function buildGridModel(calendar: Calendar, meta: Meta, sentences: GridSentences = gridSentences()): GridModel {
  const unit = calendar.unit_label;
  const byYear = new Map<number, CellModel[]>();
  const switchMonth = satelliteSwitchMonth(meta);
  const ref = calendar.reference_period;
  const referenceLabel = `${ref.start_year}–${ref.end_year}`;
  const fr = calendar.flag_reference_years;
  const flagReferenceLabel = `${fr.start_year}–${fr.end_year}`;
  const ctx: CellContext = {
    periods: { reference: ref, flag: fr },
    neutral: neutralIndex(calendar.statistics.anomaly_breaks),
    sentences,
  };
  for (const m of calendar.months) {
    const y = parseYearMonth(m.month).year;
    const cell = buildCell(m, unit, switchMonth, ctx);
    const list = byYear.get(y);
    if (list) list.push(cell);
    else byYear.set(y, [cell]);
  }
  const top = new Map(calendar.statistics.top_years.map((t) => [t.year, t.rank]));
  const totals = new Map(calendar.year_totals.map((t) => [t.year, buildTotal(t, unit, top.get(t.year) ?? null)]));
  const rows: RowModel[] = [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({ year, cells: byYear.get(year) ?? [], total: totals.get(year) ?? null }));

  const medians: MedianModel[] = calendar.calendar_month_medians.map((e) => {
    // A median of 0 is a served 0 and is shown as "0"; only null is "–".
    const label = e.median === null ? "–" : formatCount(e.median);
    const detail = [`${MONTH_NAMES[e.calendar_month - 1]}, median ${referenceLabel}`, e.median === null ? "–" : `${label} ${unit}`];
    if (e.no_typical_activity) detail.push(messages.notes.no_typical_activity);
    const meanLabel = e.reference_mean === null ? "–" : formatCount(e.reference_mean);
    const meanDetail = [`${MONTH_NAMES[e.calendar_month - 1]}, reference mean ${referenceLabel}`, e.reference_mean === null ? "–" : `${meanLabel} ${unit}`];
    return { calendarMonth: e.calendar_month, label, detail, meanLabel, meanDetail };
  });

  return {
    rows,
    switchYear: parseYearMonth(meta.record_switch.viirs_from).year,
    satelliteSwitchMonth: switchMonth,
    medians,
    classes: buildClasses(calendar),
    unitLabel: unit,
    referenceLabel,
    flagReferenceLabel,
    anomalyClasses: buildAnomalyClasses(calendar),
    anomalyScale: anomalyScaleText(ref, sentences),
  };
}

/** One legend entry per served colour class, labelled by its served lower bound. */
export function buildClasses(calendar: Calendar): { index: number; label: string }[] {
  return calendar.statistics.colour_breaks.map((b, i) => ({ index: i, label: formatCount(b) }));
}

/** Detail lines as one accessible label, without doubled full stops. */
export function asSentence(lines: string[]): string {
  return lines.map((l) => (/[.:]$/.test(l) ? l : `${l}.`)).join(" ");
}

/** A focusable place in the grid: row r (rows.length = the medians row), column c (12 = year total). */
export interface Pos {
  r: number;
  c: number;
}

/** The detail lines for a place in the grid, or null when there is none. */
export function detailAt(model: GridModel, pos: Pos, measure: Measure = "count"): string[] | null {
  const anomaly = measure === "anomaly";
  if (pos.r === model.rows.length) {
    const m = model.medians[pos.c];
    return m ? (anomaly ? m.meanDetail : m.detail) : null;
  }
  const row = model.rows[pos.r];
  if (!row) return null;
  if (pos.c === 12) return row.total?.detail ?? null;
  const c = row.cells[pos.c];
  return c ? (anomaly ? c.anomalyDetail : c.detail) : null;
}
