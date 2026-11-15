// Loading the calendar for a chosen area. A problem answer (no_land,
// outside_coverage, ...) is kept as a problem and never turned into an empty
// calendar: missing is not zero.
import {
  ProblemError, rangeRequest, type Calendar, type DateRange, type Meta, type ProblemCode, type ServiceClient,
} from "../api/client";
import type { AoiInput } from "./featured";
import { withReference, type YearRange } from "../reference/period";

export type AreaResult =
  | { status: "ready"; meta: Meta; calendar: Calendar }
  | { status: "problem"; meta: Meta; code: ProblemCode }
  | { status: "failed"; meta: Meta | null };

/**
 * Asks for the calendar of `aoi` over `range`, or over the whole record when
 * `range` is null (July 2002 to the served data_through). With
 * version_superseded it reloads /meta once and asks again, as the contract
 * says; a null range then follows the new data_through.
 */
export async function loadArea(
  client: ServiceClient, aoi: AoiInput, known?: Meta, range: DateRange | null = null, sharedScaleWith?: AoiInput,
  /** Story 8.4: the reference period; null (or the default) sends no option. */
  reference: YearRange | null = null,
): Promise<AreaResult> {
  const request = (m: Meta, a: AoiInput) => withReference(rangeRequest(m, a, range, sharedScaleWith), reference, m);
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
