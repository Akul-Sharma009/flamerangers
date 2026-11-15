import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "../api/messages";
import { ScoresLimitsSections } from "../components/ScoresLimits";
import evidenceJson from "./evidence.json";
import { DEFAULT_SCALE, POOLED, regionOptions, scaleOptions, sourceOf } from "./headToHead";
import { LIMITS, LIMITS_COPY, REPORTED_ONLY, RO_CLAIMS, RO_ROWS, TIERS_CLAIM, limitsView } from "./limits";
import type { Evidence, Figure } from "./types";

// Story 5.6 acceptance criteria. Each `it` names the criterion it checks.

const evidence = evidenceJson as unknown as Evidence;
const render = (choice: { region: string; scale: string }, ev: Evidence = evidence) =>
  renderToStaticMarkup(<ScoresLimitsSections view={limitsView(ev, choice)} />);
const html = render({ region: POOLED, scale: DEFAULT_SCALE });

function text(h: string): string {
  return h
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/ ([.,:;])/g, "$1");
}
const limitsSection = html.match(/<section class="h2h limits"[\s\S]*?<\/section>/)![0];
const reportedSection = html.match(/<section class="h2h reported"[\s\S]*?<\/section>/)![0];
const limitText = (id: string) => {
  const li = limitsSection.match(new RegExp(`<li data-limit="${id}">([\\s\\S]*?)</li>`));
  if (!li) throw new Error(`no limit ${id}`);
  return text(li[1]);
};
const table = (id: string) => {
  const t = evidence.tables.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};
const cell = (id: string, row: string, key: string) => table(id).rows.find((r) => r.key === row)!.cells[key]!;
const known = new Map<string, Figure>();
for (const t of evidence.tables) for (const r of t.rows) for (const f of Object.values(r.cells)) if (f) known.set(sourceOf(f), f);
const claim = (id: string) => evidence.claims.find((c) => c.id === id)!;

/**
 * Test plan section 12, "What a good score can't show": its eight limits, in its order,
 * each with the words the section must carry for it. Kept apart from the section's own
 * copy so a limit dropped or blunted there fails here.
 */
const SECTION_12 = [
  { limit: "it shows agreement with Aqua, not truth", must: [/agreement with Aqua/, /not the truth/, /no independent reference/] },
  { limit: "it can't reward drift handling; the drift years are reported only", must: [/can't reward handling Aqua's drift/, /scored years stop at/, /reported-only run/, /never changes the pick/, /1B and 2A/, /partial credit/] },
  { limit: "it says nothing about NOAA-20 or NOAA-21, or about the years before Aqua", must: [/NOAA-20/, /NOAA-21/, /years before Aqua/] },
  { limit: "the selection set is small; blocks not independent; one year comparison per region; many approaches, no correction", must: [/selection set is small/, /blocks/, /not fully independent/, /pair of years in each region/, /may be chance/, /no correction for multiple comparisons/] },
  { limit: "the final set's tuning regions have only late years; early years from the locked regions alone", must: [/tuning regions have only late years/, /early years come only from southern Africa and Siberia/] },
  { limit: "the last scored year may include some drift", must: [/last scored year may include some drift/, /crossing time/] },
  { limit: "the precision margin may be finer than the data can resolve", must: [/precision margin may be finer than the data can resolve/] },
  { limit: "no cropland region is scored", must: [/No cropland region is scored/, /agricultural burning/, /Punjab/] },
];

describe("Story 5.6: what the scores can't show", () => {
  it("AC1: all eight limits of test plan section 12 are present in its text, in its order", () => {
    const ids = [...limitsSection.matchAll(/<li data-limit="([^"]+)">/g)].map((m) => m[1]);
    expect(ids).toEqual(LIMITS.map((l) => l.id));
    expect(ids).toHaveLength(SECTION_12.length);
    SECTION_12.forEach((item, i) => {
      const t = limitText(ids[i]);
      for (const re of item.must) expect(t, `limit ${i + 1} (${item.limit}): ${re}`).toMatch(re);
    });
    expect(limitsSection).toContain('<ol class="limit-list">');
  });

  it("AC1: the numbers in the limits are figures read from the scoring files", () => {
    const final = table("final.years");
    const lastScored = cell("final.years", "/years/sumatra", "1");
    expect(limitText("drift")).toContain(`scored years stop at ${lastScored.display}.`);
    expect(limitText("drift-in-last-year")).toMatch(new RegExp(`^.*${lastScored.display} is the last scored year`));
    // The selection set's regions, years and blocks come from its own tables.
    const sel = limitText("small-selection");
    expect(sel).toContain("Sumatra, Australian grassland and Amazon forest");
    expect(sel).toContain(`${cell("selection.years", "/years", "0").display} and ${cell("selection.years", "/years", "1").display}`);
    expect(sel).toContain(`rests on ${cell("selection.run", "/blocks/total", "value").display} blocks`);
    expect(sel).toContain(`rests on ${cell("selection.approaches.region.sumatra", "C1", "year_pairs").display} pair of years`);
    // The final set's years are listed for every region, as figures.
    const listed = limitsSection.match(/<dl class="limit-years" data-years="final-late-years">([\s\S]*?)<\/dl>/)![1];
    for (const r of final.rows) {
      for (const f of Object.values(r.cells)) if (f) expect(listed).toContain(`data-source="${sourceOf(f)}">${f.display}<`);
      expect(listed).toContain(`<dt>${r.label}</dt>`);
    }
    // Limit 3 prints the fixed claim on NOAA-20.
    expect(limitText("other-satellites")).toContain(claim("noaa20-untested").text);
  });

  it("AC2: the anomaly tiers were checked on selection years only and not in southern Africa or Siberia", () => {
    const block = text(limitsSection.match(/<div class="limit-block" data-note="tiers">([\s\S]*?)<\/div>/)![1]);
    expect(block).toContain(claim(TIERS_CLAIM).text);
    expect(block).toMatch(/checked on selection years only, not in southern Africa or Siberia/);
    expect(TIERS_CLAIM).toBe("tiers-not-checked-everywhere");
    expect(claim(TIERS_CLAIM).used_for_pick).toBe(false);
    expect(limitsSection).toContain(`data-claim="${TIERS_CLAIM}"`);
  });

  it("AC3: the reported-only run is labelled not used for the pick and named by its run", () => {
    expect(reportedSection).toContain('data-for-pick="false"');
    expect(text(reportedSection).toLowerCase()).toContain("not used for the pick");
    const runId = cell(`${REPORTED_ONLY}.about`, "/meta/run_id", "value");
    expect(runId.display).toBe("9d5e7bf1d0d6");
    expect(reportedSection).toContain(`>${runId.display}<`);
    const source = evidence.sources.find((s) => s.set === REPORTED_ONLY)!;
    expect(text(reportedSection)).toContain(source.file);
    for (const id of RO_CLAIMS) {
      expect(claim(id).used_for_pick).toBe(false);
      expect(reportedSection).toContain(`<p class="claim" data-claim="${id}" data-for-pick="false">`);
      expect(text(reportedSection)).toContain(claim(id).text);
    }
  });

  it("AC3: 4A alone passed the (b) test on this set while C1 did not", () => {
    expect(text(reportedSection)).toContain("4A alone passed the (b) test");
    const bCell = (a: string) => {
      const row = reportedSection.match(new RegExp(`<table class="h2h-table tests ro-tests">[\\s\\S]*?<tr data-approach="${a}">([\\s\\S]*?)</tr>`))!;
      return text(row[1].match(/<td data-col="b">([\s\S]*?)<\/td>/)![1]).trim();
    };
    expect(bCell("4A")).toBe("yes");
    expect(bCell("C1")).toMatch(/^no worse beyond noise on precision$/);
    expect(bCell("1A")).toMatch(/^no /);
    // (b) itself has no test against (b): a dash, not a "no".
    expect(bCell("b")).toBe("— no value");
    const yes = RO_ROWS.filter((a) => bCell(a) === "yes");
    expect(yes).toEqual(["4A"]);
  });

  it("AC3: the southern Africa and Punjab results are shown, where C1 was not the best", () => {
    expect(text(reportedSection)).toContain(claim("reported-only-regions").text);
    const regions = regionOptions(evidence, REPORTED_ONLY, DEFAULT_SCALE).map((r) => r.key);
    expect(regions).toEqual(expect.arrayContaining([POOLED, "southern_africa", "punjab"]));
    for (const region of ["southern_africa", "punjab"]) {
      const h = render({ region, scale: DEFAULT_SCALE });
      const section = h.match(/<section class="h2h reported"[\s\S]*?<\/section>/)![0];
      expect(section).toContain(`data-region="${region}"`);
      const t = table(`${REPORTED_ONLY}.approaches.${DEFAULT_SCALE}.${region}`);
      expect(section).toContain(`<h3>${t.title}</h3>`);
      for (const a of ["C1", "4A", "1A"]) {
        const mae = t.rows.find((r) => r.key === a)!.cells.mae!;
        expect(section).toContain(`data-source="${sourceOf(mae)}">${mae.display}<`);
      }
    }
  });

  it("AC3: an unknown region or scale falls back to pooled at the default scale", () => {
    const view = limitsView(evidence, { region: "nowhere", scale: "nope" });
    expect(view.reported.choice).toEqual({ set: REPORTED_ONLY, region: POOLED, scale: DEFAULT_SCALE });
  });

  // Story 2.10's file is in evidence.json since 15 Nov; these two tests build the evidence without it.
  const withoutNoaa20: Evidence = {
    ...evidence,
    sources: evidence.sources.filter((s) => s.set !== "noaa20_check"),
    tables: evidence.tables.filter((t) => t.set !== "noaa20_check"),
  };

  it("AC4: until Story 2.10's file exists, the NOAA-20 comparison alone says not yet run", () => {
    const h = render({ region: POOLED, scale: DEFAULT_SCALE }, withoutNoaa20);
    const block = h.match(/<div class="limit-block" data-note="noaa20" data-ran="false">([\s\S]*?)<\/div>/)![1];
    expect(text(block)).toContain(messages.notes.noaa20_check_not_run);
    // Said once, for that comparison only.
    const notRun = text(h).split(messages.notes.noaa20_check_not_run).length - 1;
    expect(notRun).toBe(1);
    expect(text(h)).not.toContain(messages.notes.noaa20_check);
  });

  it("AC4: the real Story 2.10 file is shown, labelled reported only and not a validation against Aqua", () => {
    const source = evidence.sources.find((s) => s.set === "noaa20_check")!;
    expect(source.label.toLowerCase()).toContain("reported only, not a validation against aqua");
    const block = limitsSection.match(/<div class="limit-block" data-note="noaa20" data-ran="true">([\s\S]*?)<\/div>\s*<\/section>/)![1];
    expect(text(block)).toContain(messages.notes.noaa20_check);
    expect(text(limitsSection)).not.toContain(messages.notes.noaa20_check_not_run);
  });

  it("AC4: once the file exists it is shown labelled reported only, not a validation against Aqua", () => {
    const file = "noaa20_check_20261115T000000Z.json";
    const f = (pointer: string, value: number, display: string): Figure => ({ value, display, source: { file, pointer } });
    const withNoaa20: Evidence = {
      ...withoutNoaa20,
      sources: [...withoutNoaa20.sources, { file, sha256: "0".repeat(64), set: "noaa20_check", label: "reported only, not a validation against Aqua", run_id: null }],
      tables: [
        ...withoutNoaa20.tables,
        { id: "noaa20_check.figures", title: "NOAA-20 against Suomi NPP", set: "noaa20_check", note: null, columns: [{ key: "value", label: "value" }], rows: [{ key: "/pooled/bias", label: "pooled / bias", cells: { value: f("/pooled/bias", -0.02, "-0.020") } }] },
      ],
    };
    const h = render({ region: POOLED, scale: DEFAULT_SCALE }, withNoaa20);
    const block = h.match(/<div class="limit-block" data-note="noaa20" data-ran="true">([\s\S]*?)<\/div>\s*<\/section>/)![1];
    expect(text(block)).toContain(messages.notes.noaa20_check);
    expect(messages.notes.noaa20_check.toLowerCase()).toContain("reported only");
    expect(messages.notes.noaa20_check).toContain("not a validation against Aqua");
    expect(text(block)).toContain("reported only, not a validation against Aqua");
    expect(block).toContain(`data-source="${file}#/pooled/bias">-0.020<`);
    expect(text(h)).not.toContain(messages.notes.noaa20_check_not_run);
  });

  it("AD-8: every number shown is a figure from evidence.json, printed as its display", () => {
    for (const scale of scaleOptions(evidence, REPORTED_ONLY)) {
      for (const region of regionOptions(evidence, REPORTED_ONLY, scale.key)) {
        const h = render({ region: region.key, scale: scale.key });
        const shown = [...h.matchAll(/data-source="([^"]+)">([^<]*)</g)];
        expect(shown.length).toBeGreaterThan(0);
        for (const [, src, display] of shown) {
          const fig = known.get(src.replace(/&amp;/g, "&").replace(/&#x27;/g, "'"));
          expect(fig, src).toBeDefined();
          expect(text(display).trim()).toBe(fig!.display.trim());
        }
      }
    }
  });

  it("the words typed for this section hold no number and never say fires", () => {
    const typed = JSON.stringify([LIMITS.map((l) => [l.title, l.body.filter((p) => typeof p === "string")]), LIMITS_COPY]).replace(/\b(C1|4A|1A|1B|2A|2B|NOAA-20|NOAA-21)\b/g, "");
    expect(typed).not.toMatch(/\d/);
    expect(text(html)).not.toMatch(/\bfires?\b/i);
  });
});
