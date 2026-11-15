// Story 8.2: countries and first-level administrative units, picked by name.
//
// Data: Natural Earth 1:10m admin-0 countries and admin-1 states and provinces, version 5.1.2,
// public domain, simplified by tools/build_admin_boundaries.py. It is loaded lazily: the name
// index when the tab opens, and one country's chunk (its outline and its first-level units) when
// a unit is chosen. Nothing here computes a number the page shows (AD-8).
import type { AoiInput } from "../featured";

export interface AdminEntry {
  /** ISO alpha-3 for a country (ADM0_A3); Natural Earth's adm1_code for a first-level unit. Unique. */
  code: string;
  name: string;
  level: 0 | 1;
  /** The country's code: the chunk this unit's geometry is in. */
  country: string;
  /** Natural Earth's type word: "Sovereign country", "Province", "State"... */
  kind: string;
  /** The longitude span is over 180 degrees, which the service refuses as invalid_aoi (set at build time). */
  wide?: true;
}

const indexLoader = () => import("./boundaries/index.json");
const chunkLoaders = import.meta.glob<{ default: Record<string, AoiInput["geometry"]> }>("./boundaries/c-*.json");

let indexPromise: Promise<AdminEntry[]> | null = null;

/** The name index, loaded once. */
export function loadAdminIndex(): Promise<AdminEntry[]> {
  indexPromise ??= indexLoader().then((m) => m.default as unknown as AdminEntry[]);
  return indexPromise;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/**
 * Entries whose name contains the query (accents and case ignored), names starting with it first,
 * countries before first-level units within each group. At most `limit`.
 */
export function searchAdmin(index: readonly AdminEntry[], query: string, limit = 40): AdminEntry[] {
  const q = fold(query);
  if (q === "") return [];
  const hits: { e: AdminEntry; rank: number }[] = [];
  for (const e of index) {
    const n = fold(e.name);
    const at = n.indexOf(q);
    if (at < 0) continue;
    hits.push({ e, rank: (at === 0 ? 0 : 2) + e.level });
  }
  hits.sort((a, b) => a.rank - b.rank || a.e.name.localeCompare(b.e.name));
  return hits.slice(0, limit).map((h) => h.e);
}

/** "Aceh, Indonesia" for a first-level unit, "Indonesia" for a country. */
export function adminLabel(index: readonly AdminEntry[], e: AdminEntry): string {
  if (e.level === 0) return e.name;
  const country = index.find((c) => c.level === 0 && c.code === e.country);
  return country ? `${e.name}, ${country.name}` : e.name;
}

/** Which unit each loaded geometry came from, so the link can write `admin=<code>`. */
const codes = new WeakMap<object, string>();

/** The unit's code when this geometry came from `loadAdminUnit`. */
export function adminCodeOf(geometry: object): string | null {
  return codes.get(geometry) ?? null;
}

export interface LoadedUnit {
  entry: AdminEntry;
  aoi: AoiInput;
}

/** The unit's geometry as an area, or null when the code names no unit. */
export async function loadAdminUnit(code: string): Promise<LoadedUnit | null> {
  const index = await loadAdminIndex();
  const entry = index.find((e) => e.code === code);
  if (!entry) return null;
  const load = chunkLoaders[`./boundaries/c-${entry.country}.json`];
  if (!load) return null;
  const geometry = (await load()).default[code];
  if (!geometry) return null;
  codes.set(geometry, code);
  return { entry, aoi: { name: adminLabel(index, entry), geometry } };
}
