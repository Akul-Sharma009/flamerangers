// Formatting only. The service rounds every number once (counts to 1 decimal,
// ratios to 2); nothing here rounds, sums, ranks or compares a served value.

// maximumFractionDigits 1 matches the service's rounding of counts, so it only
// drops a trailing ".0" and adds thousands separators; it never rounds.
const countFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatCount(value: number): string {
  return countFormat.format(value);
}

export const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "2015-09" -> { year: 2015, monthIndex: 8 }. String parsing, not arithmetic on data. */
export function parseYearMonth(ym: string): { year: number; monthIndex: number } {
  return { year: Number(ym.slice(0, 4)), monthIndex: Number(ym.slice(5, 7)) - 1 };
}

/** "2015-09" -> "September 2015". */
export function formatYearMonth(ym: string): string {
  const { year, monthIndex } = parseYearMonth(ym);
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/** "2026-11-13" -> "13 November 2026". String parsing only. */
export function formatDay(day: string): string {
  const { year, monthIndex } = parseYearMonth(day.slice(0, 7));
  return `${Number(day.slice(8, 10))} ${MONTH_NAMES[monthIndex]} ${year}`;
}

// Ratios are served with 2 decimals; maximumFractionDigits 2 only drops trailing zeros.
const ratioFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const signedFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

/** A served ratio: 2.3 -> "2.3" (the "×" is written where it is shown). */
export function formatRatio(value: number): string {
  return ratioFormat.format(value);
}

/** A served difference with its sign: -195.1 -> "−195.1", 12 -> "+12". */
export function formatSigned(value: number): string {
  return signedFormat.format(value).replace("-", "−");
}
