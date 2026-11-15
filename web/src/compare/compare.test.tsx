import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarFixture from "../../../contract/fixture/calendar.json";
import metaFixture from "../../../contract/fixture/meta.json";
import type { Calendar, CalendarRequest, Meta, ServiceClient } from "../api/client";
import { featuredAreas } from "../area/featured";
import { buildGridModel } from "../grid/model";
import { encodeShare, parseShare } from "../share";
import { ComparedCalendars, loadPair } from "./CompareSection";
import { otherThan, sharesScale } from "./model";

const meta = metaFixture as unknown as Meta;
const sumatra = calendarFixture as unknown as Calendar;
const [A, B] = featuredAreas().slice(0, 2).map((a) => a.aoi);

/** A calendar as the service gives it: counts of its own, classes from `breaks` (class_index in core/stats.py). */
function served(name: string, scale: number, breaks: number[]): Calendar {
  const cls = (v: number) => breaks.reduce((k, b, i) => (v >= b ? i : k), 0);
  return {
    ...sumatra,
    aoi: { ...sumatra.aoi, name },
    months: sumatra.months.map((m) => {
      const count = m.count === null ? null : Math.round(m.count * scale * 10) / 10;
      return { ...m, count, colour_class: count === null ? null : cls(count) };
    }),
    statistics: { ...sumatra.statistics, colour_breaks: breaks },
  };
}

/** A stand-in for the service: each request that names a partner gets the pooled breaks. */
function service(): ServiceClient & { asked: CalendarRequest[] } {
  const asked: CalendarRequest[] = [];
  return {
    asked,
    getMeta: async () => meta,
    async postCalendar(req) {
      asked.push(req);
      const own = req.aoi.name === A!.name;
      return req.shared_scale_with ? served(req.aoi.name ?? "", own ? 1 : 0.2, [0, 1, 5, 20, 80, 300, 900]) : served(req.aoi.name ?? "", own ? 1 : 0.2, own ? [0, 1, 9, 40, 160] : [0, 1, 2, 8]);
    },
    postAnalyticsCsv: async () => "",
    postHotspotsCsv: async () => "",
  };
}

describe("Story 8.7: two areas on one colour scale", () => {
  it("asks for each area with the other named, and gets one set of classes", async () => {
    const s = service();
    const { a, b } = await loadPair(s, A!, B!, null, meta);
    expect(s.asked.map((r) => [r.aoi.name, r.shared_scale_with?.name])).toEqual([[A!.name, B!.name], [B!.name, A!.name]]);
    if (a.status !== "ready" || b.status !== "ready") throw new Error("not ready");
    expect(sharesScale(a.calendar, b.calendar)).toBe(true);
  });

  it("the same count has the same colour class in both grids", async () => {
    const { a, b } = await loadPair(service(), A!, B!, null, meta);
    if (a.status !== "ready" || b.status !== "ready") throw new Error("not ready");
    const classes = new Map<number, number>();
    let shared = 0;
    for (const r of [a, b]) {
      for (const row of buildGridModel(r.calendar, meta).rows) {
        for (const c of row.cells) {
          if (c.count === null) continue;
          const seen = classes.get(c.count);
          if (seen !== undefined) { expect(c.colourClass).toBe(seen); shared++; }
          classes.set(c.count, c.colourClass!);
        }
      }
    }
    expect(shared).toBeGreaterThan(0); // the two areas do hold some equal counts
  });

  it("without the partner the classes differ (why the pair is asked together)", () => {
    expect(sharesScale(served("a", 1, [0, 1, 9, 40, 160]), served("b", 1, [0, 1, 2, 8]))).toBe(false);
  });

  it("shows both areas, each labelled, with the shared-scale note and one key", async () => {
    const pair = await loadPair(service(), A!, B!, null, meta);
    const html = renderToStaticMarkup(<ComparedCalendars pair={pair} measure="count" onMeasure={() => undefined} view="table" onView={() => undefined} />);
    expect(html).toContain(A!.name);
    expect(html).toContain(B!.name);
    expect(html).toContain('data-compare="shared-scale"');
    expect(html.match(/class="gridlegend"/g)).toHaveLength(1);
    expect(html).toContain("comparegrids");
  });

  it("says so, and draws no shared key, when the classes came back different", () => {
    const pair = { a: { status: "ready" as const, meta, calendar: served("a", 1, [0, 1, 9]) }, b: { status: "ready" as const, meta, calendar: served("b", 1, [0, 1, 2]) } };
    const html = renderToStaticMarkup(<ComparedCalendars pair={pair} measure="count" onMeasure={() => undefined} view="table" onView={() => undefined} />);
    expect(html).toContain('data-compare="not-shared"');
    expect(html).not.toContain('data-compare="shared-scale"');
  });

  it("a refused second area leaves the first on show", () => {
    const pair = { a: { status: "ready" as const, meta, calendar: sumatra }, b: { status: "problem" as const, meta, code: "no_land" as const } };
    const html = renderToStaticMarkup(<ComparedCalendars pair={pair} measure="count" onMeasure={() => undefined} view="table" onView={() => undefined} />);
    expect(html).toContain("compareside");
    expect(html).toContain('role="status"');
  });

  it("starts with a featured area other than the one on show", () => {
    expect(otherThan(A!).name).not.toBe(A!.name);
  });
});

describe("Story 8.7: the second area in the link", () => {
  it("a featured area and a drawn shape both round-trip", () => {
    const featured = encodeShare({ area: A!, range: null, grid: "grid", measure: "count", compare: B! });
    expect(featured).toContain("compare=");
    expect(parseShare(featured.slice(3)).compare).toEqual(B);
    const drawn = { name: null, geometry: { type: "Polygon" as const, coordinates: [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]] } };
    const back = parseShare(encodeShare({ area: A!, range: null, grid: "grid", measure: "count", compare: drawn }).slice(3));
    expect(back.compare).toEqual(drawn);
    expect(back.notes).toEqual([]);
  });

  it("no comparison adds nothing to the address; an unreadable one falls back with the contract sentence", () => {
    expect(encodeShare({ area: A!, range: null, grid: "grid", measure: "count" })).not.toContain("compare");
    const bad = parseShare("compare=nowhere");
    expect(bad.compare).toBeNull();
    expect(bad.notes).toHaveLength(1);
  });
});
