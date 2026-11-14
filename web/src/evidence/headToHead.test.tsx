import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeadToHeadSection } from "../components/HeadToHead";
import evidenceJson from "./evidence.json";
import { DEFAULT_SCALE, H2H_COPY, POOLED, ROW_ORDER, SETS, headToHeadView, regionOptions, scaleOptions, sourceOf, type Choice } from "./headToHead";
import type { Evidence, Figure } from "./types";

// Story 5.4 acceptance criteria. Each `it` names the criterion it checks.

const evidence = evidenceJson as unknown as Evidence;
const render = (choice: Choice) => renderToStaticMarkup(<HeadToHeadSection view={headToHeadView(evidence, choice)} />);
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
const claim = (id: string) => evidence.claims.find((c) => c.id === id)!.text;
/** Every figure in evidence.json, by the source string the page puts on it. */
const known = new Map<string, Figure>();
for (const t of evidence.tables) for (const r of t.rows) for (const f of Object.values(r.cells)) if (f) known.set(sourceOf(f), f);

describe("Story 5.4: head-to-head table", () => {
  it("AC1: C1, 4A, 1A, (b), (a) and the comparator, on the final set and separately on the selection set", () => {
    for (const set of SETS) {
      const view = headToHeadView(evidence, { set, region: POOLED, scale: DEFAULT_SCALE });
      expect(view.scores.rows.map((r) => r.key)).toEqual([...ROW_ORDER]);
      expect(view.scores.title).toBe(table(`${set}.approaches.${DEFAULT_SCALE}.${POOLED}`).title);
    }
    expect(final).toContain('data-set="final"');
    expect(selection).toContain('data-set="selection"');
    expect(text(final)).toContain(H2H_COPY.setNames.final);
    expect(text(final)).toContain(H2H_COPY.setNames.selection);
  });

  it("AC1: error and bias, flag precision with flag counts, month-rank correlation, top months and years, peak month and season length", () => {
    const pooled = headToHeadView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE }).scores.columns.map((c) => c.key);
    expect(pooled).toEqual(["abs_bias_median", "precision", "recall", "spearman", "topk_overlap", "year_pair_share", "peak_month_error", "season_length_diff"]);
    const region = headToHeadView(evidence, { set: "final", region: "sumatra", scale: DEFAULT_SCALE }).scores.columns.map((c) => c.key);
    expect(region.slice(0, 2)).toEqual(["mae", "bias"]);
    // Flag precision carries its counts: C1 on the final set, pooled at the default scale.
    const c1 = table(`final.approaches.${DEFAULT_SCALE}.${POOLED}`).rows.find((r) => r.key === "C1")!.cells;
    const cell = final.match(/<tr data-approach="C1"[\s\S]*?<td data-col="precision">([\s\S]*?)<\/td>/)![1];
    expect(text(cell).trim()).toBe(`${c1.precision!.display} ${c1.flags_true!.display} ${H2H_COPY.flagsRight} ${c1.flags_raised!.display} ${H2H_COPY.flagsRaised}`);
  });

  it("AC1 / AD-8: every number shown is a figure from evidence.json, printed as its display", () => {
    for (const set of SETS) {
      for (const scale of scaleOptions(evidence, set)) {
        for (const region of regionOptions(evidence, set, scale.key)) {
          const html = render({ set, region: region.key, scale: scale.key });
          const shown = [...html.matchAll(/data-source="([^"]+)">([^<]*)</g)];
          expect(shown.length).toBeGreaterThan(0);
          for (const [, src, display] of shown) {
            const f = known.get(src.replace(/&amp;/g, "&"));
            expect(f, src).toBeDefined();
            expect(text(display).trim()).toBe(f!.display.trim());
          }
        }
      }
    }
  });

  it("AC2: per region, at 0.25°, 1° and whole region, for each set", () => {
    for (const set of SETS) {
      const scales = scaleOptions(evidence, set);
      expect(scales.map((s) => s.label)).toEqual(["0.25°", "1°", "whole region"]);
      const source = evidence.sources.find((s) => s.set === set)!;
      const blocks = table(`${set}.run`).rows.filter((r) => r.key.startsWith("/blocks/") && r.key !== "/blocks/total").map((r) => r.key.slice("/blocks/".length));
      for (const scale of scales) {
        const regions = regionOptions(evidence, set, scale.key);
        expect(regions.map((r) => r.key)).toEqual([POOLED, ...blocks]);
        for (const region of regions) {
          const view = headToHeadView(evidence, { set, region: region.key, scale: scale.key });
          expect(view.choice).toEqual({ set, region: region.key, scale: scale.key });
          expect(view.scores.title).toBe(table(`${set}.approaches.${scale.key}.${region.key}`).title);
        }
      }
      expect(source).toBeDefined();
    }
    expect(regionOptions(evidence, "final", DEFAULT_SCALE).map((r) => r.label)).toContain("Southern Africa");
  });

  it("AC2: an unknown region or scale falls back to pooled at the default scale", () => {
    const view = headToHeadView(evidence, { set: "selection", region: "siberia", scale: "nope" });
    expect(view.choice).toEqual({ set: "selection", region: POOLED, scale: DEFAULT_SCALE });
  });

  it("AC2: years are shown under the file's early and late periods, without totals (lead's choice, DECISIONS.md)", () => {
    const pooled = headToHeadView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE }).byYear;
    expect(pooled.groups.map((g) => g.period.display)).toEqual(["early", "late"]);
    expect(pooled.groups.flatMap((g) => g.rows).length).toBe(table("final.by_year").rows.length);
    for (const g of pooled.groups) for (const r of g.rows) expect(r.cells.period!.display).toBe(g.period.display);
    // One region shows only its own years.
    const sa = headToHeadView(evidence, { set: "final", region: "southern_africa", scale: DEFAULT_SCALE }).byYear;
    expect(sa.groups.flatMap((g) => g.rows).every((r) => r.key.startsWith("/southern_africa/"))).toBe(true);
    expect(sa.groups.map((g) => g.period.display)).toEqual(["early", "late"]);
    // The selection set holds one early and one late year.
    const sel = headToHeadView(evidence, { set: "selection", region: "sumatra", scale: DEFAULT_SCALE }).byYear;
    expect(sel.groups.map((g) => g.period.display)).toEqual(["early", "late"]);
    expect(text(final)).toContain(table("final.by_year").note!);
    expect(final).toContain('data-period="early"');
  });

  it("AC3: every difference has its interval and a beyond-noise mark", () => {
    const view = headToHeadView(evidence, { set: "final", region: POOLED, scale: DEFAULT_SCALE });
    const rows = [...view.pairs.c1, ...view.pairs.others];
    expect(view.pairs.c1.map((r) => r.key)).toEqual(["C1 vs 4A", "C1 vs 1A", "C1 vs cmp", "C1 vs b", "C1 vs a"]);
    expect(rows.map((r) => r.key)).not.toContain("4A vs C1"); // mirrors are dropped
    let marks = 0;
    for (const r of rows) {
      for (const f of Object.values(r.cells)) {
        if (!f) continue;
        expect(f.interval?.display).toBeTruthy();
        expect(typeof f.beyond_noise).toBe("boolean");
        marks++;
      }
    }
    const pairs = final.slice(final.indexOf('class="h2h-table pairs"'));
    const shownMarks = (pairs.match(/class="mark (beyond|within)" title=/g) ?? []).length;
    expect(shownMarks).toBe(marks);
    // C1 against (b): the count-error figure, its interval and "beyond noise", as in claims.yaml.
    const err = table("final.comparisons").rows.find((r) => r.key === "C1 vs b")!.cells.error!;
    const row = text(final.match(/<tr data-pair="C1 vs b">[\s\S]*?<\/tr>/)![0]);
    expect(row).toContain(`${err.display} ${H2H_COPY.beyondMark} ${H2H_COPY.beyond} ${err.interval!.display}`);
  });

  it("AC3: the number of blocks is stated, with the note that intervals may be somewhat narrow on close calls", () => {
    for (const html of [final, selection]) {
      expect(text(html)).toMatch(/intervals may be somewhat narrow on close calls/i);
    }
    const total = table("final.run").rows.find((r) => r.key === "/blocks/total")!;
    expect(text(final)).toContain(`${total.label} ${total.cells.value!.display}`);
    const sumatra = table("selection.run").rows.find((r) => r.key === "/blocks/sumatra")!;
    expect(text(selection)).toContain(`${sumatra.label} ${sumatra.cells.value!.display}`);
  });

  it('AC4: final-set results carry "used once", the best-of-three note, the comparator label and the rule the final pick used', () => {
    const page = text(final);
    const label = evidence.sources.find((s) => s.set === "final")!.label;
    expect(label).toContain("used once");
    expect(page).toContain(label);
    expect(page).toContain(claim("best-of-three"));
    expect(page).toContain("comparator, never picked");
    expect(page).toContain(H2H_COPY.ruleText);
    expect(page).toContain(claim("margin-vs-4a"));
    const decisions = new Map(table("final.decisions").rows.map((r) => [r.key, r.cells.value]));
    expect(page).toContain(decisions.get("/decisions/final/outcome")!.display);
    expect(page).toContain(decisions.get("/decisions/final/margin/winner")!.display);
    // C1's two tests, with what it was worse on.
    const c1 = text(final.match(/<tr><th scope="row">C1<\/th>[\s\S]*?<\/tr>/)![0]);
    expect(c1).toBe(` C1 ${decisions.get("/decisions/final/beats_a/C1/pass")!.display} ${decisions.get("/decisions/final/beats_b/C1/pass")!.display} ${H2H_COPY.worseOn} ${decisions.get("/decisions/final/beats_b/C1/worse_beyond_noise_on/0")!.display} `);
  });

  it("AC4: those final-set notes are not shown on the selection set, which carries the final run's own note on it", () => {
    expect(selection).not.toContain('data-note="rule"');
    expect(selection).not.toContain('data-note="final"');
    const note = table("final.decisions").rows.find((r) => r.key === "/decisions/final/evidence_note")!.cells.value!;
    expect(text(selection)).toContain(note.display);
    expect(text(selection)).toContain(evidence.sources.find((s) => s.set === "selection")!.label);
  });

  it("the typed words hold no number (AD-8)", () => {
    const typed = JSON.stringify(H2H_COPY).replace(/\b(C1|4A|1A)\b/g, "");
    expect(typed).not.toMatch(/\d/);
  });

  // Banned claims about the baselines are caught by evidence/wording.py, which scans web/src and the built site.
  it('says "hotspots", never "fires"', () => {
    for (const html of [final, selection]) expect(text(html)).not.toMatch(/\bfires\b/i);
    expect(text(final)).toContain("hotspot");
  });

  it("a missing table fails instead of leaving a gap", () => {
    const without = { ...evidence, tables: evidence.tables.filter((t) => t.id !== "final.comparisons") };
    expect(() => headToHeadView(without, { set: "final", region: POOLED, scale: DEFAULT_SCALE })).toThrow("final.comparisons");
  });
});
