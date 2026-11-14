// Typed areas: corner coordinates or polygon vertices, checked before they are
// sent. These checks compare what the user typed with the WGS84 limits; they
// compute no number the page shows (AD-8). Anything subtler (self-intersection,
// the vertex cap, a span over 180 degrees) is the service's invalid_aoi.

export type Polygon = { type: "Polygon"; coordinates: number[][][] };
export type MultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };

/**
 * Why typed coordinates were refused. The sentence for each is in area/words.ts.
 * `no_width`: west equals east (or west is 180 and east is -180), so the box has no area.
 */
export type TypedProblem = "unreadable" | "out_of_range" | "out_of_order" | "no_width" | "not_closed" | "too_few";

export type CornerField = "west" | "south" | "east" | "north";
export interface Corners {
  west: string;
  south: string;
  east: string;
  north: string;
}

export type TypedResult =
  | { ok: true; geometry: Polygon | MultiPolygon }
  | {
      ok: false;
      problem: TypedProblem;
      /** The corner fields at fault (corners form). */
      fields?: CornerField[];
      /** 1-based line numbers at fault (vertices form). */
      lines?: number[];
    };

/** A typed number, or null when the text is not one. Empty is not zero. */
function readNumber(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const lonOk = (x: number) => x >= -180 && x <= 180;
const latOk = (y: number) => y >= -90 && y <= 90;

/**
 * Corners -> a closed rectangle, counter-clockwise from the south-west corner.
 * South must be less than north. West greater than east is a box that crosses
 * 180 degrees: it is split there into a MultiPolygon, as the spine's Conventions
 * say (the lead's decision, 14 Nov; see DECISIONS.md). Whether its span is
 * allowed is the service's call.
 */
export function parseCorners(c: Corners): TypedResult {
  const fields: CornerField[] = ["west", "south", "east", "north"];
  const values = fields.map((f) => readNumber(c[f]));
  const unreadable = fields.filter((_, i) => values[i] === null);
  if (unreadable.length > 0) return { ok: false, problem: "unreadable", fields: unreadable };
  const [w, s, e, n] = values as number[];

  const outOfRange = fields.filter((f, i) =>
    f === "west" || f === "east" ? !lonOk(values[i]!) : !latOk(values[i]!),
  );
  if (outOfRange.length > 0) return { ok: false, problem: "out_of_range", fields: outOfRange };

  if (!(s < n)) return { ok: false, problem: "out_of_order", fields: ["south", "north"] };

  if (w < e) return { ok: true, geometry: rectangle(w, s, e, n) };
  // Across 180 degrees: west to 180, then -180 to east. A part with no width is dropped.
  const parts = [
    ...(w < 180 ? [rectangle(w, s, 180, n).coordinates] : []),
    ...(e > -180 ? [rectangle(-180, s, e, n).coordinates] : []),
  ];
  if (w === e || parts.length === 0) return { ok: false, problem: "no_width", fields: ["west", "east"] };
  if (parts.length === 1) return { ok: true, geometry: { type: "Polygon", coordinates: parts[0]! } };
  return { ok: true, geometry: { type: "MultiPolygon", coordinates: parts } };
}

export function rectangle(w: number, s: number, e: number, n: number): Polygon {
  return { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
}

/**
 * Vertices, one "longitude, latitude" pair per line (comma or spaces between).
 * The last vertex must repeat the first: a ring that is not closed is refused,
 * not silently closed, so the user sees the shape they meant.
 */
export function parseVertices(text: string): TypedResult {
  const rows = text
    .split(/\r?\n/)
    .map((line, i) => ({ line: i + 1, text: line.trim() }))
    .filter((r) => r.text !== "");

  const ring: number[][] = [];
  const unreadable: number[] = [];
  const outOfRange: number[] = [];
  for (const r of rows) {
    const parts = r.text.split(/[\s,;]+/).filter((p) => p !== "");
    const lon = parts.length === 2 ? readNumber(parts[0]!) : null;
    const lat = parts.length === 2 ? readNumber(parts[1]!) : null;
    if (lon === null || lat === null) {
      unreadable.push(r.line);
      continue;
    }
    if (!lonOk(lon) || !latOk(lat)) outOfRange.push(r.line);
    ring.push([lon, lat]);
  }
  if (unreadable.length > 0) return { ok: false, problem: "unreadable", lines: unreadable };
  if (outOfRange.length > 0) return { ok: false, problem: "out_of_range", lines: outOfRange };
  if (ring.length >= 3) {
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return { ok: false, problem: "not_closed", lines: [rows[0]!.line, rows[rows.length - 1]!.line] };
    }
  }
  // A closed ring of a polygon needs at least three corners plus the repeat.
  if (ring.length < 4) return { ok: false, problem: "too_few", lines: rows.map((r) => r.line) };
  return { ok: true, geometry: { type: "Polygon", coordinates: [ring] } };
}
