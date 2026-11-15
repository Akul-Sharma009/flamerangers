// Story 8.10: the globe of unusual burning. Loading one month's cells
// (POST /world_cells, Story 8.9) and turning the answer into map features,
// table rows, calendar links and a picture. Every value shown is a served
// field, formatted only (AD-8); the only arithmetic here is on coordinates
// (a cell's 1° box) and on month labels (stepping the month control).
import type { components } from "../api/schema";
import { messages } from "../api/messages";
import { SERVICE_BASE_URL } from "../config";
import { formatCount, formatDay, formatYearMonth } from "../format";
import { encodeShare } from "../share";

type S = components["schemas"];
export type WorldCells = S["WorldCells"];
export type WorldCell = S["WorldCell"];
type Meta = S["Meta"];
export type FlagState = S["FlagState"];

export type WorldCellsLoader = (meta: Meta, month: string) => Promise<WorldCells | null>;

export function createWorldCellsLoader(baseUrl: string | null, fetchImpl: typeof fetch = fetch): WorldCellsLoader {
  return async (meta, month) => {
    try {
      if (baseUrl === null) {
        // Fixture mode serves its one month (Sumatra, September 2015) for every month asked.
        return (await import("../../../contract/fixture/world_cells.json")).default as unknown as WorldCells;
      }
      const res = await fetchImpl(`${baseUrl}/world_cells`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ record_version: meta.record_version, month }),
      });
      return res.ok ? ((await res.json()) as WorldCells) : null;
    } catch {
      return null;
    }
  };
}

export const loadWorldCells: WorldCellsLoader = createWorldCellsLoader(SERVICE_BASE_URL);

/** "2015-09" stepped by whole months, kept within [min, max]. Label arithmetic, not data. */
export function stepMonth(ym: string, by: number, min: string, max: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1 + by;
  const t = y * 12 + m;
  const out = `${String(Math.floor(t / 12)).padStart(4, "0")}-${String((t % 12 + 12) % 12 + 1).padStart(2, "0")}`;
  return out < min ? min : out > max ? max : out;
}

/** The cell's own 1° box, as the calendar's typed shape. */
export function cellGeometry(c: Pick<WorldCell, "sw_lon" | "sw_lat">): { type: "Polygon"; coordinates: number[][][] } {
  const x = c.sw_lon;
  const y = c.sw_lat;
  return { type: "Polygon", coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]] };
}

/** The shareable calendar link for a box around the cell (Story 8.1's format). */
export function cellLink(c: Pick<WorldCell, "sw_lon" | "sw_lat">): string {
  return encodeShare({ area: { name: null, geometry: cellGeometry(c) }, range: null, grid: "grid", measure: "count" });
}

/** "102°E, 7°S": the served south-west corner, in words. String formatting only. */
export function cornerWords(c: Pick<WorldCell, "sw_lon" | "sw_lat">): string {
  const lon = c.sw_lon < 0 ? `${-c.sw_lon}°W` : `${c.sw_lon}°E`;
  const lat = c.sw_lat < 0 ? `${-c.sw_lat}°S` : `${c.sw_lat}°N`;
  return `${lon}, ${lat}`;
}

/** The flagged cells, strong first, in the served order within each tier. A filter, not a ranking. */
export function flaggedCells(w: WorldCells): WorldCell[] {
  return [...w.cells.filter((c) => c.flag_state === "strong"), ...w.cells.filter((c) => c.flag_state === "marginal")];
}

/** One cell in words: corner, state, served count and threshold, evidence class. */
export function cellWords(c: WorldCell): string {
  return [
    `Cell ${cornerWords(c)}.`,
    messages.labels.flag_state[c.flag_state],
    c.count === null ? "Count –." : `Count ${formatCount(c.count)} hotspots.`,
    c.threshold === null ? "Threshold –." : `Threshold ${formatCount(c.threshold)}.`,
    messages.labels.evidence_class[c.evidence_class],
    c.provisional ? messages.notes.provisional : "",
  ].filter(Boolean).join(" ");
}

/** The month and its provenance, in words, from served fields only. */
export function monthWords(w: WorldCells): string[] {
  const loaded = w.coverage.regions.filter((r) => r.status === "loaded").map((r) => r.name);
  const notLoaded = w.coverage.regions.filter((r) => r.status === "not_loaded").map((r) => r.name);
  return [
    `${formatYearMonth(w.month)}. ${w.source === null ? messages.labels.null_reason.outside_record : messages.labels.source[w.source]}`,
    w.coverage.global
      ? "Every land area is loaded."
      : `Loaded: ${loaded.join(", ") || "none"}.` +
        (notLoaded.length ? ` ${messages.labels.coverage_status.not_loaded.replace(/\.$/, "")}: ${notLoaded.join(", ")}.` : ""),
    `Data through ${formatDay(w.data_through)}. Record version ${w.record_version}.`,
  ];
}

/** The answer as GeoJSON for the map: one 1° square per served cell, with its served fields. */
export function cellFeatures(w: WorldCells) {
  return {
    type: "FeatureCollection" as const,
    features: w.cells.map((c) => ({
      type: "Feature" as const,
      properties: { flag_state: c.flag_state, sw_lon: c.sw_lon, sw_lat: c.sw_lat, evidence_class: c.evidence_class },
      geometry: cellGeometry(c),
    })),
  };
}

/** Centre points of the flagged cells, for the shape marks (filled dot = strong, ring = marginal). */
export function markFeatures(w: WorldCells) {
  return {
    type: "FeatureCollection" as const,
    features: flaggedCells(w).map((c) => ({
      type: "Feature" as const,
      properties: { flag_state: c.flag_state },
      geometry: { type: "Point" as const, coordinates: [c.sw_lon + 0.5, c.sw_lat + 0.5] },
    })),
  };
}

export const STATE_ORDER: FlagState[] = ["strong", "marginal", "none", "not_flaggable", "outside_record"];

export interface Palette { strong: string; marginal: string; none: string; not_flaggable: string; outside_record: string; ink: string; land: string; rule: string; paper: string; tint: string; tintOpacity: number }

/**
 * The picture's map: a flat world (longitude across, latitude down) with land,
 * each served cell as a 1° square, and the same shape marks as the globe.
 * Coordinates are placed, never computed into a shown number.
 */
export function worldMapMarkup(w: WorldCells, land: string, p: Palette, scale = 2): { markup: string; width: number; height: number } {
  const width = 360 * scale;
  const height = 180 * scale;
  const X = (lon: number) => (lon + 180) * scale;
  const Y = (lat: number) => (90 - lat) * scale;
  const out: string[] = [
    `<rect width="${width}" height="${height}" fill="${p.paper}" stroke="${p.rule}"/>`,
    `<path d="${land}" fill="${p.land}" stroke="${p.rule}" stroke-width="0.5"/>`,
  ];
  for (const c of w.cells) {
    if (c.flag_state === "outside_record") continue;
    out.push(`<rect x="${X(c.sw_lon)}" y="${Y(c.sw_lat + 1)}" width="${scale}" height="${scale}" fill="${p.tint}" fill-opacity="${p.tintOpacity}"/>`);
  }
  for (const c of flaggedCells(w)) {
    const cx = X(c.sw_lon + 0.5);
    const cy = Y(c.sw_lat + 0.5);
    out.push(c.flag_state === "strong"
      ? `<circle cx="${cx}" cy="${cy}" r="${scale * 0.9}" fill="${p.ink}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${scale * 0.9}" fill="none" stroke="${p.ink}" stroke-width="0.8"/>`);
  }
  return { markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${out.join("")}</svg>`, width, height };
}

type Ring = number[][];
/** Land outlines as one SVG path on the flat world. Rings that cross 180° are left as drawn by world-atlas. */
export function landPath(features: { geometry: { type: string; coordinates: unknown } }[], scale = 2): string {
  const ring = (r: Ring) => r.map((pt, i) => `${i ? "L" : "M"}${((pt[0]! + 180) * scale).toFixed(1)},${((90 - pt[1]!) * scale).toFixed(1)}`).join("") + "Z";
  const parts: string[] = [];
  for (const f of features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates as Ring[]] : g.type === "MultiPolygon" ? (g.coordinates as Ring[][]) : [];
    for (const poly of polys) for (const r of poly) parts.push(ring(r));
  }
  return parts.join("");
}
