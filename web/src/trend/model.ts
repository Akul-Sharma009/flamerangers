// Story 8.6: the trend indicator's words and figures. The service sends the test, its numbers and the
// years used; this file only fills the contract's sentences (messages.yaml) and formats (AD-8).
import { messages } from "../api/messages";
import type { Calendar } from "../api/client";
import { fill } from "../card/words";

export type Trend = Calendar["trend"];

const sentences = () => (messages as unknown as { sentences?: Record<string, string> }).sentences ?? {};

/** The service rounds p to four decimals, so an exact 0 means "below the smallest p it shows". */
// Formatting only: a minus sign, and as many decimals as the service served (z two, slope one), so nothing is rounded here.
const signed = (digits: number) => {
  const f = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, signDisplay: "exceptZero" });
  return (v: number) => f.format(v).replace("-", "−");
};
const formatS = signed(0), formatZ = signed(2), formatSlope = signed(1);

export const formatP = (p: number): string => (p === 0 ? "< 0.0001" : String(p));

export interface TrendView {
  heading: string | null;
  testName: string | null;
  /** The result sentence, or the refusal when the test was not run. null when the contract has no words. */
  result: string | null;
  level: string | null;
  leftOut: string | null;
  switchMarked: string | null;
  switchCaution: string | null;
  refused: boolean;
}

export function buildTrend(t: Trend, words: Record<string, string> = sentences()): TrendView {
  const refused = t.status !== "ok" || t.years === null;
  const result = refused
    ? fill(words.trend_too_few, { min_years: String(t.min_years), count: String(t.years?.count ?? 0) })
    : fill(words[`trend_result_${t.direction}`], {
        start: String(t.years!.start), end: String(t.years!.end), count: String(t.years!.count),
        s: formatS(t.s!), z: formatZ(t.z!), p_value: formatP(t.p_value!), slope: formatSlope(t.sen_slope_per_year!),
      });
  return {
    heading: words.trend_heading ?? null,
    testName: words.trend_test_name ?? null,
    result,
    level: fill(words.trend_level, { alpha: String(t.alpha) }),
    leftOut: t.left_out.length ? fill(words.trend_left_out, { years: t.left_out.map((y) => y.year).join(", ") }) : null,
    // The caution is shown whenever the years used straddle the switch; the mark is the same sentence's partner.
    switchMarked: t.record_switch_inside ? words.trend_switch_marked ?? null : null,
    switchCaution: t.record_switch_inside ? words.trend_switch_caution ?? null : null,
    refused,
  };
}
