// Story 8.1: the shareable link. The address after "#/" carries the area, the dates
// and the view, and nothing else:
//
//   #/?area=sumatra&from=2015-01-01&to=2020-12-31&view=table&measure=anomaly
//   #/?shape=P-105.5,-5;-100,-5;-100,2;-105.5,2;-105.5,-5&from=...   (a typed or drawn area)
//
// area   a featured area's id (contract/regions.geojson).
// shape  a typed or drawn area's geometry. P or M (Polygon, MultiPolygon), then
//        polygons joined by "/", rings by "~", vertices by ";", "lon,lat" in each.
//        Coordinates are written as the app holds them, not rounded: the app rounds
//        nothing, and a rounded copy would be a different area from the one shared.
// from, to  the first and last day, YYYY-MM-DD. Both absent is the whole record.
// view   "table" (absent is the grid).  measure  "anomaly" (absent is counts).
//
// Parsing only reads the text back. It computes no number the page shows (AD-8).
// Which month is highlighted or picked is not in the link (not an AOI, date or view).
import type { DateRange, Meta } from "./api/client";
import { wholeRecord } from "./api/client";
import { messages } from "./api/messages";
import { checkRange, isDay } from "./area/dates";
import { REFUSAL } from "./area/DatesPanel";
import { defaultArea, featuredAreas, type AoiInput, type FeaturedArea } from "./area/featured";
import { typedProblemText } from "./area/words";
import type { Measure } from "./grid/anomaly";
import type { View } from "./grid/CalendarGrid";
import { routeFromHash } from "./route";

export interface ShareState {
  area: AoiInput;
  /** null is the whole record. */
  range: DateRange | null;
  grid: View;
  measure: Measure;
}

export interface ParsedLink extends ShareState {
  /** The contract sentences for what could not be read; the link fell back to the default for it. */
  notes: string[];
}

const GEOMETRY = /^[PM][-0-9.,;~/eE+]+$/;

function num(text: string): number | null {
  if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** The geometry as the link writes it. */
export function encodeShape(g: AoiInput["geometry"]): string {
  const ring = (r: number[][]) => r.map((p) => `${p[0]},${p[1]}`).join(";");
  const poly = (rings: number[][][]) => rings.map(ring).join("~");
  return g.type === "Polygon"
    ? `P${poly(g.coordinates as number[][][])}`
    : `M${(g.coordinates as number[][][][]).map(poly).join("/")}`;
}

/** The geometry from a link's text, or why not: "range" for a coordinate outside WGS84, else "unreadable". */
export function decodeShape(text: string): { ok: true; geometry: AoiInput["geometry"] } | { ok: false; problem: "range" | "unreadable" } {
  if (!GEOMETRY.test(text)) return { ok: false, problem: "unreadable" };
  let outOfRange = false;
  const polys: number[][][][] = [];
  for (const polyText of text.slice(1).split("/")) {
    const rings: number[][][] = [];
    for (const ringText of polyText.split("~")) {
      const ring: number[][] = [];
      for (const pair of ringText.split(";")) {
        const xy = pair.split(",");
        const lon = xy.length === 2 ? num(xy[0]!) : null;
        const lat = xy.length === 2 ? num(xy[1]!) : null;
        if (lon === null || lat === null) return { ok: false, problem: "unreadable" };
        if (Math.abs(lon) > 180 || Math.abs(lat) > 90) outOfRange = true;
        ring.push([lon, lat]);
      }
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      if (ring.length < 4 || first[0] !== last[0] || first[1] !== last[1]) return { ok: false, problem: "unreadable" };
      rings.push(ring);
    }
    polys.push(rings);
  }
  if (outOfRange) return { ok: false, problem: "range" };
  if (text[0] === "P") return polys.length === 1 ? { ok: true, geometry: { type: "Polygon", coordinates: polys[0]! } } : { ok: false, problem: "unreadable" };
  return { ok: true, geometry: { type: "MultiPolygon", coordinates: polys } };
}

/** The address text for a state: "#/?..." with only the fields that differ from the default. */
export function encodeShare(s: ShareState, areas: FeaturedArea[] = featuredAreas()): string {
  const q: string[] = [];
  const featured = s.area.name === null ? undefined : areas.find((a) => a.name === s.area.name);
  q.push(featured ? `area=${featured.id}` : `shape=${encodeShape(s.area.geometry)}`);
  if (s.range) q.push(`from=${s.range.start}`, `to=${s.range.end}`);
  if (s.grid === "table") q.push("view=table");
  if (s.measure === "anomaly") q.push("measure=anomaly");
  return `#/?${q.join("&")}`;
}

/**
 * Reads a link's query (the text after "?"; "" for an old link with no state).
 * Anything unreadable falls back to the default and adds the contract sentence for it.
 * An unknown view or measure falls back silently: the contract has no sentence for it.
 */
export function parseShare(query: string, areas: FeaturedArea[] = featuredAreas()): ParsedLink {
  const p = new URLSearchParams(query);
  const out: ParsedLink = { area: defaultArea(areas).aoi, range: null, grid: "grid", measure: "count", notes: [] };

  const id = p.get("area");
  const shape = p.get("shape");
  if (id !== null) {
    const found = areas.find((a) => a.id === id);
    if (found) out.area = found.aoi;
    else out.notes.push(messages.problems.invalid_aoi);
  } else if (shape !== null) {
    const g = decodeShape(shape);
    if (g.ok) out.area = { name: null, geometry: g.geometry };
    else out.notes.push(g.problem === "range" ? typedProblemText("out_of_range") : messages.problems.invalid_aoi);
  }

  const from = p.get("from");
  const to = p.get("to");
  if (from !== null || to !== null) {
    if (from === null || to === null || !isDay(from) || !isDay(to)) out.notes.push(messages.client[REFUSAL.unreadable]);
    else if (from > to) out.notes.push(messages.client[REFUSAL.out_of_order]);
    else out.range = { start: from, end: to };
  }

  if (p.get("view") === "table") out.grid = "table";
  if (p.get("measure") === "anomaly") out.measure = "anomaly";
  return out;
}

/** Checks a link's range against the served record once /meta is known. Null when it fits. */
export function rangeNote(range: DateRange, meta: Meta): string | null {
  const r = checkRange(range.start, range.end, wholeRecord(meta));
  return r.ok ? null : messages.client[REFUSAL[r.problem]];
}

/** The query part of the current address. */
export function currentQuery(hash: string): string {
  const i = hash.indexOf("?");
  return i < 0 ? "" : hash.slice(i + 1);
}

/**
 * What the calendar does when the address changes in an open tab (an edited address, Back or Forward).
 * `written` is the address the page last wrote for its own state (replaceState fires no hashchange).
 *   "ignore"  another page's route, or the address the page already shows.
 *   "restore" "#/" with no state (the Calendar link in the masthead): keep the shown state and write it back.
 *   "reload"  read the link again and load what it names, as opening it fresh does.
 */
export function addressChange(hash: string, written: string): "ignore" | "restore" | "reload" {
  if (routeFromHash(hash) !== "calendar" || hash === written) return "ignore";
  return currentQuery(hash) === "" ? "restore" : "reload";
}
