// Story 7.7: selecting a month shows its hotspots; excluded ones can be shown or hidden;
// the counted dots equal the month's count (up to December 2021, one hotspot counts 1).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import meta from "../../../contract/fixture/meta.json";
import cellsFixture from "../../../contract/fixture/cells.json";
import type { Cells } from "../provenance/cells";
import { cellsGeoJson } from "./HotspotMap";
import { HotspotMonthView } from "./HotspotMonthPanel";
import { createHotspotLoader, MAX_DRAWN, monthBounds, parseHotspotCsv, selectDrawn, type MapHotspot } from "./hotspots";

const HEAD = "latitude,longitude,acq_datetime_utc,satellite,instrument,confidence,frp,daynight,type,quality,feeds_record,excluded_reason,weight";
const CSV = [
  '# title: Harmonized burning activity calendar: hotspots',
  '# aoi_geometry: {"type":"Polygon","coordinates":[[[1,1],[2,1]]]}',
  HEAD,
  "0.5,101.3,2015-09-14T06:12:00Z,AQUA,MODIS,85,42.4,D,0,SP,true,none,1.0",
  "0.6,101.4,2015-09-15T06:12:00Z,AQUA,MODIS,71,10,D,0,SP,true,none,1.0",
  "-3.0,104.7,2015-09-16T06:48:00Z,AQUA,MODIS,60,6.3,D,0,SP,true,offshore,0.0",
  "-3.1,104.8,2015-09-17T06:48:00Z,AQUA,MODIS,60,6.3,D,0,SP,true,static,0.0",
  "",
].join("\n");

const row = (excluded: MapHotspot["excluded"], feeds = true): MapHotspot => ({ lat: 0, lon: 100, time: "2015-09-01T00:00:00Z", satellite: "AQUA", feeds, excluded });
const aoi = { name: "Sumatra", geometry: { type: "Polygon", coordinates: [[[100, -1], [102, -1], [102, 1], [100, 1], [100, -1]]] } } as never;

describe("parsing", () => {
  it("skips the header block and reads the rows", () => {
    const rows = parseHotspotCsv(CSV);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toMatchObject({ lat: -3, lon: 104.7, feeds: true, excluded: "offshore", satellite: "AQUA" });
  });
  it("refuses rows without the needed columns", () => {
    expect(() => parseHotspotCsv("a,b\n1,2")).toThrow();
  });
  it("asks for the month's first and last day, stopping at the data-through date", () => {
    expect(monthBounds("2016-02", "2026-11-13")).toEqual({ start: "2016-02-01", end: "2016-02-29" });
    expect(monthBounds("2026-11", "2026-11-13")).toEqual({ start: "2026-11-01", end: "2026-11-13" });
  });
});

describe("what is drawn", () => {
  it("AC2: counted dots (feeding, not excluded) equal the month's count on a complete month before 2022", () => {
    // Synthetic month: 7 counted, 2 excluded. The harmonized count is 7 (weight 1 each before 2022).
    const rows = [...Array(7).fill(0).map(() => row("none")), row("offshore"), row("static")];
    const harmonizedCount = rows.filter((r) => r.excluded === "none").length;
    const shown = selectDrawn(rows, true).points.filter((p) => p.feeds && p.excluded === "none");
    expect(shown).toHaveLength(harmonizedCount);
    expect(selectDrawn(rows, false).points).toHaveLength(harmonizedCount);
  });
  it("hides excluded rows unless asked", () => {
    const rows = [row("none"), row("offshore")];
    expect(selectDrawn(rows, false).points).toHaveLength(1);
    expect(selectDrawn(rows, true).points).toHaveLength(2);
  });
  it("draws at most MAX_DRAWN, counted rows first, and says it was capped", () => {
    const rows = [...Array(MAX_DRAWN).fill(0).map(() => row("offshore")), ...Array(MAX_DRAWN).fill(0).map(() => row("none"))];
    const d = selectDrawn(rows, true);
    expect(d.points).toHaveLength(MAX_DRAWN);
    expect(d.capped).toBe(true);
    expect(d.points.every((p) => p.excluded === "none")).toBe(true);
    expect(selectDrawn([row("none")], true).capped).toBe(false);
  });
  it("outlines only strong and marginal cells", () => {
    const c = cellsFixture as unknown as Cells;
    const tiers = cellsGeoJson(c.cells).features.map((f) => f.properties!.tier);
    expect(tiers.length).toBe(c.cells.filter((x) => x.flag_state === "strong" || x.flag_state === "marginal").length);
    expect(new Set(tiers).size).toBeLessThanOrEqual(2);
  });
});

describe("the loader", () => {
  const m = meta as never;
  it("posts the month and parses the CSV", async () => {
    const f = vi.fn().mockResolvedValue(new Response(CSV, { status: 200 }));
    const out = await createHotspotLoader("http://s", f)(m, aoi, "2015-09");
    expect(JSON.parse(f.mock.calls[0]![1].body)).toMatchObject({ start: "2015-09-01", end: "2015-09-30", all_satellites: false });
    expect(out.status === "ok" && out.rows.length).toBe(4);
  });
  it("reports 413 and failures", async () => {
    expect((await createHotspotLoader("http://s", vi.fn().mockResolvedValue(new Response("", { status: 413 })))(m, aoi, "2015-09")).status).toBe("too_large");
    expect((await createHotspotLoader("http://s", vi.fn().mockRejectedValue(new Error("x")))(m, aoi, "2015-09")).status).toBe("failed");
  });
  it("fixture mode serves the sample rows of the month", async () => {
    const out = await createHotspotLoader(null)(m, aoi, "2015-09");
    expect(out.status === "ok" && out.rows.length).toBeGreaterThan(0);
  });
});

describe("the panel view", () => {
  const Stub = ({ points, cells }: { points: MapHotspot[]; cells: unknown[] }) => <div data-points={points.length} data-cells={cells.length} />;
  const rows = parseHotspotCsv(CSV);
  const html = (o: Parameters<typeof HotspotMonthView>[0]["outcome"], showExcluded = false) =>
    renderToStaticMarkup(
      <HotspotMonthView geometry={(aoi as { geometry: never }).geometry} month="2015-09" outcome={o} cells={cellsFixture as unknown as Cells}
        showExcluded={showExcluded} onShowExcluded={() => {}} MapComponent={Stub as never} />,
    );

  it("draws the counted hotspots and the flagged cells; the toggle adds excluded ones", () => {
    const off = html({ status: "ok", rows });
    expect(off).toContain('data-points="2"');
    expect(off).toMatch(/data-cells="[1-9]/);
    expect(off).not.toContain("open circles");
    const on = html({ status: "ok", rows }, true);
    expect(on).toContain('data-points="4"');
    expect(on).toContain("open circles");
    expect(on).toContain("Excluded hotspot (not counted)");
  });
  it("tells the user when a month is too large to map, and draws no map", () => {
    const h = html({ status: "too_large" });
    expect(h).toContain("too many hotspots to show on a map");
    expect(h).not.toContain("data-points");
  });
  it("says when nothing is in the month, and when the cap is hit", () => {
    expect(html({ status: "ok", rows: [] })).toContain("No hotspots in this month");
    const many = Array(MAX_DRAWN + 1).fill(0).map(() => row("none"));
    expect(html({ status: "ok", rows: many })).toContain("The first 5,000 are shown");
  });
  it("says it is loading, and when loading failed", () => {
    expect(html(null)).toContain("Loading hotspots");
    expect(html({ status: "failed" })).toContain("could not be loaded");
  });
});
