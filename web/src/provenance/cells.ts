// Loading the area's 1° cells for the evidence-class map (Story 3.6).
//
// Each cell's evidence_class is served by POST /cells (contract: Cell). It is
// a static lookup, so any month gives the same classes; the current month is
// asked for unless a month is given (Story 3.8 asks for the month the user
// picked, to show each cell's flag state). A failed or refused answer gives null and the map is left out;
// the caveat's words still show.
//
// This sits outside api/client.ts only because Story 3.6 was scoped away from
// shared files; it belongs in ServiceClient as postCells when that file is next
// opened (DECISIONS.md, Story 3.6).
import type { components } from "../api/schema";
import { SERVICE_BASE_URL } from "../config";

type S = components["schemas"];
export type Cells = S["Cells"];
type Meta = S["Meta"];
type AoiInput = S["CellsRequest"]["aoi"];

export type CellsLoader = (meta: Meta, aoi: AoiInput, month?: string) => Promise<Cells | null>;

export function cellsRequest(meta: Meta, aoi: AoiInput, month: string = meta.current_month): S["CellsRequest"] {
  return { record_version: meta.record_version, aoi, month };
}

export function createCellsLoader(baseUrl: string | null, fetchImpl: typeof fetch = fetch): CellsLoader {
  return async (meta, aoi, month) => {
    try {
      if (baseUrl === null) {
        // Fixture mode serves Sumatra for every area, as /calendar does.
        return (await import("../../../contract/fixture/cells.json")).default as unknown as Cells;
      }
      const res = await fetchImpl(`${baseUrl}/cells`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cellsRequest(meta, aoi, month)),
      });
      return res.ok ? ((await res.json()) as Cells) : null;
    } catch {
      return null;
    }
  };
}

export const loadCells: CellsLoader = createCellsLoader(SERVICE_BASE_URL);
