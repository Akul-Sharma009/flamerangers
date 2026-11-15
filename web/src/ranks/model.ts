// Pure view model for the rankings (Story 3.9). Every value and rank is the
// served one, in the served order (statistics.top_months, top_years,
// busiest_calendar_months). Nothing here sorts, ranks, sums or averages (AD-8):
// a tie is read off the served ranks (two entries served with the same rank),
// never decided from the values.
import type { components } from "../api/schema";
import { fill } from "../card/words";
import { MONTH_NAMES, formatCount, formatDay, formatYearMonth } from "../format";
import { sameHighlight, type Highlight } from "../grid/highlight";
import { contractRankWords, type RankWords } from "./words";

export type Calendar = components["schemas"]["Calendar"];

export type ListId = "months" | "years" | "calendar_months";

export interface RankRow {
  /** Stable key, e.g. "2015-09", "2015", "cm-9". */
  key: string;
  /** Served rank. */
  rank: number;
  /** Another entry in the same served list carries the same served rank. */
  tied: boolean;
  /** The served rank as shown: "2", or "2=" when tied. */
  rankLabel: string;
  /** "September 2015", "2015", "September". */
  name: string;
  /** The served value, formatted only. */
  value: string;
  /** What selecting the row marks on the calendar. */
  highlight: Highlight;
}

export interface RankList {
  id: ListId;
  heading: string;
  /** Heading of the value column. */
  valueHeading: string;
  rows: RankRow[];
  /** The contract's sentence for an empty list, when it has one. */
  emptyNote: string | null;
}

export interface RankingsModel {
  /** The served range as days: "1 July 2002 to 13 November 2026". */
  rangeLabel: string;
  /** The contract's sentence naming the range and that only complete months and years are ranked, when it has one. */
  rangeSentence: string | null;
  /** Contract notes shown under the lists (0.4.0: rankings follow the dates). */
  notes: string[];
  /** The contract's sentence for the "=" mark, when it has one. */
  tieNote: string | null;
  /** True when any list shows a tie. */
  anyTie: boolean;
  unitLabel: string;
  lists: RankList[];
}

/** Marks each entry whose served rank appears more than once in its list. Counting equal served integers, no ranking. */
function tiedFlags(ranks: number[]): boolean[] {
  return ranks.map((r, i) => ranks.some((o, j) => j !== i && o === r));
}

function rows<T>(entries: T[], rankOf: (e: T) => number, make: (e: T) => Omit<RankRow, "rank" | "tied" | "rankLabel">): RankRow[] {
  const tied = tiedFlags(entries.map(rankOf));
  return entries.map((e, i) => {
    const rank = rankOf(e);
    return { ...make(e), rank, tied: tied[i], rankLabel: tied[i] ? `${rank}=` : String(rank) };
  });
}

export function buildRankings(calendar: Calendar, words: RankWords = contractRankWords()): RankingsModel {
  const s = calendar.statistics;
  const months = rows(s.top_months, (e) => e.rank, (e) => ({
    key: e.month,
    name: formatYearMonth(e.month),
    value: formatCount(e.count),
    highlight: { kind: "month", month: e.month },
  }));
  const years = rows(s.top_years, (e) => e.rank, (e) => ({
    key: String(e.year),
    name: String(e.year),
    value: formatCount(e.total),
    highlight: { kind: "year", year: e.year },
  }));
  const calendarMonths = rows(s.busiest_calendar_months, (e) => e.rank, (e) => ({
    key: `cm-${e.calendar_month}`,
    name: MONTH_NAMES[e.calendar_month - 1],
    value: formatCount(e.mean_count),
    highlight: { kind: "calendar_month", calendarMonth: e.calendar_month },
  }));
  const lists: RankList[] = [
    { id: "months", heading: "Top months", valueHeading: "Count", rows: months, emptyNote: words.no_complete_month ?? null },
    { id: "years", heading: "Top years", valueHeading: "Total", rows: years, emptyNote: words.no_complete_year ?? null },
    {
      id: "calendar_months",
      heading: "Busiest calendar months, on average",
      valueHeading: "Mean",
      rows: calendarMonths,
      emptyNote: words.no_complete_month ?? null,
    },
  ];
  const range = { range_start: formatDay(calendar.range.start), range_end: formatDay(calendar.range.end) };
  return {
    rangeLabel: `${range.range_start} to ${range.range_end}`,
    rangeSentence: fill(words.rankings_range, range),
    notes: words.range_and_reference ? [words.range_and_reference] : [],
    tieNote: words.rank_tie ?? null,
    anyTie: lists.some((l) => l.rows.some((r) => r.tied)),
    unitLabel: calendar.unit_label,
    lists,
  };
}

/** Selecting the item already marked clears the mark; selecting another moves it. */
export function nextHighlight(current: Highlight | null, item: Highlight): Highlight | null {
  return sameHighlight(current, item) ? null : item;
}

/** A mark and the calendar it was chosen from. `of: undefined` is the page's first state. */
export interface Marked {
  of: unknown;
  item: Highlight | null;
}

/** The mark to draw on `calendar`: none once a new area or range has loaded. */
export function currentHighlight(m: Marked, calendar: unknown): Highlight | null {
  return m.of === undefined || m.of === calendar ? m.item : null;
}
