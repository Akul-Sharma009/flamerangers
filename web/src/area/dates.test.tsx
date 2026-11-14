import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarFixture from "../../../contract/fixture/calendar.json";
import metaFixture from "../../../contract/fixture/meta.json";
import {
  createClient, rangeRequest, wholeRecord, type Calendar, type CalendarRequest, type DateRange, type Meta,
  type ServiceClient,
} from "../api/client";
import { messages } from "../api/messages";
import { formatCount } from "../format";
import { buildGridModel } from "../grid/model";
import { CalendarView } from "../pages/CalendarPage";
import { AreaLocator } from "./AreaLocator";
import { AreaPicker } from "./AreaPicker";
import { checkRange, isDay } from "./dates";
import { defaultArea, featuredAreas } from "./featured";
import { loadArea } from "./load";

const meta = metaFixture as unknown as Meta;
const sumatra = calendarFixture as unknown as Calendar;
const bounds = wholeRecord(meta);
const CUT: DateRange = { start: "2010-03-15", end: "2012-06-10" };

function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

function stub(answer: Calendar = sumatra): ServiceClient & { asked: CalendarRequest[] } {
  const asked: CalendarRequest[] = [];
  return {
    asked,
    getMeta: async () => meta,
    async postCalendar(req) {
      asked.push(req);
      return answer;
    },
    postAnalyticsCsv: async () => "",
    postHotspotsCsv: async () => "",
  };
}

/** An answer for the cut range, built from the fixture as the service would label it. */
function cutCalendar(): Calendar {
  const months = sumatra.months
    .filter((m) => m.month >= "2010-01" && m.month <= "2012-12")
    .map((m) =>
      m.month === "2010-03" || m.month === "2012-06"
        ? { ...m, partial_reasons: [...m.partial_reasons, "range_cut" as const] }
        : m,
    );
  return {
    ...sumatra,
    range: { ...CUT },
    months,
    year_totals: sumatra.year_totals.filter((y) => y.year >= 2010 && y.year <= 2012),
    statistics: { ...sumatra.statistics, top_years: [{ year: 2011, total: 1, rank: 1 }] },
  };
}

function datesTab(extra: Partial<Parameters<typeof AreaPicker>[0]> = {}): string {
  return renderToStaticMarkup(
    <AreaPicker
      currentName="Sumatra"
      initialTab="dates"
      onSelect={() => undefined}
      onClose={() => undefined}
      dates={{ bounds, referencePeriod: meta.reference_period, current: bounds }}
      {...extra}
    />,
  );
}

function input(html: string, name: string): string {
  const m = new RegExp(`<input[^>]*name="${name}"[^>]*>`).exec(html);
  if (!m) throw new Error(`no ${name} input`);
  return m[0];
}

describe("Story 3.4 AC1: first load is July 2002 to the served data-through date", () => {
  it("the first request runs from the first day of the served record_start month to the served data_through", async () => {
    const service = stub();
    await loadArea(service, defaultArea().aoi);
    expect(service.asked[0]!.start).toBe(`${meta.record_start}-01`);
    expect(service.asked[0]!.start).toBe("2002-07-01");
    expect(service.asked[0]!.end).toBe(meta.data_through);
  });

  it("the dates tab opens on the whole record, with the served bounds as min and max", () => {
    const html = datesTab();
    expect(input(html, "start")).toContain(`value="${bounds.start}"`);
    expect(input(html, "start")).toContain(`min="${bounds.start}"`);
    expect(input(html, "end")).toContain(`value="${meta.data_through}"`);
    expect(input(html, "end")).toContain(`max="${meta.data_through}"`);
    expect(text(html)).toContain("1 July 2002 to 13 November 2026");
  });

  it("the locator shows the served range under the area's name and opens on area or dates", () => {
    const closed = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: null, result: { status: "ready", meta, calendar: sumatra } }}
        onSelect={() => undefined} />,
    );
    expect(closed).toMatch(/data-field="range"[^>]*>1 July 2002 to 13 November 2026</);
    expect(closed).toMatch(/aria-expanded="false"[^>]*>Change area or dates</);
    const open = renderToStaticMarkup(
      <AreaLocator selected={defaultArea().aoi} calendar={sumatra} problemText={null} loading={false}
        onSelect={() => undefined} meta={meta} initialOpen initialTab="dates" />,
    );
    expect(open).toContain('id="picker-panel-dates"');
    expect(text(open)).toContain("Dates");
  });

  it("shows no range and no date fields before /meta and the calendar are served", () => {
    const loading = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: null, result: null }} onSelect={() => undefined} />,
    );
    expect(loading).not.toContain('data-field="range"');
    const tab = datesTab({ dates: null });
    expect(tab).not.toContain('type="date"');
    expect(text(tab)).toContain("Loading");
  });
});

describe("Story 3.4: the range goes out in every request that takes one", () => {
  it("rangeRequest carries start and end; null is the whole record", () => {
    const aoi = defaultArea().aoi;
    expect(rangeRequest(meta, aoi, CUT)).toEqual({ record_version: meta.record_version, aoi, ...CUT });
    expect(rangeRequest(meta, aoi, null)).toMatchObject({ start: "2002-07-01", end: meta.data_through });
  });

  it("/calendar, /analytics.csv and /hotspots.csv send the chosen start and end", async () => {
    const bodies: Record<string, { start: string; end: string }> = {};
    const f = (async (url: string, init?: RequestInit) => {
      bodies[new URL(url).pathname] = JSON.parse(init?.body as string);
      const type = url.endsWith(".csv") ? "text/csv" : "application/json";
      return new Response(type === "text/csv" ? "a\n" : JSON.stringify(sumatra), { headers: { "content-type": type } });
    }) as unknown as typeof fetch;
    const c = createClient("http://svc.test", f);
    const req = rangeRequest(meta, defaultArea().aoi, CUT);
    await loadArea(c, defaultArea().aoi, meta, CUT);
    await c.postAnalyticsCsv(req);
    await c.postHotspotsCsv({ ...req, all_satellites: false });
    for (const path of ["/calendar", "/analytics.csv", "/hotspots.csv"]) {
      expect(bodies[path], path).toMatchObject(CUT);
    }
  });

  it("keeps the range when the area changes: the page asks for the new area over the same dates", async () => {
    const service = stub();
    const punjab = featuredAreas().find((a) => a.id === "punjab")!.aoi;
    await loadArea(service, punjab, meta, CUT);
    expect(service.asked[0]).toMatchObject({ aoi: punjab, ...CUT });
  });
});

describe("Story 3.4 AC2: a range that cuts a month", () => {
  it("is sent as typed, not snapped to whole months", async () => {
    const service = stub();
    await loadArea(service, defaultArea().aoi, meta, CUT);
    expect(service.asked[0]).toMatchObject({ start: "2010-03-15", end: "2012-06-10" });
  });

  it("draws every month of the years the range touches, with the served whole-month count", () => {
    const cut = cutCalendar();
    const model = buildGridModel(cut, meta);
    expect(model.rows.map((r) => r.year).sort()).toEqual([2010, 2011, 2012]);
    expect(model.rows.every((r) => r.cells.length === 12)).toBe(true);
    const march = model.rows.flatMap((r) => r.cells).find((c) => c.month === "2010-03")!;
    const served = cut.months.find((m) => m.month === "2010-03")!;
    expect(march.count).toBe(served.count);
    expect(march.title).toContain(`${formatCount(served.count!)} ${cut.unit_label}`);
  });

  it("labels each month the range cuts with the range_cut sentence (the grid's mark is Story 3.5)", () => {
    const cells = buildGridModel(cutCalendar(), meta).rows.flatMap((r) => r.cells);
    const label = messages.labels.partial_reason.range_cut;
    expect(cells.filter((c) => c.title.includes(label)).map((c) => c.month).sort()).toEqual(["2010-03", "2012-06"]);
  });

  it("titles the calendar with the served range's months", () => {
    const html = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: CUT, result: { status: "ready", meta, calendar: cutCalendar() } }}
        onSelect={() => undefined} />,
    );
    expect(text(html)).toContain("Hotspots per month, March 2010 to June 2012");
    expect(html).toMatch(/data-field="range"[^>]*>15 March 2010 to 10 June 2012</);
  });
});

describe("Story 3.4 AC3: rankings follow the range; median and anomalies keep the reference period", () => {
  it("draws the rank marks the service sent for the range, not ones of its own", () => {
    const model = buildGridModel(cutCalendar(), meta);
    expect(model.rows.find((r) => r.year === 2011)!.topRank).toBe(1);
    expect(model.rows.filter((r) => r.topRank !== null)).toHaveLength(1);
  });

  it("states the served reference period beside the dates", () => {
    const html = datesTab();
    const { start_year, end_year } = meta.reference_period;
    expect(html).toMatch(new RegExp(`data-field="meta.reference_period"[^>]*>${start_year} to ${end_year}<`));
  });
});

describe("Story 3.4: refused ranges", () => {
  it("accepts a range inside the record, a single day, and the whole record", () => {
    expect(checkRange("2010-03-15", "2012-06-10", bounds)).toEqual({ ok: true, range: CUT });
    expect(checkRange("2015-09-01", "2015-09-01", bounds).ok).toBe(true);
    expect(checkRange(bounds.start, bounds.end, bounds).ok).toBe(true);
  });

  it("refuses an unreadable or impossible day and marks that field", () => {
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("13/11/2026")).toBe(false);
    expect(checkRange("", "2012-06-10", bounds)).toEqual({ ok: false, problem: "unreadable", fields: ["start"] });
    expect(checkRange("2010-03-15", "2011-02-29", bounds)).toEqual({ ok: false, problem: "unreadable", fields: ["end"] });
  });

  it("refuses days before the record or after the served data_through", () => {
    expect(checkRange("2002-06-30", "2012-06-10", bounds)).toEqual({ ok: false, problem: "before_record", fields: ["start"] });
    expect(checkRange("2010-03-15", "2026-11-14", bounds)).toEqual({
      ok: false, problem: "after_data_through", fields: ["end"],
    });
  });

  it("refuses a start after the end and marks both", () => {
    expect(checkRange("2012-06-10", "2010-03-15", bounds)).toEqual({
      ok: false, problem: "out_of_order", fields: ["start", "end"],
    });
  });

  it("marks the refused fields in the form, and ties each field's min and max to the other", () => {
    const html = datesTab({ initialRangeRefusal: { start: "2012-06-10", end: "2010-03-15" } });
    expect(html).toContain('data-problem="out_of_order"');
    expect(input(html, "start")).toContain('aria-invalid="true"');
    expect(input(html, "end")).toContain('aria-invalid="true"');
    expect(input(html, "start")).toContain('max="2010-03-15"');
    expect(input(html, "end")).toContain('min="2012-06-10"');
    const fine = datesTab();
    expect(fine).not.toContain("aria-invalid");
    expect(input(fine, "start")).toContain("required");
  });
});

describe("Story 3.4: house rules", () => {
  it("the dates code never says fires and does no date arithmetic", () => {
    for (const f of ["DatesPanel.tsx", "dates.ts"]) {
      const src = readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
      expect(src, f).not.toMatch(/\bfires?\b/i);
      expect(src, f).not.toMatch(/\.set(Date|Month|FullYear|UTCDate|UTCMonth)\(|getTime\(\)\s*[+-]/);
    }
  });
});
