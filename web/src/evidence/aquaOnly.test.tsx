import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AquaOnlySection } from "../components/AquaOnly";
import { AQUA_COPY, CANDIDATES, CHECKS, GWIS_POINTER, OTHERS, RECORD_CLAIM, REFEREE_ROW_ORDER, TEST_CLAIM, aquaOnlyView } from "./aquaOnly";
import evidenceJson from "./evidence.json";
import { DEFAULT_SCALE, POOLED, SETS, regionOptions, scaleOptions, sourceOf, type Choice } from "./headToHead";
import type { Evidence, Figure } from "./types";

// Story 5.5 acceptance criteria. Each `it` names the criterion it checks.

const evidence = evidenceJson as unknown as Evidence;
const render = (choice: Choice) => renderToStaticMarkup(<AquaOnlySection view={aquaOnlyView(evidence, choice)} />);
const final = render({ set: "final", region: POOLED, scale: DEFAULT_SCALE });
const selection = render({ set: "selection", region: POOLED, scale: DEFAULT_SCALE });

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const table = (id: string) => {
  const t = evidence.tables.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};
const decisions = (set: string) => new Map(table(`${set}.decisions`).rows.map((r) => [r.key, r.cells.value]));
/** Every figure in evidence.json, by the source string the page puts on it. */
const known = new Map<string, Figure>();
for (const t of evidence.tables) for (const r of t.rows) for (const f of Object.values(r.cells)) if (f) known.set(sourceOf(f), f);

/** The rendered cell of one approach and column in the test table. */
const testCell = (html: string, approach: string, col: string) => {
  const row = html.match(new RegExp(`<table class="h2h-table aqua-test">[\\s\\S]*?<tr data-approach="${approach}"[^>]*>([\\s\\S]*?)</tr>`));
  if (!row) throw new Error(`no test row ${approach}`);
  const cell = row[1].match(new RegExp(`<td data-col="${col}">([\\s\\S]*?)</td>`));
  if (!cell) throw new Error(`no cell ${approach} ${col}`);
  return text(cell[1]).trim();
};

describe("Story 5.5: Aqua only and the incumbent", () => {
  it("AC1: (c) leads a full table against the Terra referee, for every set, scale and region", () => {
    for (const set of SETS) {
      const scales = scaleOptions(evidence, set, "terra");
      expect(scales.map((s) => s.label)).toEqual(["0.25°", "1°", "whole region"]);
      for (const scale of scales) {
        const regions = regionOptions(evidence, set, scale.key, "terra");
        expect(regions[0].key).toBe(POOLED);
        expect(regions.length).toBeGreaterThan(1);
        for (const region of regions) {
          const view = aquaOnlyView(evidence, { set, region: region.key, scale: scale.key });
          expect(view.choice).toEqual({ set, region: region.key, scale: scale.key });
          const source = table(`${set}.terra.${scale.key}.${region.key}`);
          expect(view.referee.title).toBe(source.title);
          expect(view.referee.rows.map((r) => r.key)).toEqual([...REFEREE_ROW_ORDER]);
          // (c) is shown on every measure the file holds for it: none of its figures is dropped.
          const c = source.rows.find((r) => r.key === "c")!;
          const shownKeys = new Set(view.referee.columns.flatMap((col) => [col.key, ...(col.sub(c.cells) ?? []).filter((p): p is Figure => typeof p === "object" && p !== null).map((p) => p.source.pointer)]));
          for (const [key, f] of Object.entries(c.cells)) {
            if (f && !["cell_months", "ranking_units", "season_unit_years"].includes(key)) {
              expect(shownKeys.has(key) || shownKeys.has(f.source.pointer), `${source.id} (c) ${key}`).toBe(true);
            }
          }
        }
      }
    }
    expect(final).toContain('<tr data-approach="c" class="incumbent">');
    // The note that (c) is not scored on count error and that Terra is the truth comes from evidence.json.
    expect(text(final)).toContain(table(`final.terra.${DEFAULT_SCALE}.${POOLED}`).note!);
  });

  it("AC1: an unknown region or scale falls back to pooled at the default scale", () => {
    const view = aquaOnlyView(evidence, { set: "selection", region: "siberia", scale: "nope" });
    expect(view.choice).toEqual({ set: "selection", region: POOLED, scale: DEFAULT_SCALE });
  });

  it("AC1: on the final set it shows that every method failed on precision, and passed the other three checks", () => {
    const html = final;
    const view = aquaOnlyView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE });
    for (const r of [...view.test.candidates, ...view.test.others]) {
      expect(testCell(html, r.key, "pass"), r.key).toBe("no");
      expect(testCell(html, r.key, "precision").startsWith("no "), r.key).toBe(true);
      for (const c of ["spearman", "peak_month", "season_length"]) expect(testCell(html, r.key, c).startsWith("yes "), `${r.key} ${c}`).toBe(true);
    }
    // The fixed claim says so word for word, in the test block, on either set.
    const claim = evidence.claims.find((c) => c.id === TEST_CLAIM)!;
    expect(claim.text.startsWith("On the final set")).toBe(true);
    for (const html2 of [final, selection]) {
      const block = html2.slice(html2.indexOf(AQUA_COPY.testHeading), html2.indexOf('<table class="h2h-table aqua-test">'));
      expect(block).toContain(`data-claim="${TEST_CLAIM}"`);
      expect(text(block)).toContain(claim.text);
    }
    // Its figures are the checks the table shows for (a), (b) and the comparator, and the same results for the candidates.
    const held = decisions("final");
    for (const f of claim.figures) expect(held.get(f.source.pointer)?.value).toBe(f.value);
    expect(claim.figures).toHaveLength((CANDIDATES.length + OTHERS.length) * CHECKS.length);
  });

  it("AC1: each set's test is shown check by check as its file holds it, with each difference against (c)", () => {
    // The selection set differs: there only (a) failed. The page shows each set as it is.
    for (const set of SETS) {
      const view = aquaOnlyView(evidence, { set, region: POOLED, scale: DEFAULT_SCALE });
      const html = render({ set, region: POOLED, scale: DEFAULT_SCALE });
      const rows = [...view.test.candidates, ...view.test.others];
      expect(rows.map((r) => r.key)).toEqual([...CANDIDATES, ...OTHERS]);
      for (const r of rows) {
        expect(testCell(html, r.key, "pass")).toBe(r.pass.display);
        for (const c of r.checks) expect(testCell(html, r.key, c.key).startsWith(`${c.result.display} `), `${set} ${r.key} ${c.key}`).toBe(true);
        expect(r.checks.map((c) => c.key)).toEqual([...CHECKS]);
        // Each difference is the Terra-referee pair against (c), with interval and mark.
        for (const c of r.checks) {
          const pair = table(`${set}.comparisons.terra`).rows.find((x) => x.key === `${r.key} vs c (Terra referee)`)!;
          expect(c.diff).toEqual(pair.cells[c.key]);
          expect(c.diff!.interval).toBeTruthy();
          expect(testCell(html, r.key, c.key)).toContain(c.diff!.interval!.display);
        }
      }
    }
    // The fixed claim that every method failed against Aqua only is printed word for word.
    const record = evidence.claims.find((c) => c.id === RECORD_CLAIM)!;
    expect(final).toContain(`data-claim="${RECORD_CLAIM}"`);
    expect(text(final)).toContain(record.text);
    expect(text(selection)).toContain(record.text);
  });

  it("AC1: on the final set the candidates' results are the pick rule's; the others are labelled not used for the pick", () => {
    const view = aquaOnlyView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE });
    const held = decisions("final");
    for (const r of view.test.candidates) {
      expect(r.forPick).toBe(true);
      expect(r.pass).toEqual(held.get(`/decisions/final/non_inferior_to_c/${r.key}/pass`));
    }
    for (const r of view.test.others) {
      expect(r.forPick).toBe(false);
      expect(r.pass).toEqual(held.get(`/decisions/not used for the pick/non_inferior_to_c/${r.key}/pass`));
    }
    expect(final).toContain('data-note="for-pick"');
    expect(text(final)).toContain(AQUA_COPY.forPickNote);
    expect(selection).not.toContain('data-note="for-pick"');
    const sel = aquaOnlyView(evidence, { set: "selection", region: POOLED, scale: DEFAULT_SCALE });
    for (const r of [...sel.test.candidates, ...sel.test.others]) expect(r.pass).toEqual(decisions("selection").get(`/decisions/non_inferior_to_c/${r.key}/pass`));
  });

  it("AC1: it explains why (c) is tested for non-inferiority", () => {
    const t = text(final);
    expect(t).toContain(AQUA_COPY.whyHeading);
    for (const p of AQUA_COPY.why) expect(t).toContain(p);
    const why = AQUA_COPY.why.join(" ");
    expect(why).toMatch(/answer key/);
    expect(why).toMatch(/Terra/);
    expect(why).toMatch(/same instrument/);
    expect(why).toMatch(/no worse than \(c\), not whether it beats it/);
    expect(why).toMatch(/non-inferiority test/);
    // Intervals carry the close-call note from the build.
    expect(t).toContain(table("final.comparisons.terra").note!);
  });

  it("AC2: GWIS reads \"can't be scored\" with the reason", () => {
    const gwis = decisions("final").get(GWIS_POINTER)!;
    expect(String(gwis.value)).toContain("can't be scored");
    const block = final.match(/<div data-incumbent="gwis">([\s\S]*?)<\/div>/)![1];
    const t = text(block);
    expect(t).toContain(gwis.display);
    expect(t).toContain("can't be scored");
    expect(t).toContain("burned area and fire events, not hotspot counts");
    expect(block).toContain(`data-source="${sourceOf(gwis)}"`);
    // The GWIS result is the final run's and shows on either set.
    expect(text(selection.match(/<div data-incumbent="gwis">([\s\S]*?)<\/div>/)![1])).toContain(gwis.display);
  });

  it("AD-8: every number shown is a figure from evidence.json, printed as its display", () => {
    for (const set of SETS) {
      for (const scale of scaleOptions(evidence, set, "terra")) {
        for (const region of regionOptions(evidence, set, scale.key, "terra")) {
          const html = render({ set, region: region.key, scale: scale.key });
          const shown = [...html.matchAll(/data-source="([^"]+)">([^<]*)</g)];
          expect(shown.length).toBeGreaterThan(0);
          for (const [, src, display] of shown) {
            const f = known.get(src.replace(/&amp;/g, "&").replace(/&#x27;/g, "'"));
            expect(f, src).toBeDefined();
            expect(text(display).trim()).toBe(f!.display.trim());
          }
        }
      }
    }
  });

  it("the words typed for this section hold no number and never say fires", () => {
    const typed = JSON.stringify(AQUA_COPY).replace(/\b(C1|4A|1A)\b/g, "");
    expect(typed).not.toMatch(/\d/);
    expect(text(final)).not.toMatch(/\bfires\b/i);
    expect(text(selection)).not.toMatch(/\bfires\b/i);
  });
});
