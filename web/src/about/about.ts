// Story 5.7: what the about-the-data page reads. Dates come from /meta, satellite
// names from the contract's labels, and the two results it states are fixed claims
// from evidence.json, quoted whole by id. Nothing is computed: values are only
// formatted (AD-8).
import type { Meta } from "../api/client";
import { messages } from "../api/messages";
import type { Evidence } from "../evidence/types";
import { formatDay, formatYearMonth } from "../format";
import { COPY } from "./copy";

/** The fixed claims this page quotes, by the section that quotes them. */
export const ABOUT_CLAIMS = {
  switch: "aqua-through-2021",
  validation: "noaa20-untested",
} as const;

export type ClaimTexts = Record<keyof typeof ABOUT_CLAIMS, string | null>;

/** Each quoted claim's text, word for word; null if evidence.json lacks it. */
export function aboutClaims(evidence: Evidence): ClaimTexts {
  const text = (id: string) => evidence.claims.find((c) => c.id === id)?.text ?? null;
  return { switch: text(ABOUT_CLAIMS.switch), validation: text(ABOUT_CLAIMS.validation) };
}

/** The satellites in the order the page lists them, and their contract labels. */
export const SATELLITES = ["AQUA", "TERRA", "SNPP", "NOAA20", "NOAA21"] as const;
export type SatelliteId = (typeof SATELLITES)[number];

export type Values = Record<string, string>;

/** The formatted /meta values and satellite labels the copy's placeholders name. */
export function aboutValues(meta: Meta): Values {
  const sat = messages.labels.satellite;
  return {
    unit: meta.unit_label,
    record_version: meta.record_version,
    record_start: formatYearMonth(meta.record_start),
    aqua_through: formatYearMonth(meta.record_switch.aqua_through),
    viirs_from: formatYearMonth(meta.record_switch.viirs_from),
    snpp_through: formatDay(meta.satellite_switch.snpp_through),
    noaa20_from: formatDay(meta.satellite_switch.noaa20_from),
    data_through: formatDay(meta.data_through),
    aqua: sat.AQUA,
    terra: sat.TERRA,
    snpp: sat.SNPP,
    noaa20: sat.NOAA20,
    noaa21: sat.NOAA21,
  };
}

/** Fills `{name}` from `values`. An unknown name throws: the copy and the values must agree. */
export function fill(template: string, values: Values): string {
  return template.replace(/\{([a-z0-9_]+)\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined) throw new Error(`about: no value for {${name}}`);
    return v;
  });
}

/**
 * The counting limits: the contract's `counting_limits` list (0.4.0 on), which the CSV
 * headers also write, or the page's own copy while the contract lacks it. Master's
 * `Messages` type has no such key, so it is read with a cast, as `card/words.ts` reads
 * `sentences`. Merging 0.4.0 switches the page to the contract's list with no web change.
 */
export function countingLimits(source: unknown = messages): { from: "contract" | "page"; items: readonly string[] } {
  const list = (source as { counting_limits?: unknown }).counting_limits;
  if (Array.isArray(list) && list.length > 0 && list.every((x) => typeof x === "string" && x.trim() !== "")) {
    return { from: "contract", items: list as string[] };
  }
  return { from: "page", items: COPY.limits.items };
}
