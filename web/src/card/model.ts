// Pure view model for the current-month card (Story 3.7). No DOM and no
// arithmetic on served numbers (AD-8): every value is a served field, looked up
// and formatted. Sentences are contract templates (./words.ts); where the
// contract has none yet, the same served values are shown as labelled figures.
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import { MONTH_NAMES, formatCount, formatDay, formatRatio, formatSigned, formatYearMonth, parseYearMonth } from "../format";
import { contractSentences, fill, type Sentences, type Values } from "./words";

type S = components["schemas"];
export type Calendar = S["Calendar"];
export type Meta = S["Meta"];
type CurrentMonth = S["CurrentMonth"];

/** A short label and a served value, for the ledger's figure list. */
export interface Figure {
  key: string;
  label: string;
  value: string;
}

/** What the ruler draws: served values only, already formatted for labels. */
export interface RulerData {
  /** Each complete reference year's count for the same days, in served order. */
  past: { year: number; count: number; value: string; label: string }[];
  /** null when the served median is null. */
  median: { count: number; label: string } | null;
  /** This year's count to date; null when not served. */
  current: { year: number; count: number; value: string; label: string } | null;
  /** Accessible name of the drawing. */
  name: string;
}

export type CardModel =
  | {
      kind: "card";
      /** "November 2026", from the served month. */
      monthLabel: string;
      /** The headline sentence, or null when the contract has none yet. */
      headline: string | null;
      /** Fallback headline: the served count to date, formatted; "–" if null. */
      count: string;
      /** Shown right under the headline when the served median is 0. */
      noTypical: string | null;
      /** The "usual" line, or null (its values are then in `figures`). */
      usual: string | null;
      /** The flagged-cells caution, or null (then in `figures`). */
      flagged: string | null;
      figures: Figure[];
      /** Contract sentences: quality, validation, NOAA-20, provisional flags. */
      notes: string[];
      /** The NOAA-20 comparison, when served: a sentence or labelled figures. */
      noaa20: { sentence: string | null; figures: Figure[] } | null;
      ruler: RulerData;
      rulerCaption: string | null;
      rulerScale: string | null;
      /** The second sentence: the highest month on record. null if none served. */
      recordHigh: { sentence: string | null; figures: Figure[] } | null;
    }
  | { kind: "not_loaded"; monthLabel: string; text: string };

/** A served number, formatted; null (or absent) stays null, never 0. */
function fmt(v: number | null | undefined, f: (n: number) => string = formatCount): string | null {
  return typeof v === "number" ? f(v) : null;
}

const DASH = "–";

export function buildCard(calendar: Calendar, meta: Meta, sentences: Sentences = contractSentences()): CardModel {
  const cm = calendar.current_month;
  if (cm === null) {
    return { kind: "not_loaded", monthLabel: formatYearMonth(meta.current_month), text: messages.labels.null_reason.outside_coverage };
  }
  return buildLoaded(calendar, meta, cm, sentences);
}

function buildLoaded(calendar: Calendar, meta: Meta, cm: CurrentMonth, sentences: Sentences): CardModel {
  const { year, monthIndex } = parseYearMonth(cm.month);
  const monthName = MONTH_NAMES[monthIndex];
  const count = fmt(cm.count_to_date);
  const median = fmt(cm.same_days_median);
  // A ratio is never shown when the median is 0 (the service serves null then).
  const ratio = cm.no_typical_activity ? null : fmt(cm.ratio, formatRatio);
  const difference = fmt(cm.difference, formatSigned);
  const refStart = String(cm.reference_period.start_year);
  const refEnd = String(cm.reference_period.end_year);
  const sameDays = `1–${cm.day} ${monthName}`;

  const values: Values = {
    count,
    ratio,
    median,
    difference,
    day: String(cm.day),
    month_name: monthName,
    year: String(year),
    reference_start: refStart,
    reference_end: refEnd,
    data_through: formatDay(calendar.data_through),
    strong: String(cm.cells_flagged_strong),
    marginal: String(cm.cells_flagged_marginal),
    total: String(cm.cells_total),
  };

  const headline = cm.no_typical_activity
    ? fill(sentences.current_month_count, values)
    : fill(sentences.current_month, values);
  const usual = fill(sentences.current_month_usual, values);
  const noFlags = cm.cells_flagged_strong === 0 && cm.cells_flagged_marginal === 0;
  const flagged = (noFlags ? fill(sentences.cells_flagged_none, values) : null) ?? fill(sentences.cells_flagged, values);

  const figures: Figure[] = [];
  // With no typical activity there is no ratio at all, not even a dash.
  if (headline === null && !cm.no_typical_activity) {
    figures.push({ key: "ratio", label: "Ratio to the same-days median", value: ratio === null ? DASH : `${ratio}×` });
  }
  if (usual === null) {
    figures.push(
      { key: "median", label: "Same-days median", value: median ?? DASH },
      { key: "difference", label: "Difference from the median", value: difference ?? DASH },
      { key: "same_days", label: "Same days", value: sameDays },
      { key: "reference_period", label: "Reference period", value: `${refStart}–${refEnd}` },
      { key: "data_through", label: "Data through", value: formatDay(calendar.data_through) },
    );
  }
  if (flagged === null) {
    figures.push({
      key: "flagged",
      label: "Flagged 1° cells",
      value: `${cm.cells_flagged_strong} strong · ${cm.cells_flagged_marginal} marginal · of ${cm.cells_total}`,
    });
  }
  const fed = fedBy(calendar, cm.month);
  if (fed) figures.push({ key: "satellite", label: "Fed by", value: fed });

  const notes: string[] = [messages.labels.quality[cm.quality]];
  if (cm.missing_days_to_date) notes.push(messages.notes.missing_days_to_date);
  if (!cm.validated_satellite) notes.push(messages.notes.validated_satellite_false);
  if (cm.monthly_validation_only) notes.push(messages.notes.monthly_validation_only);
  // The current month is never complete, so its flags are provisional.
  notes.push(messages.notes.provisional);

  return {
    kind: "card",
    monthLabel: formatYearMonth(cm.month),
    headline,
    count: count ?? DASH,
    noTypical: cm.no_typical_activity ? messages.notes.no_typical_activity : null,
    usual,
    flagged,
    figures,
    notes,
    noaa20: cm.validated_satellite ? null : noaa20(meta, sentences),
    ruler: rulerData(cm, year, monthName),
    rulerCaption: fill(sentences.ruler_caption, values),
    rulerScale: fill(sentences.ruler_scale, values),
    recordHigh: recordHigh(calendar, sentences),
  };
}

/** The satellites feeding the record this month, with their served day counts. */
function fedBy(calendar: Calendar, month: string): string | null {
  const m = calendar.months.find((x) => x.month === month);
  if (!m) return null;
  const parts = m.inputs
    .filter((i) => i.feeds_record)
    .map((i) => `${messages.labels.satellite[i.satellite]}, ${formatCount(i.days)}\u00a0${i.days === 1 ? "day" : "days"}`);
  return parts.length ? parts.join("\n") : null;
}

/** AR-23: NOAA-20 against Suomi NPP, reported only. "Not yet run" until served. */
function noaa20(meta: Meta, sentences: Sentences): { sentence: string | null; figures: Figure[] } {
  const check = meta.noaa20_check;
  if (check === null) return { sentence: messages.notes.noaa20_check_not_run, figures: [] };
  const p = check.pooled;
  const values: Values = {
    period_start: formatYearMonth(check.period_start),
    period_end: formatYearMonth(check.period_end),
    bias_pct: formatSigned(p.bias_pct),
    mean_abs_difference: formatCount(p.mean_abs_difference),
    cell_months: formatCount(p.cell_months),
  };
  const sentence = fill(sentences.noaa20_compared, values);
  const head = messages.notes.noaa20_check;
  if (sentence !== null) return { sentence: `${head} ${sentence}`, figures: [] };
  return {
    sentence: head,
    figures: [
      { key: "noaa20_period", label: "Compared over", value: `${values.period_start} to ${values.period_end}` },
      { key: "noaa20_bias", label: "Bias, NOAA-20 against Suomi NPP", value: `${values.bias_pct}%` },
      { key: "noaa20_mad", label: "Mean absolute difference per 1° cell-month", value: values.mean_abs_difference as string },
      { key: "noaa20_n", label: "Cell-months compared", value: values.cell_months as string },
    ],
  };
}

function rulerData(cm: CurrentMonth, year: number, monthName: string): RulerData {
  const median = typeof cm.same_days_median === "number" ? cm.same_days_median : null;
  const current = typeof cm.count_to_date === "number" ? cm.count_to_date : null;
  return {
    past: cm.same_days_by_year.map((p) => ({ year: p.year, count: p.count, value: formatCount(p.count), label: `${p.year}: ${formatCount(p.count)}` })),
    median: median === null ? null : { count: median, label: `median ${formatCount(median)}` },
    current: current === null ? null : { year, count: current, value: formatCount(current), label: `${year}: ${formatCount(current)}` },
    name: `Hotspots for 1–${cm.day} ${monthName} in each reference year, the median and ${year}`,
  };
}

/** The second sentence (UI-CONCEPT.md): the served record high, whatever the range. */
function recordHigh(calendar: Calendar, sentences: Sentences): { sentence: string | null; figures: Figure[] } | null {
  const high = calendar.statistics.record_high;
  if (high === null) return null;
  const month = formatYearMonth(high.month);
  const count = formatCount(high.count);
  const sentence = fill(sentences.record_high, { month, count });
  if (sentence !== null) return { sentence, figures: [] };
  return { sentence: null, figures: [{ key: "record_high", label: "Highest month on record", value: `${month}: ${count} hotspots` }] };
}
