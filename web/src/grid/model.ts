// Pure view model for the calendar grid and its table view. No DOM and no
// arithmetic on served numbers (AD-8): values are grouped, looked up and
// formatted only. Every mark a month carries is read from a served field.
import type { components } from "../api/schema";
import { messages } from "../api/messages";
import { MONTH_NAMES, formatCount, formatYearMonth, parseYearMonth } from "../format";

type S = components["schemas"];
export type Calendar = S["Calendar"];
export type Meta = S["Meta"];
type Month = S["Month"];
type NullReason = S["NullReason"];
type PartialReason = S["PartialReason"];
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
  flag: "strong" | "marginal" | null;
  /** The count as shown: formatted, or "–" for null. */
  label: string;
  /** Text marks after the count, e.g. "n*c". Empty when none. */
  marks: string;
  /** Exact count and provenance, one line each, for the hover/focus/tap card. */
  detail: string[];
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
}

export interface GridModel {
  rows: RowModel[];
  /** Year of meta.record_switch.viirs_from; the rule is drawn above its row's predecessor. */
  switchYear: number | null;
  medians: MedianModel[];
  classes: { index: number; label: string }[];
  unitLabel: string;
  /** "2003–2025", from the served reference period. */
  referenceLabel: string;
}

const INCOMPLETE_REASONS: PartialReason[] = ["record_start", "missing_days"];

/** Feeding inputs as "Suomi NPP (VIIRS), 2 days". Days are a served integer. */
function inputLines(m: Month): string[] {
  return m.inputs
    .filter((i) => i.feeds_record)
    .map((i) => `${messages.labels.satellite[i.satellite]}, ${formatCount(i.days)} ${i.days === 1 ? "day" : "days"}`);
}

export function buildCell(m: Month, unitLabel: string): CellModel {
  const flag = m.cells_flagged_strong ? "strong" : m.cells_flagged_marginal ? "marginal" : null;
  const nrt = m.inputs.some((i) => i.feeds_record && i.quality === "NRT");
  const incomplete = m.partial_reasons.some((r) => INCOMPLETE_REASONS.includes(r));
  const cut = m.partial_reasons.includes("range_cut");
  const monthToDate = m.partial_reasons.includes("data_through");
  const marks = [nrt ? MARKS.nrt : "", incomplete ? MARKS.incomplete : "", cut ? MARKS.cut : ""].join("");
  const label = m.count === null ? "–" : formatCount(m.count);

  const detail: string[] = [formatYearMonth(m.month)];
  if (m.count === null) {
    detail.push(messages.labels.null_reason[m.null_reason ?? "outside_record"]);
  } else {
    detail.push(`${label} ${unitLabel}`);
    if (m.source) detail.push(messages.labels.source[m.source]);
    const fed = inputLines(m);
    if (fed.length) detail.push(`From ${fed.join("; ")}`);
    const qualities = new Set(m.inputs.filter((i) => i.feeds_record).map((i) => i.quality));
    for (const q of ["SP", "NRT"] as const) if (qualities.has(q)) detail.push(messages.labels.quality[q]);
  }
  for (const r of m.partial_reasons) detail.push(messages.labels.partial_reason[r]);
  if (flag) detail.push(messages.labels.flag_state[flag]);

  return {
    month: m.month,
    count: m.count,
    colourClass: m.colour_class,
    nullReason: m.null_reason,
    state: m.count === null ? (m.null_reason ?? "outside_record") : "count",
    monthToDate,
    nrt,
    incomplete,
    cut,
    flag,
    label,
    marks,
    detail,
  };
}

function buildTotal(t: YearTotal, unitLabel: string, topRank: number | null): TotalModel {
  const label = t.total === null ? "–" : formatCount(t.total);
  const detail = [`${t.year}, year total`, t.total === null ? messages.labels.null_reason.outside_record : `${label} ${unitLabel}`];
  if (!t.complete) detail.push(messages.notes.year_incomplete);
  if (t.rank !== null) detail.push(`Rank ${t.rank} of the complete years shown`);
  return { year: t.year, label, complete: t.complete, shareOfMax: t.share_of_max, rank: t.rank, topRank, detail };
}

export function buildGridModel(calendar: Calendar, meta: Meta): GridModel {
  const unit = calendar.unit_label;
  const byYear = new Map<number, CellModel[]>();
  for (const m of calendar.months) {
    const y = parseYearMonth(m.month).year;
    const cell = buildCell(m, unit);
    const list = byYear.get(y);
    if (list) list.push(cell);
    else byYear.set(y, [cell]);
  }
  const top = new Map(calendar.statistics.top_years.map((t) => [t.year, t.rank]));
  const totals = new Map(calendar.year_totals.map((t) => [t.year, buildTotal(t, unit, top.get(t.year) ?? null)]));
  const rows: RowModel[] = [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({ year, cells: byYear.get(year) ?? [], total: totals.get(year) ?? null }));

  const ref = calendar.reference_period;
  const referenceLabel = `${ref.start_year}–${ref.end_year}`;
  const medians: MedianModel[] = calendar.calendar_month_medians.map((e) => {
    // A median of 0 is a served 0 and is shown as "0"; only null is "–".
    const label = e.median === null ? "–" : formatCount(e.median);
    const detail = [`${MONTH_NAMES[e.calendar_month - 1]}, median ${referenceLabel}`, e.median === null ? "–" : `${label} ${unit}`];
    if (e.no_typical_activity) detail.push(messages.notes.no_typical_activity);
    return { calendarMonth: e.calendar_month, label, detail };
  });

  return {
    rows,
    switchYear: parseYearMonth(meta.record_switch.viirs_from).year,
    medians,
    classes: buildClasses(calendar),
    unitLabel: unit,
    referenceLabel,
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
export function detailAt(model: GridModel, pos: Pos): string[] | null {
  if (pos.r === model.rows.length) return model.medians[pos.c]?.detail ?? null;
  const row = model.rows[pos.r];
  if (!row) return null;
  if (pos.c === 12) return row.total?.detail ?? null;
  return row.cells[pos.c]?.detail ?? null;
}
