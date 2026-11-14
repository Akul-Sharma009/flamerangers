import { describe, expect, it } from "vitest";
import { ProblemError, createClient, loadDefaultCalendar } from "./client";
import type { Calendar, Meta } from "./client";

const BASE = "http://svc.test";

function json(body: unknown, status = 200, type = "application/json"): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": type } });
}
const problem = (code: string, status: number, extra: object = {}) =>
  json({ type: "about:blank", title: code, status, code, ...extra }, status, "application/problem+json");

describe("fixture mode", () => {
  it("serves meta and the default calendar", async () => {
    const c = createClient(null);
    const meta = await c.getMeta();
    expect(meta.placeholder).toBe(true);
    expect(meta.record_version).toBe("20261114-1a2b3c4d");
    const { calendar } = await loadDefaultCalendar(c);
    expect(calendar.months).toHaveLength(300);
    expect(calendar.aoi.name).toBe("Sumatra");
  });

  it("rejects a stale record_version", async () => {
    const c = createClient(null);
    const req = { record_version: "stale", aoi: { name: "x", geometry: {} }, start: "2002-07-01", end: "2026-11-13" };
    const err = await c.postCalendar(req as never).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProblemError);
    expect((err as ProblemError).code).toBe("version_superseded");
  });
});

describe("service mode", () => {
  const meta = (v: string) => ({ record_version: v, data_through: "2026-11-13", record_start: "2002-07" }) as unknown as Meta;
  const cal = { aoi: { name: "Sumatra" }, months: [] } as unknown as Calendar;

  it("calls /meta and /calendar with the default request", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.endsWith("/meta") ? json(meta("v1")) : json(cal);
    }) as unknown as typeof fetch;
    await loadDefaultCalendar(createClient(BASE, f));
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/meta`, `${BASE}/calendar`]);
    expect(calls[1].init?.method).toBe("POST");
    const body = JSON.parse(calls[1].init?.body as string);
    expect(body.record_version).toBe("v1");
    expect(body.aoi.name).toBe("Sumatra");
    expect(body.start).toBe("2002-07-01");
    expect(body.end).toBe("2026-11-13");
  });

  it("maps a problem+json answer to ProblemError", async () => {
    const f = (async () => problem("outside_coverage", 404)) as unknown as typeof fetch;
    const err = await createClient(BASE, f).getMeta().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProblemError);
    expect((err as ProblemError).code).toBe("outside_coverage");
  });

  it("throws a plain Error for other failures", async () => {
    const f = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const err = await createClient(BASE, f).getMeta().catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ProblemError);
    expect(err).toBeInstanceOf(Error);
  });

  it("retries once on version_superseded", async () => {
    let metas = 0;
    const versions: string[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      if (url.endsWith("/meta")) return json(meta(++metas === 1 ? "v1" : "v2"));
      const v = JSON.parse(init?.body as string).record_version as string;
      versions.push(v);
      return v === "v1" ? problem("version_superseded", 410, { current_record_version: "v2" }) : json(cal);
    }) as unknown as typeof fetch;
    const out = await loadDefaultCalendar(createClient(BASE, f));
    expect(versions).toEqual(["v1", "v2"]);
    expect(out.meta.record_version).toBe("v2");
  });

  it("does not loop on a second 410", async () => {
    let posts = 0;
    const f = (async (url: string) => {
      if (url.endsWith("/meta")) return json(meta("v"));
      posts++;
      return problem("version_superseded", 410);
    }) as unknown as typeof fetch;
    const err = await loadDefaultCalendar(createClient(BASE, f)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProblemError);
    expect(posts).toBe(2);
  });
});
