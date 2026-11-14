import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarFixture from "../../../contract/fixture/calendar.json";
import smallSavanna from "../../../contract/fixture/examples/calendar_small_savanna_area.json";
import metaFixture from "../../../contract/fixture/meta.json";
import noLand from "../../../contract/fixture/problems/no_land.json";
import outsideCoverage from "../../../contract/fixture/problems/outside_coverage.json";
import {
  createClient, ProblemError, type Calendar, type CalendarRequest, type Meta, type Problem, type ServiceClient,
} from "../api/client";
import { messages } from "../api/messages";
import { CalendarView } from "../pages/CalendarPage";
import { AreaLocator, UNNAMED_AREA } from "./AreaLocator";
import { AreaPicker } from "./AreaPicker";
import { unwrapRing } from "./basemap";
import { defaultArea, featuredAreas, type AoiInput } from "./featured";
import { loadArea, type AreaResult } from "./load";
import { parseCorners, parseVertices } from "./typed";
import { typedProblemText } from "./words";

const meta = metaFixture as unknown as Meta;
const sumatra = calendarFixture as unknown as Calendar;
const small = smallSavanna as unknown as Calendar;

/** Rendered markup as plain text: tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** A client that records what it was asked and answers with `answer`. */
function stubClient(answer: (req: CalendarRequest) => Calendar | Problem): ServiceClient & { asked: CalendarRequest[] } {
  const asked: CalendarRequest[] = [];
  return {
    asked,
    getMeta: async () => meta,
    async postCalendar(req) {
      asked.push(req);
      const a = answer(req);
      if ("code" in a && "status" in a) throw new ProblemError(a as Problem);
      return a as Calendar;
    },
    postAnalyticsCsv: async () => "",
    postHotspotsCsv: async () => "",
  };
}

const typed = parseCorners({ west: "100", south: "-1", east: "101", north: "0" });
if (!typed.ok) throw new Error("the test box should parse");
const typedBox: AoiInput = { name: null, geometry: typed.geometry };

function page(result: AreaResult | null, selected: AoiInput = defaultArea().aoi, initialOpen = false): string {
  return renderToStaticMarkup(<CalendarView view={{ selected, range: null, result }} onSelect={() => undefined} initialOpen={initialOpen} />);
}

describe("Story 3.3 AC1: choose an area by drawing, typing or picking", () => {
  it("lists the six featured areas from contract/regions.geojson, Sumatra the default", () => {
    const areas = featuredAreas();
    expect(areas.map((a) => a.name)).toEqual([
      "Sumatra", "Australian grassland", "Amazon forest", "Southern African savanna", "Siberian boreal forest", "Punjab cropland",
    ]);
    expect(defaultArea().name).toBe("Sumatra");
  });

  it("selects Sumatra on first load: the first request is Sumatra's polygon over the whole record", async () => {
    const service = stubClient(() => sumatra);
    const result = await loadArea(service, defaultArea().aoi);
    expect(result.status).toBe("ready");
    const req = service.asked[0]!;
    expect(req.aoi.name).toBe("Sumatra");
    expect(req.aoi.geometry).toEqual(defaultArea().aoi.geometry);
    expect(req.start).toBe(meta.record_start + "-01");
    expect(req.end).toBe(meta.data_through);
  });

  it("works in fixture mode: any area returns the Sumatra fixture", async () => {
    const result = await loadArea(createClient(null), typedBox);
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.calendar.aoi.name).toBe("Sumatra");
  });

  it("sends a picked featured area's own geometry and name", async () => {
    const service = stubClient(() => sumatra);
    const punjab = featuredAreas().find((a) => a.id === "punjab")!;
    await loadArea(service, punjab.aoi, meta);
    expect(service.asked[0]!.aoi).toEqual(punjab.aoi);
  });

  it("sends a typed box as a closed polygon, longitude first, with no name", async () => {
    const service = stubClient(() => sumatra);
    await loadArea(service, typedBox, meta);
    expect(service.asked[0]!.aoi).toEqual({
      name: null,
      geometry: { type: "Polygon", coordinates: [[[100, -1], [101, -1], [101, 0], [100, 0], [100, -1]]] },
    });
  });

  it("sends a typed box across 180° as a MultiPolygon", async () => {
    const service = stubClient(() => sumatra);
    const r = parseCorners({ west: "175", south: "60", east: "-170", north: "70" });
    if (!r.ok) throw new Error("should parse");
    await loadArea(service, { name: null, geometry: r.geometry }, meta);
    expect(service.asked[0]!.aoi.geometry.type).toBe("MultiPolygon");
  });

  it("accepts typed polygon vertices, comma or space separated", () => {
    const r = parseVertices("100, 0\n101 0\n101,1\n\n100.5, 1.5\n100,0\n");
    expect(r).toEqual({
      ok: true,
      geometry: { type: "Polygon", coordinates: [[[100, 0], [101, 0], [101, 1], [100.5, 1.5], [100, 0]]] },
    });
  });

  it("shows the area's served name and served km², formatted only", () => {
    const served = { ...sumatra, aoi: { ...sumatra.aoi, name: "Sumatra", area_km2: 12345.6 } };
    const html = renderToStaticMarkup(
      <AreaLocator selected={defaultArea().aoi} calendar={served} problemText={null} loading={false} onSelect={() => undefined} />,
    );
    expect(text(html)).toContain("Sumatra");
    expect(text(html)).toContain("12,345.6 km²");
    expect(html).toContain('data-field="aoi.area_km2"');
  });

  it("shows no km² until the area's calendar has been served", () => {
    const html = renderToStaticMarkup(
      <AreaLocator selected={typedBox} calendar={null} problemText={null} loading onSelect={() => undefined} />,
    );
    expect(text(html)).toContain(UNNAMED_AREA);
    expect(html).not.toContain("km²");
  });

  it("has a small locator map and a collapsed change control; the picker opens to the three ways", () => {
    const closed = page({ status: "ready", meta, calendar: sumatra });
    expect(closed).toContain("areamap-locator");
    expect(closed).not.toContain("areamap-draw");
    expect(closed).toMatch(/aria-expanded="false"[^>]*>Change area or dates</);
    const open = page({ status: "ready", meta, calendar: sumatra }, defaultArea().aoi, true);
    expect(text(open)).toContain("Featured areas");
    expect(text(open)).toContain("Draw");
    expect(text(open)).toContain("Type coordinates");
    expect(open).toMatch(/aria-current="true"[^>]*>Sumatra</);
  });

  it("the draw tab offers rectangle and polygon on a full map", () => {
    const html = renderToStaticMarkup(
      <AreaPicker currentName="Sumatra" initialTab="draw" onSelect={() => undefined} onClose={() => undefined} />,
    );
    expect(text(html)).toContain("Rectangle");
    expect(text(html)).toContain("Polygon");
    expect(html).toContain("areamap-draw");
    // Nothing drawn yet, so nothing to show.
    expect(html).toMatch(/<button type="button" class="primary" disabled="">Show this area/);
  });
});

describe("Story 3.3 AC2: typed coordinates that are out of range, out of order or not closed", () => {
  it("names the out-of-range corner", () => {
    expect(parseCorners({ west: "-181", south: "0", east: "10", north: "91" })).toEqual({
      ok: false, problem: "out_of_range", fields: ["west", "north"],
    });
  });

  it("names corners out of order: south not less than north (latitude only)", () => {
    expect(parseCorners({ west: "0", south: "5", east: "1", north: "5" })).toEqual({
      ok: false, problem: "out_of_order", fields: ["south", "north"],
    });
    expect(parseCorners({ west: "10", south: "6", east: "0", north: "5" })).toEqual({
      ok: false, problem: "out_of_order", fields: ["south", "north"],
    });
  });

  it("reads west greater than east as a box across 180°, split there into a MultiPolygon", () => {
    expect(parseCorners({ west: "170", south: "-20", east: "-170", north: "-10" })).toEqual({
      ok: true,
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[170, -20], [180, -20], [180, -10], [170, -10], [170, -20]]],
          [[[-180, -20], [-170, -20], [-170, -10], [-180, -10], [-180, -20]]],
        ],
      },
    });
  });

  it("leaves the span to the service: a box across 180° wider than half the world is still sent", () => {
    const r = parseCorners({ west: "10", south: "0", east: "0", north: "1" });
    expect(r.ok && r.geometry.type).toBe("MultiPolygon");
  });

  it("drops a part with no width when a crossing box starts or ends on 180°", () => {
    expect(parseCorners({ west: "180", south: "0", east: "-170", north: "1" })).toEqual({
      ok: true, geometry: { type: "Polygon", coordinates: [[[-180, 0], [-170, 0], [-170, 1], [-180, 1], [-180, 0]]] },
    });
    expect(parseCorners({ west: "170", south: "0", east: "-180", north: "1" })).toEqual({
      ok: true, geometry: { type: "Polygon", coordinates: [[[170, 0], [180, 0], [180, 1], [170, 1], [170, 0]]] },
    });
  });

  it("refuses a box with no width", () => {
    expect(parseCorners({ west: "5", south: "0", east: "5", north: "1" })).toEqual({
      ok: false, problem: "no_width", fields: ["west", "east"],
    });
    expect(parseCorners({ west: "180", south: "0", east: "-180", north: "1" })).toEqual({
      ok: false, problem: "no_width", fields: ["west", "east"],
    });
  });

  it("names an unreadable or empty corner, never reading it as zero", () => {
    expect(parseCorners({ west: "", south: "abc", east: "1", north: "2" })).toEqual({
      ok: false, problem: "unreadable", fields: ["west", "south"],
    });
  });

  it("names a polygon that is not closed, by its first and last lines", () => {
    expect(parseVertices("100 0\n101 0\n101 1")).toEqual({ ok: false, problem: "not_closed", lines: [1, 3] });
  });

  it("names out-of-range and unreadable vertex lines", () => {
    expect(parseVertices("100 0\n200 0\n101 95\n100 0")).toEqual({ ok: false, problem: "out_of_range", lines: [2, 3] });
    expect(parseVertices("100 0\n101\n101 1 3\n100 0")).toEqual({ ok: false, problem: "unreadable", lines: [2, 3] });
    expect(parseVertices("100 0\n101 0\n100 0")).toEqual({ ok: false, problem: "too_few", lines: [1, 2, 3] });
  });

  it("shows the contract's sentence and marks the corners at fault", () => {
    const html = renderToStaticMarkup(
      <AreaPicker
        currentName="Sumatra"
        initialTab="type"
        initialRefusal={{ corners: { west: "0", south: "2", east: "1", north: "1" } }}
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-problem="out_of_order"');
    expect(text(html)).toContain(messages.client.latitude_out_of_order);
    const input = (name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))![0];
    expect(input("south")).toContain('aria-invalid="true"');
    expect(input("north")).toContain('aria-invalid="true"');
    expect(input("west")).not.toContain("aria-invalid");
    expect(input("east")).not.toContain("aria-invalid");
  });

  it("shows the contract's sentence and the lines at fault for vertices", () => {
    const html = renderToStaticMarkup(
      <AreaPicker
        currentName="Sumatra"
        initialTab="type"
        initialForm="vertices"
        initialRefusal={{ vertices: "100 0\n101 0\n101 1" }}
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('data-problem="not_closed"');
    expect(text(html)).toContain(messages.client.polygon_not_closed);
    expect(text(html)).toContain("Lines 1, 3");
  });
});

describe("Story 3.3 AC3: no land, or outside coverage, never a calendar of zeros", () => {
  for (const [code, fixture] of [["no_land", noLand], ["outside_coverage", outsideCoverage]] as const) {
    it(`${code}: shows the messages.yaml sentence and draws no calendar`, async () => {
      const service = stubClient(() => fixture as unknown as Problem);
      const result = await loadArea(service, typedBox, meta);
      expect(result).toEqual({ status: "problem", meta, code });
      const html = page(result, typedBox);
      expect(text(html)).toContain(messages.problems[code]);
      expect(html).toContain('role="alert"');
      expect(html).not.toContain('aria-label="Calendar"');
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("km²");
    });
  }

  it("the two sentences are the ones the story asks for", () => {
    expect(messages.problems.no_land).toMatch(/no land in this area/i);
    expect(messages.problems.outside_coverage).toMatch(/not loaded yet/i);
  });

  it("asks again with the new version when the record was superseded", async () => {
    let first = true;
    const newer = { ...meta, record_version: "20261115-00000000" };
    const asked: string[] = [];
    const service: ServiceClient = {
      postAnalyticsCsv: async () => "",
      postHotspotsCsv: async () => "",
      getMeta: async () => newer,
      async postCalendar(req) {
        asked.push(req.record_version);
        if (first) {
          first = false;
          throw new ProblemError({ type: "about:blank", title: "", status: 410, code: "version_superseded" });
        }
        return sumatra;
      },
    };
    const result = await loadArea(service, typedBox, meta);
    expect(result.status).toBe("ready");
    expect(asked).toEqual([meta.record_version, newer.record_version]);
  });
});

describe("Story 3.3 AC4: small-area cautions come from served fields", () => {
  it("shows both cautions when the service serves both", () => {
    const html = page({ status: "ready", meta, calendar: small }, typedBox);
    expect(text(html)).toContain(messages.cautions.scale_below_1deg);
    expect(text(html)).toContain(messages.cautions.scale_below_025deg);
  });

  it("shows only the served caution", () => {
    const one = { ...small, cautions: [{ code: "scale_below_1deg" as const }] };
    const html = page({ status: "ready", meta, calendar: one }, typedBox);
    expect(text(html)).toContain(messages.cautions.scale_below_1deg);
    expect(text(html)).not.toContain(messages.cautions.scale_below_025deg);
  });

  it("shows no caution when none is served, whatever was drawn", () => {
    const html = page({ status: "ready", meta, calendar: sumatra }, typedBox);
    expect(html).not.toContain("data-caution");
  });
});

describe("Story 3.3: the basemap", () => {
  it("unwraps a land ring that crosses 180 degrees instead of jumping across the map", () => {
    expect(unwrapRing([[179, -16], [-179, -16], [-179, -17], [179, -17], [179, -16]])).toEqual([
      [179, -16], [181, -16], [181, -17], [179, -17], [179, -16],
    ]);
    expect(unwrapRing([[-179, 65], [179, 65], [179, 66]])).toEqual([[-179, 65], [-181, 65], [-181, 66]]);
    const plain = [[100, 0], [101, 0], [101, 1], [100, 0]];
    expect(unwrapRing(plain)).toEqual(plain);
  });
});

describe("Story 3.3: house rules", () => {
  it("the area code types no sentence of its own and never says fires", () => {
    const dir = new URL("./", import.meta.url);
    for (const f of ["AreaLocator.tsx", "AreaPicker.tsx", "MapView.tsx", "basemap.ts", "typed.ts", "words.ts", "load.ts", "featured.ts"]) {
      const src = readFileSync(new URL(f, dir), "utf8");
      expect(src, f).not.toMatch(/\bfires?\b/i);
    }
  });

  it("the browser computes no size: km² appears only beside the served area_km2", () => {
    const src = readFileSync(new URL("./AreaLocator.tsx", import.meta.url), "utf8");
    expect(src.match(/km²/g)).toHaveLength(1);
    expect(src).toMatch(/formatCount\(calendar\.aoi\.area_km2\)\} km²/);
  });
});

describe("Story 3.3 typed refusals use the 0.3.0 sentences", () => {
  it("picks the specific sentence by case and invalid_aoi for the rest", () => {
    expect(typedProblemText("out_of_range")).toBe(messages.client.coordinates_out_of_range);
    expect(typedProblemText("out_of_order")).toBe(messages.client.latitude_out_of_order);
    expect(typedProblemText("not_closed")).toBe(messages.client.polygon_not_closed);
    for (const p of ["unreadable", "no_width", "too_few"] as const) {
      expect(typedProblemText(p)).toBe(messages.problems.invalid_aoi);
    }
  });
});
