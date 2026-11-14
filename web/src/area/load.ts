// Loading the calendar for a chosen area. A problem answer (no_land,
// outside_coverage, ...) is kept as a problem and never turned into an empty
// calendar: missing is not zero.
import { ProblemError, type Calendar, type Meta, type ProblemCode, type ServiceClient } from "../api/client";
import type { AoiInput } from "./featured";

export type AreaResult =
  | { status: "ready"; meta: Meta; calendar: Calendar }
  | { status: "problem"; meta: Meta; code: ProblemCode }
  | { status: "failed"; meta: Meta | null };

function request(meta: Meta, aoi: AoiInput) {
  return {
    record_version: meta.record_version,
    aoi,
    start: meta.record_start + "-01",
    end: meta.data_through,
  };
}

/**
 * Asks for the calendar of `aoi` over the whole record. With version_superseded
 * it reloads /meta once and asks again, as the contract says.
 */
export async function loadArea(client: ServiceClient, aoi: AoiInput, known?: Meta): Promise<AreaResult> {
  let meta: Meta | null = known ?? null;
  try {
    meta ??= await client.getMeta();
    try {
      return { status: "ready", meta, calendar: await client.postCalendar(request(meta, aoi)) };
    } catch (err) {
      if (!(err instanceof ProblemError) || err.code !== "version_superseded") throw err;
      meta = await client.getMeta();
      return { status: "ready", meta, calendar: await client.postCalendar(request(meta, aoi)) };
    }
  } catch (err) {
    if (err instanceof ProblemError && meta) return { status: "problem", meta, code: err.code };
    return { status: "failed", meta };
  }
}
