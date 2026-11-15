// Story 3.10: at 375 px no page scrolls sideways; a wide table scrolls inside its own box.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import metaJson from "../../contract/fixture/meta.json";
import worldJson from "../../contract/fixture/world_cells.json";
import type { components } from "./api/schema";
import { HeadToHeadSection } from "./components/HeadToHead";
import evidenceJson from "./evidence/evidence.json";
import { DEFAULT_SCALE, POOLED, headToHeadView } from "./evidence/headToHead";
import type { Evidence } from "./evidence/types";
import { GlobeView } from "./globe/GlobeView";
import type { WorldCells } from "./globe/world";

const css = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const evidence = evidenceJson as unknown as Evidence;

describe("3.10 phone width", () => {
  it("test_3_10_head_to_head_tables_scroll_in_their_own_region", () => {
    const html = renderToStaticMarkup(<HeadToHeadSection view={headToHeadView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE })} />);
    expect(html).toMatch(/<div class="h2h-scroll" role="region" aria-label="[^"]+" tabindex="0"><table class="h2h-table scores"/);
    expect(css("./components/HeadToHead.css")).toMatch(/\.h2h-scroll \{[^}]*overflow-x: auto[^}]*max-width: 100%/);
  });
  it("test_3_10_evidence_page_column_may_shrink_below_its_tables", () => {
    expect(css("./styles.css")).toMatch(/main\.evidence \{ grid-template-columns: minmax\(0, 1fr\)/);
    expect(css("./components/HeadToHead.css")).toMatch(/\.h2h-blocks dd \{[^}]*overflow-wrap: anywhere/);
  });
  it("test_3_10_globe_table_scrolls_in_its_own_region", () => {
    const html = renderToStaticMarkup(
      <GlobeView meta={metaJson as unknown as components["schemas"]["Meta"]} showMap={false} initialCells={worldJson as unknown as WorldCells} loadCells={async () => worldJson as unknown as WorldCells} loadEvidence={async () => evidence} />,
    );
    expect(html).toMatch(/<div class="table-scroll" role="region" aria-label="Flagged cells, [^"]+" tabindex="0"><table class="globe-table"/);
    expect(css("./styles.css")).toMatch(/\.table-scroll \{ max-width: 100%; overflow-x: auto; \}/);
  });
});
