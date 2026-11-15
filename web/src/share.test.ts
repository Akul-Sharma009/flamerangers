import { describe, expect, it } from "vitest";
import { messages } from "./api/messages";
import { featuredAreas } from "./area/featured";
import { routeFromHash } from "./route";
import { addressChange, currentQuery, decodeShape, encodeShare, encodeShape, parseShare, rangeNote, type ShareState } from "./share";

const areas = featuredAreas();
const sumatra = areas.find((a) => a.isDefault)!;
const typed = {
  name: null,
  geometry: { type: "Polygon" as const, coordinates: [[[95.25, -5.5], [106, -5.5], [106, 5.75], [95.25, 5.75], [95.25, -5.5]]] },
};
const across = {
  name: null,
  geometry: {
    type: "MultiPolygon" as const,
    coordinates: [[[[170, -10], [180, -10], [180, 10], [170, 10], [170, -10]]], [[[-180, -10], [-175, -10], [-175, 10], [-180, 10], [-180, -10]]]],
  },
};

function roundTrip(s: ShareState) {
  const hash = encodeShare(s, areas);
  const back = parseShare(currentQuery(hash), areas);
  return { hash, back };
}

describe("shareable link (Story 8.1)", () => {
  it("round-trips every featured area by its id", () => {
    for (const a of areas) {
      const { hash, back } = roundTrip({ area: a.aoi, range: null, grid: "grid", measure: "count" });
      expect(hash).toBe(`#/?area=${a.id}`);
      expect(back.area).toEqual(a.aoi);
      expect(back.notes).toEqual([]);
    }
  });

  it("round-trips a typed rectangle and a box across 180 degrees exactly", () => {
    for (const area of [typed, across]) {
      const { back } = roundTrip({ area, range: null, grid: "grid", measure: "count" });
      expect(back.area).toEqual(area);
    }
  });

  it("round-trips the dates, grid or table, and counts or anomalies", () => {
    for (const grid of ["grid", "table"] as const) {
      for (const measure of ["count", "anomaly"] as const) {
        const s: ShareState = { area: sumatra.aoi, range: { start: "2015-03-10", end: "2020-12-31" }, grid, measure };
        const { back } = roundTrip(s);
        expect({ range: back.range, grid: back.grid, measure: back.measure }).toEqual({ range: s.range, grid, measure });
      }
    }
  });

  it("holds nothing but the area, the dates and the view", () => {
    const s: ShareState = { area: typed, range: { start: "2015-01-01", end: "2016-01-01" }, grid: "table", measure: "anomaly" };
    const keys = [...new URLSearchParams(currentQuery(encodeShare(s, areas))).keys()].sort();
    expect(keys).toEqual(["from", "measure", "shape", "to", "view"]);
    const plain = [...new URLSearchParams(currentQuery(encodeShare({ ...s, area: sumatra.aoi, range: null, grid: "grid", measure: "count" }, areas))).keys()];
    expect(plain).toEqual(["area"]);
  });

  it("keeps the router working with a state after the route", () => {
    expect(routeFromHash("#/?area=sumatra&view=table")).toBe("calendar");
    expect(routeFromHash("#/evidence")).toBe("evidence");
    expect(routeFromHash("#/about")).toBe("about");
  });

  it("opens the default for an old link with no state", () => {
    for (const h of ["", "#/", "#/?"]) {
      const p = parseShare(currentQuery(h), areas);
      expect(p).toMatchObject({ area: sumatra.aoi, range: null, grid: "grid", measure: "count", notes: [] });
    }
  });

  it("falls back to the default, with the contract sentence, for a bad area", () => {
    for (const q of ["area=nowhere", "shape=garbage", "shape=P1,2;3,4", "shape=P0,0;1,0;1,1;0,1", "shape=P0,0;1,0;1,1;0,1;0,5", "shape=M"]) {
      const p = parseShare(q, areas);
      expect(p.area).toEqual(sumatra.aoi);
      expect(p.notes).toEqual([messages.problems.invalid_aoi]);
    }
    const far = parseShare("shape=P0,0;999,0;999,1;0,1;0,0", areas);
    expect(far.area).toEqual(sumatra.aoi);
    expect(far.notes).toEqual([messages.client.coordinates_out_of_range]);
  });

  it("falls back to the whole record, with the contract sentence, for bad dates", () => {
    expect(parseShare("from=2020-02-30&to=2021-01-01", areas)).toMatchObject({ range: null, notes: [messages.client.date_unreadable] });
    expect(parseShare("from=2020-01-01", areas)).toMatchObject({ range: null, notes: [messages.client.date_unreadable] });
    expect(parseShare("from=2021-01-01&to=2020-01-01", areas)).toMatchObject({ range: null, notes: [messages.client.dates_out_of_order] });
  });

  it("refuses dates outside the served record once /meta is known", () => {
    const meta = { record_start: "2002-07", data_through: "2026-11-10" } as Parameters<typeof rangeNote>[1];
    expect(rangeNote({ start: "2001-01-01", end: "2010-01-01" }, meta)).toBe(messages.client.date_before_record);
    expect(rangeNote({ start: "2010-01-01", end: "2030-01-01" }, meta)).toBe(messages.client.date_after_data_through);
    expect(rangeNote({ start: "2010-01-01", end: "2020-01-01" }, meta)).toBeNull();
  });

  it("ignores an unknown view or measure and anything else in the address", () => {
    const p = parseShare("view=cube&measure=loud&token=abc&area=amazon_forest", areas);
    expect(p).toMatchObject({ grid: "grid", measure: "count", notes: [] });
    expect(p.area.name).toBe(areas.find((a) => a.id === "amazon_forest")!.name);
  });

  it("does not turn script-like text into a geometry", () => {
    expect(decodeShape("P<script>").ok).toBe(false);
    expect(decodeShape("P0,0;1,0;1,1;0,1;0,0/0,0;1,0;1,1;0,1;0,0").ok).toBe(false);
  });

  it("measures the address length of the largest featured area and of a 100-vertex area", () => {
    const longest = Math.max(...areas.map((a) => encodeShape(a.aoi.geometry).length));
    const ring = Array.from({ length: 99 }, (_, i) => [100 + Math.cos(i) * 3.123456, Math.sin(i) * 3.123456]);
    ring.push(ring[0]!);
    const drawn = encodeShare({ area: { name: null, geometry: { type: "Polygon", coordinates: [ring] } }, range: { start: "2002-07-01", end: "2026-11-10" }, grid: "table", measure: "anomaly" }, areas);
    console.log(`featured longest shape: ${longest} chars; 100-vertex drawn area, full link: ${drawn.length} chars`);
    expect(longest).toBeLessThan(2000);
  });
});

describe("an address edited in an open tab (Story 8.1)", () => {
  const shown = "#/?area=sumatra&view=table";

  it("reloads when the area, dates or view in the address change", () => {
    expect(addressChange("#/?area=amazon_forest&view=table", shown)).toBe("reload");
    expect(addressChange("#/?area=sumatra&from=2015-01-01&to=2020-12-31&view=table", shown)).toBe("reload");
    expect(addressChange("#/?area=sumatra", shown)).toBe("reload");
    expect(addressChange("#/?area=nowhere", shown)).toBe("reload"); // the link's own note explains it
  });

  it("does nothing for the address the page already wrote, or for another page", () => {
    expect(addressChange(shown, shown)).toBe("ignore");
    expect(addressChange("#/evidence", shown)).toBe("ignore");
    expect(addressChange("#/about", shown)).toBe("ignore");
  });

  it("keeps the shown state when the address has none (the masthead's Calendar link)", () => {
    expect(addressChange("#/", shown)).toBe("restore");
    expect(addressChange("", shown)).toBe("restore");
  });

  it("a reload reads the edited address as a fresh link does", () => {
    const edited = "#/?area=amazon_forest&view=table";
    expect(parseShare(currentQuery(edited)).area.name).toBe(areas.find((a) => a.id === "amazon_forest")!.aoi.name);
  });
});
