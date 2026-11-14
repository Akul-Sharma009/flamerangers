import type { components } from "./schema";
import regionsRaw from "../../../contract/regions.geojson?raw";
import { SERVICE_BASE_URL } from "../config";

export type Meta = components["schemas"]["Meta"];
export type Calendar = components["schemas"]["Calendar"];
export type CalendarRequest = components["schemas"]["CalendarRequest"];
export type HotspotsCsvRequest = components["schemas"]["HotspotsCsvRequest"];
export type AoiRequest = CalendarRequest["aoi"];
export type Problem = components["schemas"]["Problem"];
export type ProblemCode = components["schemas"]["ProblemCode"];

const STATUS: Record<ProblemCode, number> = {
  invalid_aoi: 400,
  outside_coverage: 404,
  version_superseded: 410,
  too_large_for_sync: 413,
  no_land: 422,
  rate_limited: 429,
};

// The UI looks the user-facing sentence up by code; the client carries none.
export class ProblemError extends Error {
  readonly code: ProblemCode;
  readonly problem: Problem;
  constructor(problem: Problem) {
    super(problem.code);
    this.name = "ProblemError";
    this.code = problem.code;
    this.problem = problem;
  }
}

export interface ServiceClient {
  getMeta(): Promise<Meta>;
  postCalendar(req: CalendarRequest): Promise<Calendar>;
  postAnalyticsCsv(req: CalendarRequest): Promise<string>;
  postHotspotsCsv(req: HotspotsCsvRequest): Promise<string>;
}

/** A date range as the contract sends it: first and last day (UTC), both included. */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * The whole record, from the served /meta: the first day of the record_start
 * month to data_through. The range on first load. String building only.
 */
export function wholeRecord(meta: Meta): DateRange {
  return { start: `${meta.record_start}-01`, end: meta.data_through };
}

/**
 * The body of every request that carries a range: /calendar and /analytics.csv
 * as is, /hotspots.csv with its own options added. A range of null is the whole
 * record. /cells takes one month and no range (CellsRequest).
 */
export function rangeRequest(meta: Meta, aoi: AoiRequest, range: DateRange | null): CalendarRequest {
  const { start, end } = range ?? wholeRecord(meta);
  return { record_version: meta.record_version, aoi, start, end };
}

async function fromFixture<T>(load: () => Promise<{ default: unknown }>): Promise<T> {
  return (await load()).default as unknown as T;
}

const loadMeta = () => import("../../../contract/fixture/meta.json");
const loadCalendar = () => import("../../../contract/fixture/calendar.json");

function fixtureClient(): ServiceClient {
  return {
    getMeta: () => fromFixture<Meta>(loadMeta),
    async postCalendar(req) {
      const meta = await fromFixture<Meta>(loadMeta);
      if (req.record_version !== meta.record_version) {
        throw new ProblemError({
          type: "about:blank",
          title: "version_superseded",
          status: STATUS.version_superseded,
          code: "version_superseded",
          current_record_version: meta.record_version,
        });
      }
      return fromFixture<Calendar>(loadCalendar);
    },
    // The fixture holds no CSV; downloads need the service.
    postAnalyticsCsv: () => Promise.reject(new Error("fixture mode serves no CSV")),
    postHotspotsCsv: () => Promise.reject(new Error("fixture mode serves no CSV")),
  };
}

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/problem+json")) {
    throw new ProblemError((await res.json()) as Problem);
  }
  throw new Error(`service answered ${res.status}`);
}

async function parseText(res: Response): Promise<string> {
  if (res.ok) return res.text();
  return parse<never>(res);
}

export function createClient(
  baseUrl: string | null,
  fetchImpl: typeof fetch = fetch,
): ServiceClient {
  if (baseUrl === null) return fixtureClient();
  const post = (path: string, req: unknown) =>
    fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
  return {
    async getMeta() {
      return parse<Meta>(await fetchImpl(`${baseUrl}/meta`));
    },
    async postCalendar(req) {
      return parse<Calendar>(await post("/calendar", req));
    },
    async postAnalyticsCsv(req) {
      return parseText(await post("/analytics.csv", req));
    },
    async postHotspotsCsv(req) {
      return parseText(await post("/hotspots.csv", req));
    },
  };
}

interface RegionFeature {
  properties: { name: string; default?: boolean };
  geometry: { type: string; coordinates: unknown };
}

function defaultRequest(meta: Meta): CalendarRequest {
  const collection = JSON.parse(regionsRaw) as { features: RegionFeature[] };
  const feature = collection.features.find((f) => f.properties.default === true);
  if (!feature) throw new Error("no default region in regions.geojson");
  const { type, coordinates } = feature.geometry;
  const aoi = { name: feature.properties.name, geometry: { type, coordinates } } as unknown as AoiRequest;
  return rangeRequest(meta, aoi, null);
}

export async function loadDefaultCalendar(
  client: ServiceClient,
): Promise<{ meta: Meta; calendar: Calendar }> {
  let meta = await client.getMeta();
  try {
    return { meta, calendar: await client.postCalendar(defaultRequest(meta)) };
  } catch (err) {
    if (!(err instanceof ProblemError) || err.code !== "version_superseded") throw err;
    meta = await client.getMeta();
    return { meta, calendar: await client.postCalendar(defaultRequest(meta)) };
  }
}

export const client = createClient(SERVICE_BASE_URL);
