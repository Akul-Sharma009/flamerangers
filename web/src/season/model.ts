// Story 7.4: the seasonal profile's words and table rows, from the served /season answer.
// Nothing here computes a hotspot number: the median, range, peak and season come from the service (AD-8).
import { MONTH_NAMES, formatCount } from "../format";
import type { Season } from "../api/client";

export type { Season };

const name = (m: number) => MONTH_NAMES[m - 1]!;

/** "July, August, September and October" from served month numbers. */
export function monthList(months: number[]): string {
  const names = months.map(name);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The headline: the served peak month and season length. Null when the area has no typical activity. */
export function seasonSentence(season: Season): string {
  const { peak_month: peak, season_length: len, season_months: months } = season.typical;
  if (peak === null || len === null) return "There is no typical activity to show a season for.";
  return `Peak month: ${name(peak)}. Season: ${len} ${len === 1 ? "month" : "months"} (${monthList(months)}), each with at least ${
    Math.round(season.season_share * 100)
  }% of the year's hotspots.`;
}

export interface TableRow {
  calendarMonth: number;
  month: string;
  median: string;
  low: string;
  high: string;
  year: string | null;
  flags: string;
}

const cell = (v: number | null) => (v === null ? "–" : formatCount(v)); // missing is not zero

export function yearsOf(season: Season): number[] {
  return season.years.map((y) => y.year);
}

export function tableRows(season: Season, year: number | null): TableRow[] {
  const sel = year === null ? null : season.years.find((y) => y.year === year) ?? null;
  return season.typical.months.map((m) => ({
    calendarMonth: m.calendar_month,
    month: name(m.calendar_month),
    median: cell(m.median), low: cell(m.low), high: cell(m.high),
    year: sel ? cell(sel.counts[m.calendar_month - 1] ?? null) : null,
    flags: [season.typical.peak_month === m.calendar_month ? "Peak" : "",
      season.typical.season_months.includes(m.calendar_month)
        ? (season.typical.peak_month === m.calendar_month ? "in season" : "In season") : ""].filter(Boolean).join(", "),
  }));
}

/** True when the overlay year has a month the record does not hold (so the chart leaves a gap). */
export function yearHasGaps(season: Season, year: number | null): boolean {
  const y = year === null ? null : season.years.find((s) => s.year === year);
  return !!y && y.counts.some((c) => c === null);
}
