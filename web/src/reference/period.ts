// Story 8.4: the reference period the medians, means, anomalies and the card's usual are taken over.
//
// The service owns the statistics (Story 8.3); the page only says which whole years to use. The
// choices come from the served /meta: its reference_period is the widest allowed (and the default),
// and reference_period_min_years the shortest. Nothing here computes a number the page shows (AD-8).
import type { CalendarRequest, Meta } from "../api/client";

export type YearRange = Meta["reference_period"];

/** A period that is the served default is sent as no option at all, so the answer is the default one. */
export function isDefault(p: YearRange, meta: Meta): boolean {
  return p.start_year === meta.reference_period.start_year && p.end_year === meta.reference_period.end_year;
}

/** The request with the period added, or unchanged when there is none (or it is the default). */
export function withReference<T extends CalendarRequest>(req: T, p: YearRange | null, meta: Meta): T {
  return p && !isDefault(p, meta) ? { ...req, reference_period: { start_year: p.start_year, end_year: p.end_year } } : req;
}

/** The years a period may start or end on: the served default period's, in order. */
export function choosableYears(meta: Meta): number[] {
  const { start_year, end_year } = meta.reference_period;
  return Array.from({ length: Math.max(0, end_year - start_year + 1) }, (_, i) => start_year + i);
}

/**
 * true when the service will take the period: inside the served default period, in order, and
 * spanning at least the served minimum. A /meta without the minimum (older service) checks the rest.
 */
export function usable(p: YearRange, meta: Meta): boolean {
  const { start_year, end_year } = meta.reference_period;
  if (p.start_year < start_year || p.end_year > end_year || p.end_year < p.start_year) return false;
  const min = meta.reference_period_min_years;
  return min === undefined || p.end_year - p.start_year + 1 >= min;
}
