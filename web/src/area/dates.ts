// Checking a typed date range before it is sent (Story 3.4). This validates the
// user's input against the served bounds and nothing else: no month is snapped,
// counted or shifted here. A range that cuts a month is sent as typed; the
// service labels the month (partial reason range_cut) and serves its whole count.
import type { DateRange, Meta } from "../api/client";
import { wholeRecord } from "../api/client";

export type DateField = "start" | "end";

/** Why a typed range is refused. Each marks the fields at fault. */
export type RangeProblem = "unreadable" | "before_record" | "after_data_through" | "out_of_order";

export type RangeResult =
  | { ok: true; range: DateRange }
  | { ok: false; problem: RangeProblem; fields: DateField[] };

/** The first and last day a range may use: the whole record, from the served /meta. */
export function rangeBounds(meta: Meta): DateRange {
  return wholeRecord(meta);
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true for a real calendar day written YYYY-MM-DD ("2026-02-30" is not one). */
export function isDay(value: string): boolean {
  const m = ISO_DAY.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Checks a typed range against the served bounds. Days in YYYY-MM-DD order
 * compare as strings, so no date arithmetic is needed.
 */
export function checkRange(start: string, end: string, bounds: DateRange): RangeResult {
  const s = start.trim();
  const e = end.trim();
  const unreadable: DateField[] = [];
  if (!isDay(s)) unreadable.push("start");
  if (!isDay(e)) unreadable.push("end");
  if (unreadable.length) return { ok: false, problem: "unreadable", fields: unreadable };

  const early: DateField[] = [];
  if (s < bounds.start) early.push("start");
  if (e < bounds.start) early.push("end");
  if (early.length) return { ok: false, problem: "before_record", fields: early };

  const late: DateField[] = [];
  if (s > bounds.end) late.push("start");
  if (e > bounds.end) late.push("end");
  if (late.length) return { ok: false, problem: "after_data_through", fields: late };

  if (s > e) return { ok: false, problem: "out_of_order", fields: ["start", "end"] };
  return { ok: true, range: { start: s, end: e } };
}

/** The later of two days, for an input's min. Comparing typed strings only. */
export function laterDay(a: string, b: string): string {
  return isDay(a) && a > b ? a : b;
}

/** The earlier of two days, for an input's max. */
export function earlierDay(a: string, b: string): string {
  return isDay(a) && a < b ? a : b;
}
