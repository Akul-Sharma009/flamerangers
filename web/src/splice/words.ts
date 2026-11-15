// Words on the raw-against-harmonized chart (Story 7.2). The caption sentences are contract words;
// these few labels have none and wait for the lead's approval.
import { formatYearMonth } from "../format";
import { sourceLine } from "../download/words";
import type { Series } from "./model";

export const TOGGLE_LABEL = "Show";
export const TOGGLE_RECORD = "Harmonized record";
export const TOGGLE_RAW = "Raw splice";
export const SPLICE_LOADING = "Loading the raw splice…";

export function chartTitle(series: Series, range: { start: string; end: string }): string {
  const span = `${formatYearMonth(range.start.slice(0, 7))} to ${formatYearMonth(range.end.slice(0, 7))}`;
  return series === "raw" ? `Hotspots per month, raw splice, ${span}` : `Hotspots per month, harmonized record, ${span}`;
}

export const sourceFor = (series: Series): string =>
  series === "record"
    ? sourceLine()
    : "Source: NASA FIRMS active-fire detections: raw Aqua MODIS counts through December 2011, raw Suomi NPP counts from January 2012, nothing converted.";
