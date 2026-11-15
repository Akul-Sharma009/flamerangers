// The season-to-date chart's layout and words (Story 7.6). Positions are drawing, not numbers: every
// figure written on the chart or in the table is a served value, formatted (AD-8). Y-axis values are not
// labelled, for the same reason the ruler's are not: the labels are the served ends of each line.
import { max, scaleLinear } from "d3";
import { messages } from "../api/messages";
import { fill } from "../card/words";
import { formatCount, formatDay, MONTH_NAMES } from "../format";
import type { SeasonToDate } from "./load";

export const WIDTH = 640;
export const HEIGHT = 330;
const PAD = { left: 34, right: 84, top: 30, bottom: 34 };
const MIN_GAP = 13;

export interface Pt { x: number; y: number }
export interface Label { text: string; x: number; y: number; anchor: "start" | "middle" | "end"; kind: "year" | "median" | "band" }
export interface SeasonLayout {
  width: number;
  height: number;
  /** Band polygon from 1 January to December; null when no complete past year exists. */
  band: string | null;
  median: string | null;
  /** The year's running total: solid segments to the last complete month, then a dashed one to the to-date month. */
  solid: string | null;
  dashed: string | null;
  toDate: Pt | null;
  months: { x: number; label: string }[];
  baseline: { x1: number; x2: number; y: number };
  labels: Label[];
  /** Said on the chart itself, so an exported SVG states its band: percentiles and years are served values. */
  key: string;
  hasCurve: boolean;
}

const path = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

/** Words and figures drawn from served values only. */
export function layoutSeason(s: SeasonToDate): SeasonLayout {
  const top = max(s.months.flatMap((m) => [m.cumulative, m.median, m.band_high, m.band_low]).filter((v): v is number => v !== null)) ?? 1;
  const x = scaleLinear().domain([0, 12]).range([PAD.left, WIDTH - PAD.right]);
  const y = scaleLinear().domain([0, top || 1]).range([HEIGHT - PAD.bottom, PAD.top]);
  const at = (i: number, v: number): Pt => ({ x: x(i), y: y(v) });
  const zero = s.start; // 0, served

  const series = (pick: (m: SeasonToDate["months"][number]) => number | null): Pt[] | null => {
    if (s.months.some((m) => pick(m) === null)) return null;
    return [at(0, zero), ...s.months.map((m, i) => at(i + 1, pick(m)!))];
  };
  const low = series((m) => m.band_low), high = series((m) => m.band_high), med = series((m) => m.median);
  const band = low && high ? `${path(low)}L${path([...high].reverse()).slice(1)}Z` : null;

  // The year's curve: from January, until the first month with no value; the to-date month ends it dashed.
  const mine: Pt[] = [at(0, zero)];
  let toDate: Pt | null = null;
  let dashedFrom: Pt | null = null;
  for (let i = 0; i < 12; i++) {
    const m = s.months[i]!;
    if (m.cumulative === null) break;
    const p = at(i + 1, m.cumulative);
    if (m.to_date) { toDate = p; dashedFrom = mine[mine.length - 1]!; } else mine.push(p);
  }
  const hasCurve = mine.length > 1 || toDate !== null;
  const solid = mine.length > 1 ? path(mine) : null;
  const dashed = toDate && dashedFrom ? path([dashedFrom, toDate]) : null;

  const labels: Label[] = [];
  // Right-margin labels for December's served values, kept apart so they stay legible.
  const dec = s.months[11]!;
  const ends = [
    { v: dec.band_high, kind: "band" as const, name: "high" },
    { v: dec.median, kind: "median" as const, name: "median" },
    { v: dec.band_low, kind: "band" as const, name: "low" },
  ].filter((e) => e.v !== null).map((e) => ({ ...e, y: y(e.v!) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i]!.y - ends[i - 1]!.y < MIN_GAP) ends[i]!.y = ends[i - 1]!.y + MIN_GAP;
  for (const e of ends) labels.push({ text: formatCount(e.v!), x: WIDTH - PAD.right + 6, y: e.y + 4, anchor: "start", kind: e.kind });
  const last = toDate ? s.months.find((m) => m.to_date) : [...s.months].reverse().find((m) => m.cumulative !== null);
  const lastPt = toDate ?? (solid ? mine[mine.length - 1]! : null);
  if (last && last.cumulative !== null && lastPt) {
    // On the side of the median the curve is not on, so the label never sits on the dashed line.
    const med = last.median;
    const below = med !== null && last.cumulative <= med;
    labels.push({ text: `${formatCount(last.cumulative)}${last.to_date ? ` ${TO_DATE}` : ""}`, x: lastPt.x, y: lastPt.y + (below ? 20 : -12), anchor: "middle", kind: "year" });
  }
  return {
    width: WIDTH, height: HEIGHT, band, median: med ? path(med) : null, solid, dashed, toDate,
    months: s.months.map((m, i) => ({ x: x(i + 1), label: MONTH_NAMES[i]!.slice(0, 3) })),
    baseline: { x1: x(0), x2: x(12), y: y(0) },
    labels, hasCurve,
    key: `Band: ${s.band.lower_percentile}th to ${s.band.upper_percentile}th percentile of ${s.past_years.length} complete past years. Dashed line: median.`,
  };
}

// TODO(season_words): these four have no contract sentence; the lead approves the wording.
export const TO_DATE = "to date";
export const NO_CURVE = "There is no running total for this year: the record does not cover every month from January.";
export const NO_PAST = "There is no complete past year to compare with.";
export const FAILED = messages.client.service_unreachable;

const sentence = (key: string): string | undefined => (messages.sentences ?? {})[key];

export function seasonWords(s: SeasonToDate) {
  const ref = s.reference_period;
  const to = s.months.find((m) => m.to_date);
  return {
    title: fill(sentence("season_to_date_title"), { year: String(s.year) }),
    usual: fill(sentence("season_to_date_usual"), {
      past_count: String(s.past_years.length), reference_start: String(ref.start_year), reference_end: String(ref.end_year),
      lower_percentile: String(s.band.lower_percentile), upper_percentile: String(s.band.upper_percentile),
    }),
    toDate: to ? fill(sentence("season_to_date_note"), {
      month_name: MONTH_NAMES[Number(to.month.slice(5)) - 1]!, year: String(s.year), data_through: formatDay(s.data_through),
    }) : null,
    start: sentence("season_to_date_start") ?? null,
  };
}

/** The table equivalent: one row per month, every cell a served value (null shown as a dash, never 0). */
export function seasonRows(s: SeasonToDate) {
  const cell = (v: number | null) => (v === null ? "–" : formatCount(v));
  return s.months.map((m, i) => ({
    month: MONTH_NAMES[i]!,
    cumulative: m.cumulative === null ? "–" : `${formatCount(m.cumulative)}${m.to_date ? ` (${TO_DATE})` : ""}`,
    median: cell(m.median), low: cell(m.band_low), high: cell(m.band_high),
  }));
}
