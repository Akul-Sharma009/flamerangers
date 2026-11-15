// Story 7.2: the raw-against-harmonized toggle's view model. Served values are looked up and
// substituted, never computed on (AD-8): the raw view is the calendar with the splice's served
// counts and colour classes put in place of the record's, so the grid draws it unchanged.
import type { Calendar, RawSplice } from "../api/client";

export type Series = "record" | "raw";

/**
 * The calendar as the raw splice sees it. Counts, colour classes and null reasons come from the
 * splice; what only the record has (ranks, anomalies, year totals, provenance of the conversion)
 * is emptied, because it would describe the record and not these counts.
 */
export function withSplice(calendar: Calendar, splice: RawSplice): Calendar {
  const by = new Map(splice.months.map((m) => [m.month, m]));
  return {
    ...calendar,
    months: calendar.months.map((m) => {
      const s = by.get(m.month);
      if (!s) return m;
      return {
        ...m,
        count: s.count, null_reason: s.null_reason, source: null, colour_class: s.colour_class,
        ratio_to_median: null, anomaly_count: null, anomaly_pct: null, anomaly_class: null, rank: null,
      };
    }),
    year_totals: calendar.year_totals.map((y) => ({ ...y, total: null, rank: null, share_of_max: null })),
  };
}

export interface BarModel {
  month: string;
  count: number | null;
  colourClass: number | null;
  earlyBadScan: boolean;
}

/** The chart's bars for one series, read from served months. */
export function bars(calendar: Calendar, splice: RawSplice, series: Series): BarModel[] {
  const by = new Map(splice.months.map((m) => [m.month, m]));
  return calendar.months.map((m) => {
    if (series === "record") return { month: m.month, count: m.count, colourClass: m.colour_class, earlyBadScan: false };
    const s = by.get(m.month);
    return { month: m.month, count: s?.count ?? null, colourClass: s?.colour_class ?? null, earlyBadScan: s?.early_bad_scan ?? false };
  });
}

/** The tallest served count of either series: the y axis is the same in both views, so the step shows. */
export function axisTop(calendar: Calendar, splice: RawSplice): number {
  let top = calendar.statistics.colour_breaks.at(-1) ?? 0;
  for (const c of [...calendar.months.map((m) => m.count), ...splice.months.map((m) => m.count)]) if (c !== null && c > top) top = c;
  return top;
}
