// Story 3.8: the anomaly view and the flag lines of each month's card.
//
// Pure, no DOM. Every number is a served field, formatted only (AD-8): the
// anomaly, its percentage, its class, the class breaks, the reference mean and
// the flag counts all come from /calendar. Nothing here sums the two flag
// tiers, so a month's flags are stated per tier against the served total.
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import { fill } from "../card/words";
import { MONTH_NAMES, formatCount, formatSigned, formatSignedPct, formatYearMonth, parseYearMonth } from "../format";

type S = components["schemas"];
type Month = S["Month"];

/**
 * The contract's sentences this story reads (approved by the lead on 15 Nov,
 * in the contract 0.4.0 draft). Master's contract (0.3.0) has none of them,
 * so each has a labelled-figures fallback below; merging 0.4.0 switches the
 * words with no web change, as the current-month card does (card/words.ts).
 */
export const GRID_SENTENCE_KEYS = ["cells_flagged", "anomaly", "reference_mean", "flag_reference", "anomaly_scale", "cells_heading"] as const;
export type GridSentenceKey = (typeof GRID_SENTENCE_KEYS)[number];
/** Templates by key, plus the plain `notes.partly_inside` sentence. Missing = not in the contract yet. */
export type GridSentences = Partial<Record<GridSentenceKey | "partly_inside", string>>;

/** The templates as the contract serves them today. */
export function gridSentences(): GridSentences {
  const out: GridSentences = {};
  const section = (messages as unknown as { sentences?: unknown }).sentences;
  if (section && typeof section === "object") {
    for (const k of GRID_SENTENCE_KEYS) {
      const v = (section as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim() !== "") out[k] = v;
    }
  }
  const note = (messages.notes as unknown as Record<string, unknown>).partly_inside;
  if (typeof note === "string" && note.trim() !== "") out.partly_inside = note;
  return out;
}

/** "2003–2025" style period values for a template. */
function period(p: { start_year: number; end_year: number }, prefix: "reference" | "flag") {
  return { [`${prefix}_start`]: String(p.start_year), [`${prefix}_end`]: String(p.end_year) };
}

/** What the grid's cells are coloured by: the count (Story 3.5) or the anomaly (Story 3.8). */
export type Measure = "count" | "anomaly";

/**
 * A class's place on the diverging ramp: the neutral middle, or one to three
 * steps below (cool) or above (warm) it. Drawing only: the step is a distance
 * between class indexes, never a value shown.
 */
export type Tone = "neutral" | "cool1" | "cool2" | "cool3" | "warm1" | "warm2" | "warm3";

/**
 * Index of the class that holds 0, the neutral middle (contract: Statistics.anomaly_breaks).
 * Class i runs from breaks[i] up to the next break, so it is the last served
 * lower bound at or below 0. -1 when every bound is above 0.
 */
export function neutralIndex(breaks: number[]): number {
  let n = -1;
  breaks.forEach((b, i) => {
    if (b <= 0) n = i;
  });
  return n;
}

/** The ramp step of class `index`, given the neutral class. Classes past the third step share the darkest. */
export function toneOf(index: number, neutral: number): Tone {
  const d = index - neutral;
  if (d === 0) return "neutral";
  const step = Math.min(3, Math.abs(d)) as 1 | 2 | 3;
  return d > 0 ? `warm${step}` : `cool${step}`;
}

export interface AnomalyClass {
  index: number;
  /** The served lower bound, signed, in percent of the reference mean. */
  label: string;
  tone: Tone;
}

/** One legend entry per served anomaly class, labelled by its served lower bound. */
export function buildAnomalyClasses(calendar: S["Calendar"]): AnomalyClass[] {
  const breaks = calendar.statistics.anomaly_breaks;
  const n = neutralIndex(breaks);
  return breaks.map((b, i) => ({ index: i, label: formatSignedPct(b), tone: toneOf(i, n) }));
}

/** The served flag counts, read as possibly null (contract 0.4.0 serves null outside the record). */
export function flagCounts(m: Month): { strong: number | null; marginal: number | null; total: number | null } {
  return {
    strong: m.cells_flagged_strong as number | null,
    marginal: m.cells_flagged_marginal as number | null,
    total: m.cells_total as number | null,
  };
}

/**
 * The month's flags, per tier, out of every 1° cell the area overlaps, with
 * the 1° scale stated (AD-9). Uses the contract's `sentences.cells_flagged`
 * once it exists (0.4.0); until then the served figures are labelled.
 */
export function flagLines(m: Month, sentences: GridSentences = gridSentences()): string[] {
  const { strong, marginal, total } = flagCounts(m);
  if (m.count === null || strong === null || marginal === null || total === null) return [];
  const values = { strong: formatCount(strong), marginal: formatCount(marginal), total: formatCount(total) };
  const sentence = fill(sentences.cells_flagged, values);
  const lines = [sentence ?? `Flagged 1° cells: ${values.strong} strong, ${values.marginal} marginal, of ${values.total}`];
  lines.push(messages.notes.flag_scale);
  // Every surface that shows the strong tier says what it is (AD-9).
  if (strong) lines.push(messages.notes.strong_tier);
  return lines;
}

/** The periods a month's anomaly and flags are read against (served by /calendar). */
export interface Periods {
  reference: { start_year: number; end_year: number };
  flag: { start_year: number; end_year: number };
}

const label = (p: { start_year: number; end_year: number }) => `${p.start_year}–${p.end_year}`;

/**
 * The anomaly as a count and a percentage, from served anomaly_count and
 * anomaly_pct, each keeping its served sign. `sentences.anomaly` once the
 * contract has it; else a labelled figure.
 */
export function anomalyLine(m: Month, unit: string, periods: Periods, sentences: GridSentences = gridSentences()): string {
  if (m.anomaly_count === null) return "Anomaly: –";
  const sentence = fill(sentences.anomaly, {
    ...period(periods.reference, "reference"),
    month_name: MONTH_NAMES[parseYearMonth(m.month).monthIndex],
    anomaly_count: formatSigned(m.anomaly_count),
    anomaly_pct: m.anomaly_pct === null ? null : formatSignedPct(m.anomaly_pct),
  });
  if (sentence) return sentence;
  const pct = m.anomaly_pct === null ? "" : `, ${formatSignedPct(m.anomaly_pct)}%`;
  return `Anomaly: ${formatSigned(m.anomaly_count)} ${unit}${pct}`;
}

/** The flag reference years, as the contract's sentence once it exists, else a label. */
export function flagReferenceLine(flag: Periods["flag"], sentences: GridSentences = gridSentences()): string {
  return fill(sentences.flag_reference, period(flag, "flag")) ?? `Flag reference years ${label(flag)}`;
}

/** The two periods behind the anomaly and the flags, so a large anomaly with no flag (or the reverse) reads right. */
export function periodLines(m: Month, unit: string, periods: Periods, sentences: GridSentences = gridSentences()): string[] {
  const lines: string[] = [];
  const ref = label(periods.reference);
  const mean = m.reference_mean === null
    ? null
    : fill(sentences.reference_mean, {
        ...period(periods.reference, "reference"),
        month_name: MONTH_NAMES[parseYearMonth(m.month).monthIndex],
        mean: formatCount(m.reference_mean),
      });
  lines.push(mean ?? (m.reference_mean === null ? `Reference mean ${ref}: –` : `Reference mean ${ref}: ${formatCount(m.reference_mean)} ${unit}`));
  if (m.anomaly_pct === null && m.no_typical_activity) lines.push(messages.notes.no_typical_activity);
  lines.push(flagReferenceLine(periods.flag, sentences));
  return lines;
}

/** The anomaly scale's caption for the legend and the table view. */
export function anomalyScaleText(reference: Periods["reference"], sentences: GridSentences = gridSentences()): string {
  return (
    fill(sentences.anomaly_scale, period(reference, "reference")) ??
    `Anomaly, % of the ${label(reference)} mean for the calendar month, lower bound of each class`
  );
}

/** The cell panel's heading for a served month ("2015-09"). */
export function cellsHeading(month: string, sentences: GridSentences = gridSentences()): string {
  return fill(sentences.cells_heading, { month: formatYearMonth(month) }) ?? `Flag state of each 1° cell, ${formatYearMonth(month)}`;
}

/** The sentence for a served partly_inside cell. */
export function partlyInsideText(sentences: GridSentences = gridSentences()): string {
  return sentences.partly_inside ?? "Partly inside the area.";
}

/** The cell's text in the anomaly view: the served percentage, signed. Empty when the month has no anomaly class. */
export function anomalyLabel(m: Month): string {
  if (m.count === null) return "–";
  return m.anomaly_pct === null ? "" : formatSignedPct(m.anomaly_pct);
}
