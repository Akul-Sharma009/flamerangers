// Story 7.7: a month's hotspots for the map. They come from the service as the
// same rows /hotspots.csv gives (one request for the month); the browser only
// parses and picks which to draw (AD-8). It computes no number it shows.
import type { components } from "../api/schema";
import { SERVICE_BASE_URL } from "../config";

type S = components["schemas"];
type Meta = S["Meta"];
type Aoi = S["HotspotsCsvRequest"]["aoi"];

/** The most points drawn at once. Past it the panel says so; the rows that count are drawn first. */
export const MAX_DRAWN = 5000;

export interface MapHotspot {
  lat: number;
  lon: number;
  time: string;
  satellite: S["Satellite"];
  feeds: boolean;
  excluded: S["ExcludedReason"];
}

export type HotspotOutcome =
  | { status: "ok"; rows: MapHotspot[] }
  | { status: "too_large" }
  | { status: "failed" };

export type HotspotLoader = (meta: Meta, aoi: Aoi, month: string) => Promise<HotspotOutcome>;

/** First and last day of a "YYYY-MM" month; the last day stops at the data-through date. */
export function monthBounds(month: string, dataThrough: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(last).padStart(2, "0")}`;
  return { start: `${month}-01`, end: end > dataThrough ? dataThrough : end };
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Reads the hotspot rows of a /hotspots.csv answer: header lines start with "# ", then column names, then rows. */
export function parseHotspotCsv(text: string): MapHotspot[] {
  const lines = text.split(/\r?\n/).filter((l) => l !== "" && !l.startsWith("# "));
  const head = lines.shift();
  if (!head) return [];
  const col = new Map(splitLine(head).map((name, i) => [name, i] as const));
  const need = ["latitude", "longitude", "acq_datetime_utc", "satellite", "feeds_record", "excluded_reason"];
  if (need.some((n) => !col.has(n))) throw new Error("unreadable hotspot rows");
  const at = (f: string[], n: string) => f[col.get(n)!] ?? "";
  return lines.map((line) => {
    const f = splitLine(line);
    return {
      lat: Number(at(f, "latitude")),
      lon: Number(at(f, "longitude")),
      time: at(f, "acq_datetime_utc"),
      satellite: at(f, "satellite") as S["Satellite"],
      feeds: at(f, "feeds_record").toLowerCase() === "true",
      excluded: at(f, "excluded_reason") as S["ExcludedReason"],
    };
  });
}

export interface Drawn {
  points: MapHotspot[];
  /** True when more rows qualify than MAX_DRAWN, so some are left off the map. */
  capped: boolean;
}

/**
 * The rows to draw. A row counts toward the harmonized count when it feeds the
 * record and is not excluded; those are drawn first, so a cap never drops one
 * while an excluded row is drawn. Excluded rows are drawn only when asked for.
 */
export function selectDrawn(rows: MapHotspot[], showExcluded: boolean, limit: number = MAX_DRAWN): Drawn {
  const counted = rows.filter((r) => r.feeds && r.excluded === "none");
  const rest = showExcluded ? rows.filter((r) => r.feeds && r.excluded !== "none") : [];
  const all = [...counted, ...rest];
  return { points: all.slice(0, limit), capped: all.length > limit };
}

export function createHotspotLoader(baseUrl: string | null, fetchImpl: typeof fetch = fetch): HotspotLoader {
  return async (meta, aoi, month) => {
    try {
      if (baseUrl === null) {
        // Fixture mode serves the same sample rows for every area, as /calendar does.
        const fixture = (await import("../../../contract/fixture/hotspot_rows.json")).default as unknown as {
          rows: { latitude: number; longitude: number; acq_datetime_utc: string; satellite: S["Satellite"]; feeds_record: boolean; excluded_reason: S["ExcludedReason"] }[];
        };
        return {
          status: "ok",
          rows: fixture.rows
            .filter((r) => r.acq_datetime_utc.startsWith(month) && r.feeds_record)
            .map((r) => ({ lat: r.latitude, lon: r.longitude, time: r.acq_datetime_utc, satellite: r.satellite, feeds: r.feeds_record, excluded: r.excluded_reason })),
        };
      }
      const { start, end } = monthBounds(month, meta.data_through);
      const res = await fetchImpl(`${baseUrl}/hotspots.csv`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ record_version: meta.record_version, aoi, start, end, all_satellites: false }),
      });
      if (res.status === 413) return { status: "too_large" };
      if (!res.ok) return { status: "failed" };
      return { status: "ok", rows: parseHotspotCsv(await res.text()) };
    } catch {
      return { status: "failed" };
    }
  };
}

export const loadHotspots: HotspotLoader = createHotspotLoader(SERVICE_BASE_URL);
