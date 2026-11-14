// Pure view model for the calendar grid. No DOM, no D3, and no arithmetic on
// served numbers (AD-8): values are grouped, looked up and formatted only.
import type { components } from "../api/schema";
import { messages } from "../api/messages";
import { formatCount, formatYearMonth, parseYearMonth } from "../format";

type S = components["schemas"];
export type Calendar = S["Calendar"];
export type Meta = S["Meta"];
type NullReason = S["NullReason"];
type YearTotal = S["YearTotal"];

export interface CellModel {
  month: string;
  count: number | null;
  colourClass: number | null;
  nullReason: NullReason | null;
  monthToDate: boolean;
  flag: "strong" | "marginal" | null;
  title: string;
}

export interface RowModel {
  year: number;
  cells: CellModel[];
  total: YearTotal | undefined;
  topRank: number | null;
}

export interface GridModel {
  rows: RowModel[];
  switchYear: number | null;
  medians: { label: string; title: string }[];
  classes: { index: number; label: string }[];
}

function buildCell(m: S["Month"], unitLabel: string): CellModel {
  const flag = m.cells_flagged_strong ? "strong" : m.cells_flagged_marginal ? "marginal" : null;
  const lines: string[] = [];
  const head =
    m.count !== null
      ? `${formatCount(m.count)} ${unitLabel}`
      : m.null_reason
        ? messages.labels.null_reason[m.null_reason]
        : "";
  lines.push(`${formatYearMonth(m.month)}: ${head}`);
  if (m.source) lines.push(messages.labels.source[m.source]);
  for (const r of m.partial_reasons) lines.push(messages.labels.partial_reason[r]);
  if (flag) lines.push(messages.labels.flag_state[flag]);
  return {
    month: m.month,
    count: m.count,
    colourClass: m.colour_class,
    nullReason: m.null_reason,
    monthToDate: m.partial_reasons.includes("data_through"),
    flag,
    title: lines.join("\n"),
  };
}

export function buildGridModel(calendar: Calendar, meta: Meta): GridModel {
  const byYear = new Map<number, CellModel[]>();
  for (const m of calendar.months) {
    const y = parseYearMonth(m.month).year;
    const list = byYear.get(y);
    const cell = buildCell(m, calendar.unit_label);
    if (list) list.push(cell);
    else byYear.set(y, [cell]);
  }
  const rows: RowModel[] = [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      cells: byYear.get(year) ?? [],
      total: calendar.year_totals.find((t) => t.year === year),
      topRank: calendar.statistics.top_years.find((t) => t.year === year)?.rank ?? null,
    }));

  const medians = calendar.calendar_month_medians.map((e) => {
    const none = e.median === null || e.no_typical_activity;
    return {
      label: none || e.median === null ? "–" : formatCount(e.median),
      title: e.no_typical_activity ? messages.notes.no_typical_activity : "",
    };
  });

  return {
    rows,
    switchYear: parseYearMonth(meta.record_switch.viirs_from).year,
    medians,
    classes: buildClasses(calendar),
  };
}

/** One legend entry per served colour class, labelled by its served lower bound. */
export function buildClasses(calendar: Calendar): { index: number; label: string }[] {
  return calendar.statistics.colour_breaks.map((b, i) => ({ index: i, label: formatCount(b) }));
}
