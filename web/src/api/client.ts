import type { components } from "./schema";
import regionsRaw from "../../../contract/regions.geojson?raw";
import { SERVICE_BASE_URL } from "../config";

export type Meta = components["schemas"]["Meta"];
export type Calendar = components["schemas"]["Calendar"];
export type CalendarRequest = components["schemas"]["CalendarRequest"];
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

export function createClient(
  baseUrl: string | null,
  fetchImpl: typeof fetch = fetch,
): ServiceClient {
  if (baseUrl === null) return fixtureClient();
  return {
    async getMeta() {
      return parse<Meta>(await fetchImpl(`${baseUrl}/meta`));
    },
    async postCalendar(req) {
      return parse<Calendar>(
        await fetchImpl(`${baseUrl}/calendar`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(req),
        }),
      );
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
  return {
    record_version: meta.record_version,
    aoi: { name: feature.properties.name, geometry: { type, coordinates } },
    start: meta.record_start + "-01",
    end: meta.data_through,
  } as unknown as CalendarRequest;
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
