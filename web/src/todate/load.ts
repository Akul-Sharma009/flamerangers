// Loading the season-to-date series (Story 7.6): POST /season_to_date. Like the cells loader, it sits outside
// api/client.ts so the shared client file stays untouched; it belongs in ServiceClient as postSeason.
import type { components } from "../api/schema";
import { SERVICE_BASE_URL } from "../config";

type S = components["schemas"];
export type SeasonToDate = S["SeasonToDate"];
export type SeasonToDateMonth = S["SeasonToDateMonth"];
type Meta = S["Meta"];
type AoiInput = S["SeasonToDateRequest"]["aoi"];

export type SeasonToDateLoader = (meta: Meta, aoi: AoiInput, year: number) => Promise<SeasonToDate | null>;

export function seasonToDateRequest(meta: Meta, aoi: AoiInput, year: number): S["SeasonToDateRequest"] {
  return { record_version: meta.record_version, aoi, year };
}

/** A failed or refused answer gives null and the section says so; it never draws a chart of zeros. */
export function createSeasonToDateLoader(baseUrl: string | null, fetchImpl: typeof fetch = fetch): SeasonToDateLoader {
  return async (meta, aoi, year) => {
    try {
      if (baseUrl === null) {
        // Fixture mode serves Sumatra, 2026, for every area and year, as /calendar does.
        return (await import("../../../contract/fixture/season_to_date.json")).default as unknown as SeasonToDate;
      }
      const res = await fetchImpl(`${baseUrl}/season_to_date`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(seasonToDateRequest(meta, aoi, year)),
      });
      return res.ok ? ((await res.json()) as SeasonToDate) : null;
    } catch {
      return null;
    }
  };
}

export const loadSeasonToDate: SeasonToDateLoader = createSeasonToDateLoader(SERVICE_BASE_URL);
