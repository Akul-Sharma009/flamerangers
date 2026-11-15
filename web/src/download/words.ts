// Words on the exported pictures (Story 4.3). Contract sentences are used as
// they are. Two lines have no contract sentence yet, so they are read from an
// optional `sentences:` section (contract 0.4.0) and otherwise fall back to the
// wording suggested in DECISIONS.md, "Story 4.3: picture wording waits for the
// contract".
import { messages } from "../api/messages";
import type { AoiInput } from "../area/featured";
import { formatDay, formatYearMonth } from "../format";

function sentence(key: string, fallback: string): string {
  const section = (messages as unknown as { sentences?: Record<string, unknown> }).sentences;
  const v = section?.[key];
  return typeof v === "string" && v.trim() !== "" ? v : fallback;
}

/** TODO(picture_source): no contract sentence; the lead and data owner approve the wording. */
export const sourceLine = (): string =>
  sentence(
    "picture_source",
    "Source: NASA FIRMS active-fire detections (Aqua MODIS through December 2021, VIIRS converted to Aqua MODIS units from January 2022).",
  );

/** TODO(picture_title): the calendar's title, as the page's own heading words it. */
export function calendarTitle(range: { start: string; end: string }): string {
  return `Hotspots per month, ${formatYearMonth(range.start.slice(0, 7))} to ${formatYearMonth(range.end.slice(0, 7))}`;
}

export const dataThroughLine = (dataThrough: string): string => `Data through ${formatDay(dataThrough)}`;
export const recordLine = (version: string): string => `Record version ${version}`;
export const rangeLine = (r: { start: string; end: string }): string => `${formatDay(r.start)} to ${formatDay(r.end)}`;

/** The area's name, else its bounding box as typed or drawn. Coordinates are shown, never computed on. */
export function areaLabel(name: string | null, geometry: AoiInput["geometry"] | undefined): string {
  if (name) return name;
  if (!geometry) return "Your area";
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  visit(geometry.coordinates);
  if (!Number.isFinite(w)) return "Your area";
  const f = (v: number) => String(Math.round(v * 1e4) / 1e4);
  return `Box ${f(s)}° to ${f(n)}° latitude, ${f(w)}° to ${f(e)}° longitude`;
}

export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "area";

export const placeholderNote = (): string => messages.notes.placeholder;
