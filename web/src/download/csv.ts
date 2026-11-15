// Story 4.4: asking the service for a CSV and saving it. The service writes the
// file; the browser only saves the text it is given (AD-8).
import { ProblemError, rangeRequest, type DateRange, type Meta, type Problem, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import type { AoiInput } from "../area/featured";
import { saveBlob } from "./save";
import { slug } from "./words";

export type CsvKind = "analytics" | "hotspots";

export type CsvOutcome =
  | { status: "saved" }
  /** 413: the contract sentence, and the years the service offers to request one at a time. */
  | { status: "too_large"; text: string; years: number[]; problem: Problem }
  | { status: "failed"; text: string };

export interface CsvAsk {
  kind: CsvKind;
  allSatellites?: boolean;
  /** Only this year's rows (after a too_large_for_sync answer). */
  year?: number;
}

export function csvFilename(area: string, ask: CsvAsk): string {
  const parts = ["hotspots", slug(area), ask.kind === "analytics" ? "analytics" : "hotspot-list"];
  if (ask.kind === "hotspots" && ask.allSatellites) parts.push("all-satellites");
  if (ask.year !== undefined) parts.push(String(ask.year));
  return `${parts.join("-")}.csv`;
}

/** Asks for one CSV for the searched area and dates, and saves it when it arrives. */
export async function downloadCsv(
  service: ServiceClient, meta: Meta, aoi: AoiInput, range: DateRange | null, area: string, ask: CsvAsk,
  save: (blob: Blob, filename: string) => void = saveBlob,
): Promise<CsvOutcome> {
  try {
    const base = rangeRequest(meta, aoi, range);
    const text =
      ask.kind === "analytics"
        ? await service.postAnalyticsCsv(base)
        : await service.postHotspotsCsv({
            ...base,
            all_satellites: ask.allSatellites ?? false,
            ...(ask.year !== undefined ? { year: ask.year } : {}),
          });
    save(new Blob([text], { type: "text/csv;charset=utf-8" }), csvFilename(area, ask));
    return { status: "saved" };
  } catch (err) {
    if (err instanceof ProblemError) {
      if (err.code === "too_large_for_sync") {
        return { status: "too_large", text: messages.problems.too_large_for_sync, years: err.problem.years ?? [], problem: err.problem };
      }
      return { status: "failed", text: messages.problems[err.code] };
    }
    return { status: "failed", text: messages.client.service_unreachable };
  }
}
