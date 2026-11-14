// Story 3.6 AC4 to AC6: the region caveat beside the map and the calendar,
// and the evidence-class map of the area's 1° cells.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import cellsJson from "../../../contract/fixture/cells.json";
import everyStateJson from "../../../contract/fixture/examples/cells_every_state.json";
import savannaJson from "../../../contract/fixture/examples/calendar_small_savanna_area.json";
import untunedJson from "../../../contract/fixture/examples/calendar_untuned_area.json";
import metaJson from "../../../contract/fixture/meta.json";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import { defaultArea } from "../area/featured";
import evidenceJson from "../evidence/evidence.json";
import type { Claim, Evidence } from "../evidence/types";
import { CalendarView } from "../pages/CalendarPage";
import { CAVEAT_CLAIM, EVIDENCE_CLASSES, buildCaveat, caveatKind } from "./caveat";
import { layoutCellMap } from "./cellMap";
import { cellsRequest, createCellsLoader, type Cells } from "./cells";
import { CLASS_FILL, CaveatLine, EvidenceCellMap, RegionCaveat } from "./RegionCaveat";

type S = components["schemas"];
const meta = metaJson as unknown as S["Meta"];
const sumatra = calendarJson as unknown as S["Calendar"];
const untuned = untunedJson as unknown as S["Calendar"];
const savanna = savannaJson as unknown as S["Calendar"];
const evidence = evidenceJson as unknown as Evidence;
const everyState = everyStateJson as unknown as Cells;
const sumatraCells = cellsJson as unknown as Cells;
const aoi = defaultArea().aoi;

function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
}
const claim = (id: string): Claim => evidence.claims.find((c) => c.id === id)!;

const caveat = (calendar: S["Calendar"], extra: Partial<Parameters<typeof RegionCaveat>[0]> = {}) =>
  renderToStaticMarkup(<RegionCaveat calendar={calendar} meta={meta} aoi={aoi} evidence={evidence} cells={everyState} {...extra} />);

const page = (calendar: S["Calendar"]) =>
  renderToStaticMarkup(
    <CalendarView view={{ selected: aoi, range: null, result: { status: "ready", meta, calendar } }} onSelect={() => undefined} />,
  );

describe("Story 3.6 AC4: an area with a 1° cell outside the tuning regions carries the caveat beside the map and the calendar", () => {
  it("shows the caveat in the left column under the map, and again beside the calendar", () => {
    const html = page(untuned);
    const locatorEnd = html.indexOf("</section>", html.indexOf('class="locator"'));
    const aside = html.indexOf('<aside class="caveat"');
    expect(aside).toBeGreaterThan(locatorEnd);
    expect(aside).toBeLessThan(html.indexOf('class="notes"'));
    const calendar = html.slice(html.indexOf('aria-label="Calendar"'));
    expect(text(calendar)).toContain(messages.labels.region_caveat.untuned_region);
    expect(calendar.indexOf('class="caveat-line"')).toBeLessThan(calendar.indexOf('class="calfigure"'));
  });

  it("says the method was not tuned here, then quotes its own fixed claim whole: one region's results, no other claim", () => {
    const html = text(caveat(untuned));
    expect(html).toContain(messages.labels.region_caveat.untuned_region);
    expect(html).toContain(claim(CAVEAT_CLAIM.untuned_region).text);
    expect(html).toContain("C1's counts ran 16.8% low in the reported-only run");
    expect(html).toContain("right less than half the time");
    for (const other of ["reported-only-regions", "southern-africa-flags", CAVEAT_CLAIM.southern_africa]) {
      expect(html).not.toContain(claim(other).text);
    }
    expect(html).not.toContain("Punjab");
    expect([...caveat(untuned).matchAll(/data-claim="([^"]+)"/g)].map((m) => m[1])).toEqual([CAVEAT_CLAIM.untuned_region]);
  });

  it("marks each of the area's 1° cells by its served evidence_class with a pattern, never colour alone", () => {
    const html = caveat(untuned);
    for (const c of everyState.cells) {
      expect(html).toMatch(new RegExp(`<rect class="evcell ${c.evidence_class}" data-class="${c.evidence_class}"[^>]*fill="${CLASS_FILL[c.evidence_class].replace(/[()#]/g, "\\$&")}"`));
    }
    // Four classes, four different fills: one plain, three line patterns of different directions.
    expect(new Set(Object.values(CLASS_FILL)).size).toBe(4);
    expect(html).toContain('<pattern id="ev-tested_unseen"');
    expect(html).toContain('<pattern id="ev-reported_only"');
    expect(html).toContain('<pattern id="ev-not_evaluated"');
    // No fill colour carries the class: patterns use the ink stroke only.
    expect(html).not.toMatch(/fill="(#|var\(--c)/);
  });

  it("keys the map with the contract's evidence-class sentences, for the classes the area holds", () => {
    const raw = caveat(untuned);
    const key = raw.slice(raw.indexOf('<ul class="evkey">'), raw.indexOf("</ul>"));
    expect([...key.matchAll(/<li data-class="([a-z_]+)"/g)].map((m) => m[1])).toEqual(["not_evaluated"]); // served evidence_class_counts
    expect(text(key)).toContain(messages.labels.evidence_class.not_evaluated);
    const all = renderToStaticMarkup(<EvidenceCellMap cells={everyState} classes={EVIDENCE_CLASSES} />);
    for (const k of EVIDENCE_CLASSES) expect(text(all)).toContain(messages.labels.evidence_class[k]);
  });

  it("places each cell by its served corner, north up, inside the left column at 375 px", () => {
    const L = layoutCellMap(sumatraCells.cells, 300, 150)!;
    expect(L.width).toBeLessThanOrEqual(343);
    const at = (lon: number, lat: number) => L.boxes.find((b) => b.cell.sw_lon === lon && b.cell.sw_lat === lat)!;
    expect(at(103, -7).x).toBeGreaterThan(at(102, -7).x);
    expect(at(102, -6).y).toBeLessThan(at(102, -7).y);
    expect(L.boxes).toHaveLength(sumatraCells.cells.length);
  });

  it("asks /cells for the area once, with the served record version and month, and leaves the map out if that fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(everyState), { status: 200 }));
    const load = createCellsLoader("https://svc.test", fetchImpl as unknown as typeof fetch);
    await expect(load(meta, aoi)).resolves.toEqual(everyState);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://svc.test/cells");
    expect(JSON.parse(init.body as string)).toEqual(cellsRequest(meta, aoi));
    expect(cellsRequest(meta, aoi).month).toBe(meta.current_month);
    const refused = createCellsLoader("https://svc.test", (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch);
    await expect(refused(meta, aoi)).resolves.toBeNull();
    expect(caveat(untuned, { cells: null })).not.toContain("evmap");
  });
});

describe("Story 3.6 AC5: an area overlapping the southern African savanna states the two facts as results for this region", () => {
  const html = text(caveat(savanna));

  it("opens with the contract's sentence for this region, then the region's own claim", () => {
    const own = claim(CAVEAT_CLAIM.southern_africa).text;
    expect(html).toContain(messages.labels.region_caveat.southern_africa);
    expect(html).toContain(own);
    expect(html.indexOf(messages.labels.region_caveat.southern_africa)).toBeLessThan(html.indexOf(own));
    expect(own).toMatch(/^In this region C1's counts ran 16\.8% low.*right less than half the time/);
    expect(html).not.toContain(claim(CAVEAT_CLAIM.untuned_region).text);
  });

  it("states them as results, not as a possibility", () => {
    const words = [messages.labels.region_caveat.southern_africa, claim(CAVEAT_CLAIM.southern_africa).text].join(" ");
    expect(words).not.toMatch(/\b(likely|may|might|could|possibly|perhaps)\b/i);
  });

  it("shows only the contract's sentence when evidence.json lacks the region's claim: no other claim stands in", () => {
    const without = { ...evidence, claims: evidence.claims.filter((c) => c.id !== CAVEAT_CLAIM.southern_africa) };
    expect(buildCaveat(savanna.aoi, without)!.claim).toBeNull();
    const html = caveat(savanna, { evidence: without, cells: null });
    expect(html).not.toContain("caveat-claim");
    expect(text(html).trim()).toBe(messages.labels.region_caveat.southern_africa);
  });
});

describe("Story 3.6 AC6: the caveat's words and figures come from claims.yaml and evidence.json; only evidence_class decides where it appears", () => {
  it("prints every number in the caveat as a served evidence.json figure of the claim it quotes", () => {
    for (const cal of [untuned, savanna]) {
      const model = buildCaveat(cal.aoi, evidence)!;
      const shown = model.claim!.figures.map((f) => f.display);
      expect(shown).toEqual(["16.8%", "0.453"]);
      const words = text(caveat(cal, { cells: null })).replace(/\b(C1|4A|1A)\b/g, "");
      const numbers = words.match(/\d+(?:\.\d+)?%?/g) ?? [];
      expect(numbers.length).toBeGreaterThan(0);
      for (const n of numbers) expect(shown).toContain(n);
    }
  });

  it("quotes the claim from evidence.json by id, not text typed into the web", () => {
    expect(buildCaveat(untuned.aoi, evidence)!.claim).toBe(claim(CAVEAT_CLAIM.untuned_region));
    expect(buildCaveat(savanna.aoi, evidence)!.claim).toBe(claim(CAVEAT_CLAIM.southern_africa));
    // Without evidence.json there is the contract's sentence and no result at all.
    expect(buildCaveat(untuned.aoi, null)!.claim).toBeNull();
  });

  it("appears exactly when the served region_caveat says so, whatever the cell counts", () => {
    for (const rc of ["none", "untuned_region", "southern_africa"] as const) {
      const a = { ...sumatra.aoi, region_caveat: rc };
      expect(caveatKind(a)).toBe(rc === "none" ? null : rc);
    }
    // Sumatra is all tuned and carries none: no caveat, no line, no evidence or cells load.
    const loadEvidence = vi.fn(() => Promise.resolve(evidence));
    const loadCells = vi.fn(() => Promise.resolve(everyState));
    expect(renderToStaticMarkup(<RegionCaveat calendar={sumatra} meta={meta} aoi={aoi} loadEvidence={loadEvidence} loadCells={loadCells} />)).toBe("");
    expect(renderToStaticMarkup(<CaveatLine calendar={sumatra} />)).toBe("");
    expect(page(sumatra)).not.toContain("caveat");
    expect(loadEvidence).not.toHaveBeenCalled();
  });

  it("reads no land-cover or boundary data: the caveat code imports only the contract, evidence.json and its own files", () => {
    const sources = import.meta.glob(["./*.ts", "./*.tsx", "!./*.test.*"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(4);
    for (const [file, src] of Object.entries(sources)) {
      const imports = [...src.matchAll(/(?:from\s+|import\()\s*"([^"]+)"/g)].map((m) => m[1]);
      for (const i of imports) {
        expect(i, `${file} imports ${i}`).toMatch(/^(react|\.\/[a-zA-Z]+(\.css)?|\.\.\/api\/(messages|schema)|\.\.\/config|\.\.\/evidence\/(types|evidence\.json)|\.\.\/\.\.\/\.\.\/contract\/fixture\/cells\.json)$/);
      }
      expect(src).not.toMatch(/geojson|landcover|land_cover/i);
    }
  });
});
