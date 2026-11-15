import { readFileSync } from "node:fs";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "../api/messages";
import { encodeShare } from "../share";
import { AreaPicker } from "./AreaPicker";
import { featuredAreas, type AoiInput } from "./featured";
import { FeaturedGallery, outlinePath } from "./FeaturedGallery";

const regions = JSON.parse(readFileSync(new URL("../../../contract/regions.geojson", import.meta.url), "utf8")) as {
  features: { properties: { region_id: string; name: string; evidence_class: string }; geometry: unknown }[];
};
const areas = featuredAreas();
const gallery = () => renderToStaticMarkup(<FeaturedGallery areas={areas} currentName={null} onSelect={() => undefined} />);
const plain = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

/** Every element with props.onClick in a rendered-once tree (no DOM library here). */
function buttons(node: ReactNode, out: ReactElement<{ onClick?: () => void; children?: ReactNode }>[] = []) {
  if (Array.isArray(node)) node.forEach((n) => buttons(n, out));
  else if (isValidElement<{ onClick?: () => void; children?: ReactNode }>(node)) {
    if (node.props.onClick) out.push(node);
    buttons(node.props.children, out);
  }
  return out;
}

describe("Story 8.8 featured gallery", () => {
  it("offers the six regions, in the contract's order, one card each", () => {
    const names = ["Sumatra", "Australian grassland", "Amazon forest", "Southern African savanna", "Siberian boreal forest", "Punjab cropland"];
    expect(areas.map((a) => a.name)).toEqual(names);
    const html = gallery();
    expect((html.match(/class="card"/g) ?? []).length).toBe(6);
    for (const n of names) expect(plain(html)).toContain(n);
  });

  it("labels each card with the contract's sentence for its evidence class", () => {
    const html = gallery();
    for (const f of regions.features) {
      const card = html.split('<li class="card"').find((c) => c.includes(`data-region="${f.properties.region_id}"`))!;
      const label = messages.labels.evidence_class[f.properties.evidence_class as keyof typeof messages.labels.evidence_class];
      expect(label).toBeTruthy();
      expect(plain(card)).toContain(label);
    }
  });

  it("opens each card with exactly the file's boundary, unchanged", () => {
    const picked: AoiInput[] = [];
    const tree = FeaturedGallery({ areas, currentName: null, onSelect: (a) => picked.push(a) });
    const btns = buttons(tree);
    expect(btns).toHaveLength(6);
    btns.forEach((b) => b.props.onClick!());
    for (const f of regions.features) {
      const got = picked.find((p) => p.name === f.properties.name)!;
      expect(got.geometry).toEqual(f.geometry);
    }
  });

  it("leaves the region caveats off the cards (they show once the area is opened)", () => {
    const html = gallery();
    expect(html).toContain('data-region="southern_africa"');
    expect(html).not.toContain(messages.labels.region_caveat.southern_africa);
    expect(html).not.toContain(messages.labels.region_caveat.untuned_region);
  });

  it("is the Featured tab of the picker", () => {
    const html = renderToStaticMarkup(<AreaPicker currentName="Sumatra" onSelect={() => undefined} onClose={() => undefined} />);
    expect(html).toContain('data-region="punjab"');
    expect(html).toContain('aria-current="true"');
  });

  it("puts the area in the share link after opening, keeping the dates", () => {
    const savanna = areas.find((a) => a.id === "southern_africa")!;
    const hash = encodeShare({ area: savanna.aoi, range: { start: "2015-01-01", end: "2020-12-31" }, grid: "grid", measure: "count" });
    expect(hash).toBe("#/?area=southern_africa&from=2015-01-01&to=2020-12-31");
  });

  it("draws an outline inside its box", () => {
    for (const a of areas) {
      const nums = outlinePath(a.aoi.geometry, 64, 48).match(/-?\d+\.\d/g)!.map(Number);
      expect(nums.length).toBeGreaterThan(6);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(64);
    }
  });
});
