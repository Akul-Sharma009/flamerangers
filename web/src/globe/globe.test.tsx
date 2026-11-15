// Story 8.10: the globe of unusual burning. One block per acceptance criterion.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import metaJson from "../../../contract/fixture/meta.json";
import worldJson from "../../../contract/fixture/world_cells.json";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import evidenceJson from "../evidence/evidence.json";
import type { Evidence } from "../evidence/types";
import { routeFromHash, ROUTES } from "../route";
import { parseShare } from "../share";
import { GLOBE_CLAIMS, GlobeView } from "./GlobeView";
import {
  cellGeometry, cellLink, createWorldCellsLoader, flaggedCells, markFeatures, monthWords, stepMonth, worldMapMarkup,
  type WorldCells,
} from "./world";

const meta = metaJson as unknown as components["schemas"]["Meta"];
const world = worldJson as unknown as WorldCells;
const evidence = evidenceJson as unknown as Evidence;
const claims = GLOBE_CLAIMS.map((id) => evidence.claims.find((c) => c.id === id)!);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const view = (w: WorldCells = world) => renderToStaticMarkup(
  <GlobeView meta={meta} showMap={false} initialCells={w} initialClaims={claims} loadCells={async () => w} loadEvidence={async () => evidence} />,
);

describe("8.10 AC1: opens on the current month; strong and marginal told apart without colour alone", () => {
  it("asks for the current month first", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(world), { status: 200 }));
    await createWorldCellsLoader("http://svc", fetchImpl as unknown as typeof fetch)(meta, meta.current_month);
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ record_version: meta.record_version, month: meta.current_month });
    expect(view()).toContain(`<option value="${Number(meta.current_month.slice(5, 7))}" selected="">`);
    expect(view()).toContain(`<option value="${meta.current_month.slice(0, 4)}" selected="">`);
  });
  it("marks strong with a filled dot and marginal with a ring, on the map, the key and the picture", () => {
    const marks = markFeatures(world).features;
    expect(marks.map((f) => f.properties.flag_state)).toEqual(flaggedCells(world).map((c) => c.flag_state));
    const html = view();
    expect(html).toContain('class="gk-dot"');
    expect(html).toContain('class="gk-ring"');
    const pic = worldMapMarkup(world, "", { strong: "#a", marginal: "#b", none: "#c", not_flaggable: "#d", outside_record: "#e", ink: "#000", land: "#f", rule: "#9", paper: "#8", tint: "#7", tintOpacity: 0.18 });
    expect(pic.markup).toContain('fill="none" stroke="#000"'); // a ring
  });
  it("shows uncovered land as plain land, unlike an unflagged cell, and says so", () => {
    const html = view();
    expect(html).toContain("gk-uncovered");
    expect(text(html)).toContain(messages.notes.globe_uncovered);
    expect(text(html)).toContain(messages.labels.coverage_status.not_loaded);
  });
});

describe("8.10 AC2: the month control, and the month and provenance in words", () => {
  it("steps whole months within the record", () => {
    expect(stepMonth("2015-12", 1, "2002-07", "2026-11")).toBe("2016-01");
    expect(stepMonth("2016-01", -1, "2002-07", "2026-11")).toBe("2015-12");
    expect(stepMonth("2002-07", -1, "2002-07", "2026-11")).toBe("2002-07");
    expect(stepMonth("2026-11", 1, "2002-07", "2026-11")).toBe("2026-11");
  });
  it("states the month, its source and what is loaded, from served fields", () => {
    const w = monthWords(world);
    expect(w[0]).toBe(`September 2015. ${messages.labels.source.aqua_real}`);
    expect(w[1]).toBe("Loaded: Sumatra. Not loaded yet: Australian grassland, Amazon forest, Southern African savanna, Siberian boreal forest, Punjab cropland, Kalimantan.");
    expect(w[2]).toContain(world.record_version);
    const t = text(view());
    for (const line of w) expect(t).toContain(line);
  });
});

describe("8.10 AC3: selecting a cell opens its calendar for a box around it", () => {
  it("links to the calendar with the cell's 1° box as a typed shape that can be redrawn", () => {
    const c = world.cells[0]!;
    const href = cellLink(c);
    expect(routeFromHash(href)).toBe("calendar");
    const parsed = parseShare(href.split("?")[1]!);
    expect(parsed.notes).toEqual([]);
    expect(parsed.area).toEqual({ name: null, geometry: cellGeometry(c) });
  });
});

describe("8.10 AC4: labels say cells, not hotspots, with the flag and savanna caveats and evidence classes", () => {
  it("carries the words and the fixed claims, quoted whole", () => {
    const t = text(view());
    expect(t).toContain(messages.notes.globe_cells);
    for (const c of claims) expect(t).toContain(c.text);
    expect(claims.map((c) => c.id)).toContain("caveat-southern-africa");
    for (const c of flaggedCells(world)) expect(t).toContain(messages.labels.evidence_class[c.evidence_class]);
    expect(t).not.toMatch(/\bfires?\b/i);
  });
});

describe("8.10 AC5: a table of flagged cells with links, and a picture to download", () => {
  it("lists every flagged cell, each with a link to its calendar", () => {
    const html = view();
    const rows = html.match(/<tr data-state="(strong|marginal)"/g) ?? [];
    expect(rows.length).toBe(world.cells.filter((c) => c.flag_state === "strong" || c.flag_state === "marginal").length);
    for (const c of flaggedCells(world)) expect(html).toContain(`href="${cellLink(c).replace(/&/g, "&amp;")}"`);
    expect(html).toContain("Download picture (PNG)");
    expect(html).toContain("Download picture (SVG)");
  });
  it("says so when no cell is flagged", () => {
    const quiet = { ...world, cells: world.cells.filter((c) => c.flag_state !== "strong" && c.flag_state !== "marginal") };
    expect(text(view(quiet))).toContain("No cell is flagged in this month.");
  });
});

describe("8.10 AC6: a secondary view reached from the calendar", () => {
  it("has its own route, and the calendar stays the default", () => {
    expect(routeFromHash("#/globe")).toBe("globe");
    expect(routeFromHash("")).toBe("calendar");
    expect(ROUTES[0]!.id).toBe("calendar");
  });
});
