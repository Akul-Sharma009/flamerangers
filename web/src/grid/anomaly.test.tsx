// Story 3.8: the anomaly view and flags. One block per acceptance criterion.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import cellsJson from "../../../contract/fixture/cells.json";
import everyStateJson from "../../../contract/fixture/examples/cells_every_state.json";
import referenceYearJson from "../../../contract/fixture/examples/cells_reference_year.json";
import metaJson from "../../../contract/fixture/meta.json";
import { messages } from "../api/messages";
import { defaultArea } from "../area/featured";
import { formatCount, formatSigned, formatSignedPct, formatYearMonth } from "../format";
import { CalendarView } from "../pages/CalendarPage";
import { cellsRequest, createCellsLoader, type Cells } from "../provenance/cells";
import { buildAnomalyClasses, flagLines, gridSentences, neutralIndex, toneOf, type GridSentences } from "./anomaly";
import { CalendarGrid } from "./CalendarGrid";
import { FLAG_STATES, FlagCellsView, cellSentence } from "./FlagCells";
import { GridLegend } from "./GridLegend";
import { buildGridModel, detailAt, type Calendar, type Meta } from "./model";

const meta = metaJson as unknown as Meta;
const fixture = calendarJson as unknown as Calendar;
const sumatraCells = cellsJson as unknown as Cells;
const everyState = everyStateJson as unknown as Cells;
const referenceYearCells = referenceYearJson as unknown as Cells;
const aoi = defaultArea().aoi;
const WIDE = 795;
const NARROW = 343;
const unit = fixture.unit_label;
const REF = `${fixture.reference_period.start_year}–${fixture.reference_period.end_year}`;
const FLAG_REF = `${fixture.flag_reference_years.start_year}–${fixture.flag_reference_years.end_year}`;

type Month = Calendar["months"][number];

function withMonths(edit: Record<string, Partial<Month>>): Calendar {
  const c = structuredClone(fixture);
  c.months = c.months.map((m) => (edit[m.month] ? { ...m, ...edit[m.month] } : m));
  return c;
}

function text(html: string): string {
  return html
    .replace(/<title>.*?<\/title>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

function cellTag(html: string, ym: string): string {
  const m = html.match(new RegExp(`<g[^>]*data-month="${ym}"[^>]*>`));
  if (!m) throw new Error(`no cell ${ym}`);
  return m[0];
}
function cellMarkup(html: string, ym: string): string {
  const start = html.indexOf(cellTag(html, ym));
  return html.slice(start, html.indexOf("</g>", start));
}
const label = (html: string, ym: string) => decode(cellTag(html, ym).match(/aria-label="([^"]*)"/)![1]);

const anomalyGrid = (c: Calendar = fixture, width = WIDE, extra = {}) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={width} initialMeasure="anomaly" {...extra} />);
const countGrid = (c: Calendar = fixture, width = WIDE, extra = {}) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={width} {...extra} />);
const anomalyTable = (c: Calendar = fixture) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={WIDE} initialView="table" initialMeasure="anomaly" />);
const linesFor = (c: Calendar, ym: string, measure: "count" | "anomaly" = "anomaly") => {
  const model = buildGridModel(c, meta);
  const r = model.rows.findIndex((row) => row.year === Number(ym.slice(0, 4)));
  return detailAt(model, { r, c: Number(ym.slice(5)) - 1 }, measure)!;
};
const month = (ym: string) => fixture.months.find((m) => m.month === ym)!;

const neutral = neutralIndex(fixture.statistics.anomaly_breaks);

describe("AC1: the anomaly view recolours cells on a diverging ramp centred on the reference mean; the detail gives the anomaly as a count and a percentage", () => {
  it("offers a Counts / Anomalies switch beside Grid / Table", () => {
    const html = countGrid();
    expect(html).toContain('aria-label="Colour cells by"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Counts</);
    expect(anomalyGrid()).toMatch(/aria-pressed="true"[^>]*>Anomalies</);
  });

  it("takes the neutral middle from the served breaks: the class that holds 0", () => {
    // Fixture breaks: -100, -50, -20, 20, 50, 100. Class 2 runs from -20 to 20.
    expect(neutral).toBe(2);
    expect(fixture.statistics.anomaly_breaks[neutral]).toBeLessThanOrEqual(0);
    expect(fixture.statistics.anomaly_breaks[neutral + 1]).toBeGreaterThan(0);
    expect(neutralIndex([5, 10])).toBe(-1);
    expect(toneOf(2, 2)).toBe("neutral");
    expect(toneOf(0, 2)).toBe("cool2");
    expect(toneOf(1, 2)).toBe("cool1");
    expect(toneOf(5, 2)).toBe("warm3");
    expect(toneOf(9, 2)).toBe("warm3");
  });

  it("colours every counted month by its served anomaly_class: below the mean one hue, above it the other", () => {
    const html = anomalyGrid();
    for (const m of fixture.months) {
      const tag = cellTag(html, m.month);
      if (m.count === null) {
        expect(tag).toContain("nullcell");
        continue;
      }
      expect(tag).toContain(`data-anomaly-class="${m.anomaly_class}"`);
      const tone = toneOf(m.anomaly_class!, neutral);
      expect(tag).toContain(`a-${tone}`);
      if (m.anomaly_class! < neutral) expect(tone).toMatch(/^cool/);
      if (m.anomaly_class! > neutral) expect(tone).toMatch(/^warm/);
    }
  });

  it("styles a cell by its served class only, never by its percentage or count", () => {
    const c = withMonths({ "2015-09": { anomaly_pct: -99, anomaly_count: -1, count: 1 } });
    expect(cellTag(anomalyGrid(c), "2015-09")).toContain(`a-${toneOf(month("2015-09").anomaly_class!, neutral)}`);
  });

  it("keeps months outside the record hatched, and a counted month with no anomaly class plain, not neutral", () => {
    const html = anomalyGrid();
    expect(cellMarkup(html, "2002-03")).toContain("url(#hatch-record)");
    const c = withMonths({ "2015-09": { anomaly_class: null, anomaly_pct: null, no_typical_activity: true } });
    const tag = cellTag(anomalyGrid(c), "2015-09");
    expect(tag).toContain("a-none");
    expect(tag).not.toContain("a-neutral");
    expect(label(anomalyGrid(c), "2015-09")).toContain(messages.notes.no_typical_activity);
    expect(text(renderToStaticMarkup(<GridLegend calendar={fixture} measure="anomaly" />))).toContain(messages.notes.no_typical_activity);
  });

  it("shows each month's served anomaly_pct, signed, in the cell at laptop width", () => {
    const html = anomalyGrid();
    expect(cellMarkup(html, "2015-09")).toContain(`>${formatSignedPct(277.55)}</text>`);
    expect(cellMarkup(html, "2026-11")).toContain(`>${formatSignedPct(-81.34)}</text>`);
    // At 375 px cells are tint only, as in the count view.
    expect(cellMarkup(anomalyGrid(fixture, NARROW), "2015-09")).not.toContain('class="num');
  });

  it("gives every counted month's detail the anomaly as a count and a percentage, from served fields", () => {
    for (const m of fixture.months.filter((x) => x.count !== null)) {
      const lines = linesFor(fixture, m.month);
      expect(lines[1]).toBe(`Anomaly: ${formatSigned(m.anomaly_count!)} ${unit}, ${formatSignedPct(m.anomaly_pct!)}%`);
      expect(lines).toContain(`${formatCount(m.count!)} ${unit}`);
      expect(lines).toContain(`Reference mean ${REF}: ${formatCount(m.reference_mean!)} ${unit}`);
    }
  });

  it("puts the same detail in the accessible name and the card of the focused cell", () => {
    const model = buildGridModel(fixture, meta);
    const r = model.rows.findIndex((row) => row.year === 2015);
    const html = anomalyGrid(fixture, WIDE, { initialActive: { r, c: 8 } });
    const lines = linesFor(fixture, "2015-09");
    const card = text(html.slice(html.indexOf('class="cellcard"')));
    for (const l of lines) expect(card).toContain(l);
    expect(label(html, "2015-09")).toContain(`Anomaly: ${formatSigned(19674.4)} ${unit}, +277.55%.`);
  });

  it("foots each column with the served reference mean, the centre of the ramp", () => {
    const html = anomalyGrid();
    for (const e of fixture.calendar_month_medians) expect(html).toContain(`>${formatCount(e.reference_mean!)}</text>`);
    expect(html).toContain(">mean</text>");
    const model = buildGridModel(fixture, meta);
    expect(detailAt(model, { r: model.rows.length, c: 8 }, "anomaly")).toEqual([`September, reference mean ${REF}`, `${formatCount(7088.6)} ${unit}`]);
  });

  it("names every served anomaly break, signed, and the reference period in the legend", () => {
    const legend = renderToStaticMarkup(<GridLegend calendar={fixture} measure="anomaly" />);
    const classes = buildAnomalyClasses(fixture);
    expect(classes).toHaveLength(fixture.statistics.anomaly_breaks.length);
    for (const c of classes) {
      expect(legend).toContain(`data-tone="${c.tone}"`);
      expect(legend).toContain(`<span>${c.label}</span>`);
    }
    expect(text(legend)).toContain(`% of the ${REF} mean`);
    expect(classes.map((c) => c.label)).toEqual(["−100", "−50", "−20", "+20", "+50", "+100"]);
    // The count view's legend keeps the count classes.
    expect(renderToStaticMarkup(<GridLegend calendar={fixture} />)).not.toContain("data-tone");
  });

  it("has the same anomaly values in the table view", () => {
    const t = anomalyTable();
    const model = buildGridModel(fixture, meta);
    for (const r of model.rows)
      for (const c of r.cells) {
        const td = t.match(new RegExp(`<td[^>]*data-month="${c.month}"[^>]*>(.*?)</td>`))![1];
        expect(text(td).replace(/[◤○]/g, "").replace(/\s/g, "")).toBe(`${c.anomalyLabel}${c.marks}`);
      }
    expect(text(t)).toContain(`Reference mean ${REF}`);
  });

  it("uses no red on the diverging ramp", async () => {
    const css = (await import("node:fs")).readFileSync(new URL("./grid.css", import.meta.url), "utf8");
    const ramp = css.slice(css.indexOf("Story 3.8"));
    for (const hex of ramp.match(/#[0-9a-f]{6}/gi) ?? []) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      // No step is a red: red channel well above both others with green low.
      expect(r > 150 && g < 90 && b < 90, hex).toBe(false);
    }
  });
});

describe("AC2: a month with flagged cells carries a symbol; strong and marginal differ without colour; the detail says how many of the area's 1° cells are flagged", () => {
  afterEach(() => {
    delete (messages as unknown as { sentences?: unknown }).sentences;
  });

  it("marks strong months with a filled triangle and marginal-only months with a ring, in both views", () => {
    const c = withMonths({ "2015-09": { cells_flagged_strong: 0, cells_flagged_marginal: 4 } });
    for (const html of [countGrid(c), anomalyGrid(c), anomalyGrid(c, NARROW)]) {
      expect(cellMarkup(html, "2015-08")).toContain('class="flag-strong"');
      expect(cellMarkup(html, "2015-09")).toContain('class="flag-marginal"');
      expect(cellMarkup(html, "2015-09")).not.toContain("flag-strong");
      expect(cellMarkup(html, "2026-11")).not.toMatch(/flag-(strong|marginal)/);
    }
  });

  it("says per tier how many of the area's 1° cells are flagged, with the 1° scale stated", () => {
    const m = month("2015-09");
    for (const view of ["count", "anomaly"] as const) {
      const lines = linesFor(fixture, "2015-09", view);
      expect(lines).toContain(`Flagged 1° cells: ${m.cells_flagged_strong} strong, ${m.cells_flagged_marginal} marginal, of ${m.cells_total}`);
      expect(lines).toContain(messages.notes.flag_scale);
      expect(lines).toContain(messages.labels.flag_state.strong);
    }
  });

  it("uses the contract's cells_flagged sentence once it exists (contract 0.4.0), filled with served values", () => {
    (messages as unknown as { sentences: Record<string, string> }).sentences = {
      cells_flagged: "{strong} of {total} one-degree cells are flagged strong and {marginal} marginal, a caution and not an alarm.",
    };
    expect(flagLines(month("2015-09"))[0]).toBe("19 of 113 one-degree cells are flagged strong and 9 marginal, a caution and not an alarm.");
  });

  it("states that the strong tier was checked on selection years only, wherever it is shown", () => {
    expect(linesFor(fixture, "2015-09", "count")).toContain(messages.notes.strong_tier);
    const marginalOnly = withMonths({ "2015-09": { cells_flagged_strong: 0, cells_flagged_marginal: 4 } });
    expect(linesFor(marginalOnly, "2015-09")).not.toContain(messages.notes.strong_tier);
    for (const measure of ["count", "anomaly"] as const) {
      const legend = text(renderToStaticMarkup(<GridLegend calendar={fixture} measure={measure} />));
      expect(legend).toContain(messages.notes.strong_tier);
      expect(legend).toContain(messages.notes.flag_scale);
    }
    expect(text(renderToStaticMarkup(<FlagCellsView cells={sumatraCells} unit={unit} />))).toContain(messages.notes.strong_tier);
  });

  it("never states a flag on the area's total: the flag lines are only the served per-cell counts", () => {
    const lines = flagLines(month("2015-09"));
    expect(lines.join(" ")).not.toMatch(/area is flagged|area total/i);
    // 19 + 9 is never written: the web does not sum the tiers (AD-8).
    expect(lines.join(" ")).not.toContain("28");
  });

  it("survives contract 0.4.0's null flag counts outside the record: no mark, no flag line", () => {
    const c = withMonths({ "2015-09": { cells_flagged_strong: null, cells_flagged_marginal: null, cells_total: null } as unknown as Partial<Month> });
    expect(cellMarkup(anomalyGrid(c), "2015-09")).not.toMatch(/flag-(strong|marginal)/);
    expect(linesFor(c, "2015-09").join(" ")).not.toContain("Flagged 1° cells");
    expect(linesFor(c, "2015-09").join(" ")).not.toContain("null");
  });
});

describe("AC3: a reference-year month, a cell below the floor and a partial month read 'reference years', 'not flaggable' and 'provisional'", () => {
  it("reads 'reference years' on a month in the flag reference years, and only there", () => {
    for (const m of fixture.months.filter((x) => x.count !== null)) {
      for (const view of ["count", "anomaly"] as const) {
        const has = linesFor(fixture, m.month, view).includes(messages.notes.reference_year);
        expect(has, `${m.month} ${view}`).toBe(m.reference_year);
      }
    }
    expect(messages.notes.reference_year.startsWith("Reference years")).toBe(true);
    expect(month("2006-10").reference_year).toBe(true);
  });

  it("reads 'provisional' on a partial month whose flags may change, and only there", () => {
    for (const m of fixture.months.filter((x) => x.count !== null)) {
      expect(linesFor(fixture, m.month).includes(messages.notes.provisional), m.month).toBe(m.provisional);
    }
    expect(label(anomalyGrid(), "2026-11")).toContain(messages.notes.provisional);
    expect(messages.notes.provisional.startsWith("Provisional")).toBe(true);
  });

  it("reads 'not flaggable' on each cell below the floor in the month's cell panel, with every flag state told apart without colour", () => {
    const html = renderToStaticMarkup(<FlagCellsView cells={everyState} unit={unit} />);
    for (const s of FLAG_STATES) {
      expect(html).toContain(`data-state="${s}"`);
      expect(text(html)).toContain(messages.labels.flag_state[s]);
    }
    const nf = everyState.cells.find((c) => c.flag_state === "not_flaggable")!;
    expect(cellSentence(nf, unit)).toContain(messages.labels.flag_state.not_flaggable);
    expect(messages.labels.flag_state.not_flaggable.startsWith("Not flaggable")).toBe(true);
    // Strong is a filled triangle, marginal a ring; the others differ by outline or hatching (flagcells.css).
    expect(html).toContain('class="fc-strong"');
    expect(html).toContain('class="fc-marginal"');
    expect(html).toContain("url(#fc-hatch)");
  });

  it("reads 'provisional' and 'reference years' on cells that carry them", () => {
    const prov = text(renderToStaticMarkup(<FlagCellsView cells={everyState} unit={unit} />));
    expect(prov).toContain(messages.notes.provisional);
    const ref = renderToStaticMarkup(<FlagCellsView cells={referenceYearCells} unit={unit} />);
    expect(text(ref)).toContain(messages.notes.reference_year);
    expect(text(ref)).toContain("October 2006");
  });

  it("asks /cells for the picked month", async () => {
    expect(cellsRequest(meta, aoi, "2015-09").month).toBe("2015-09");
    expect(cellsRequest(meta, aoi).month).toBe(meta.current_month); // Story 3.6's call is unchanged
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(sumatraCells), { status: 200 }));
    const load = createCellsLoader("https://svc.example", fetchImpl as unknown as typeof fetch);
    await load(meta, aoi, "2019-09");
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ record_version: meta.record_version, aoi, month: "2019-09" });
  });

  it("shows the cell panel only in the anomaly view", () => {
    const view = { selected: aoi, range: null, result: { status: "ready" as const, meta, calendar: fixture } };
    const anomalyPage = renderToStaticMarkup(<CalendarView view={view} onSelect={() => undefined} initialMeasure="anomaly" />);
    expect(anomalyPage).toContain('data-measure="anomaly"');
    const countPage = renderToStaticMarkup(<CalendarView view={view} onSelect={() => undefined} />);
    expect(countPage).not.toContain('data-measure="anomaly"');
    expect(countPage).not.toContain('class="flagcells"');
  });
});

describe("AC4: a large anomaly with no flag, or a flag with a small anomaly, shows both the reference period and the flag reference years", () => {
  const c = withMonths({
    // Large anomaly, no cell flagged.
    "2012-09": { anomaly_pct: 180.5, anomaly_count: 9000.1, anomaly_class: 5, cells_flagged_strong: 0, cells_flagged_marginal: 0 },
    // Strong flags, small anomaly.
    "2012-10": { anomaly_pct: 4.2, anomaly_count: 200.4, anomaly_class: 2, cells_flagged_strong: 3, cells_flagged_marginal: 1 },
  });

  for (const ym of ["2012-09", "2012-10"]) {
    it(`states both periods and the month's flag counts for ${ym}`, () => {
      const lines = linesFor(c, ym);
      expect(lines).toContain(`Reference mean ${REF}: ${formatCount(month(ym).reference_mean!)} ${unit}`);
      expect(lines).toContain(`Flag reference years ${FLAG_REF}`);
      const m = c.months.find((x) => x.month === ym)!;
      expect(lines).toContain(`Flagged 1° cells: ${m.cells_flagged_strong} strong, ${m.cells_flagged_marginal} marginal, of ${m.cells_total}`);
      expect(lines).toContain(messages.notes.flag_scale);
    });
  }

  it("states the flag reference years in the cell panel too", () => {
    expect(text(renderToStaticMarkup(<FlagCellsView cells={sumatraCells} unit={unit} />))).toContain(`Flag reference years ${FLAG_REF}`);
  });
});

describe("Every number in the anomaly view is served (AD-8)", () => {
  it("puts on screen only served values or numbers inside contract sentences", () => {
    const served = new Set<string>();
    const add = (s: string) => {
      for (const d of s.match(/\d[\d,.]*\d|\d/g) ?? []) served.add(d);
    };
    for (const m of fixture.months) {
      if (m.count !== null) add(formatCount(m.count));
      if (m.anomaly_pct !== null) add(formatSignedPct(m.anomaly_pct));
      if (m.anomaly_count !== null) add(formatSigned(m.anomaly_count));
      if (m.reference_mean !== null) add(formatCount(m.reference_mean));
      for (const k of [m.cells_flagged_strong, m.cells_flagged_marginal, m.cells_total]) add(formatCount(k));
      add(m.month.slice(0, 4));
    }
    for (const t of fixture.year_totals) { if (t.total !== null) add(formatCount(t.total)); add(String(t.year)); }
    for (const e of fixture.calendar_month_medians) { if (e.median !== null) add(formatCount(e.median)); if (e.reference_mean !== null) add(formatCount(e.reference_mean)); }
    for (const b of fixture.statistics.anomaly_breaks) add(formatSignedPct(b));
    for (const b of fixture.statistics.colour_breaks) add(formatCount(b));
    for (const t of fixture.statistics.top_years) add(String(t.rank));
    for (const y of [fixture.reference_period, fixture.flag_reference_years]) { add(String(y.start_year)); add(String(y.end_year)); }
    for (const cells of [sumatraCells, everyState]) {
      add(cells.month.slice(0, 4));
      for (const x of cells.cells) {
        add(String(x.sw_lon)); add(String(x.sw_lat));
        if (x.count !== null) add(formatCount(x.count));
        if (x.threshold !== null) add(formatCount(x.threshold));
      }
    }
    // Numbers inside contract sentences ("1.5 times", "10 hotspots", "1°") are the contract's words.
    const words = [...Object.values(messages.notes), ...Object.values(messages.labels).flatMap((t) => Object.values(t))];
    for (const s of words) add(s);
    add("1°"); // the stated flag scale, from the contract's flag_scale note

    const model = buildGridModel(fixture, meta);
    const r = model.rows.findIndex((row) => row.year === 2015);
    const screens = [
      anomalyGrid(), anomalyGrid(fixture, NARROW), anomalyTable(),
      anomalyGrid(fixture, WIDE, { initialActive: { r, c: 8 } }),
      renderToStaticMarkup(<GridLegend calendar={fixture} measure="anomaly" />),
      renderToStaticMarkup(<FlagCellsView cells={sumatraCells} unit={unit} />),
      renderToStaticMarkup(<FlagCellsView cells={everyState} unit={unit} />),
    ];
    for (const html of screens) {
      for (const tok of text(html).match(/\d[\d,.]*\d|\d/g) ?? []) expect(served, tok).toContain(tok);
    }
  });
});

// The lead approved these on 15 Nov for the contract 0.4.0 draft. Passed in, as card.test.tsx does,
// so the test does not depend on which contract version is checked out.
const APPROVED: GridSentences = {
  anomaly: "Difference from the {reference_start}–{reference_end} mean for {month_name}: {anomaly_count} hotspots ({anomaly_pct}%).",
  reference_mean: "The {reference_start}–{reference_end} mean for {month_name} is {mean} hotspots.",
  flag_reference: "Flag thresholds come from {flag_start}–{flag_end}, a different period from the mean, so a large anomaly can have no flag and a flag can come with a small anomaly.",
  anomaly_scale: "Anomaly as a percentage of the {reference_start}–{reference_end} mean for the calendar month. Each class starts at the value shown.",
  cells_heading: "Flag state of each one-degree cell in {month}.",
  partly_inside: "Partly inside the area. The count and flag are for the whole cell.",
};

describe("Approved contract sentences: used once the contract has them, labels until then", () => {
  const sentenceLines = (ym: string) => {
    const model = buildGridModel(fixture, meta, APPROVED);
    const r = model.rows.findIndex((row) => row.year === Number(ym.slice(0, 4)));
    return detailAt(model, { r, c: Number(ym.slice(5)) - 1 }, "anomaly")!;
  };

  it("master's contract has none of the six keys, so the labels show", () => {
    const own = gridSentences();
    for (const k of ["anomaly", "reference_mean", "flag_reference", "anomaly_scale", "cells_heading", "partly_inside"] as const) {
      expect(own[k], k).toBeUndefined();
    }
    const lines = linesFor(fixture, "2015-09");
    expect(lines[1]).toBe(`Anomaly: ${formatSigned(19674.4)} ${unit}, +277.55%`);
    expect(lines).toContain(`Reference mean ${REF}: ${formatCount(7088.6)} ${unit}`);
    expect(lines).toContain(`Flag reference years ${FLAG_REF}`);
    expect(text(renderToStaticMarkup(<GridLegend calendar={fixture} measure="anomaly" />))).toContain(`Anomaly, % of the ${REF} mean`);
    const panel = text(renderToStaticMarkup(<FlagCellsView cells={everyState} unit={unit} />));
    expect(panel).toContain("Flag state of each 1° cell, November 2026");
    expect(panel).toContain("Partly inside the area.");
  });

  it("fills the anomaly sentence from served values, keeping each served sign", () => {
    expect(sentenceLines("2015-09")[1]).toBe("Difference from the 2003–2025 mean for September: +19,674.4 hotspots (+277.55%).");
    expect(sentenceLines("2026-11")[1]).toBe("Difference from the 2003–2025 mean for November: −1,139 hotspots (−81.34%).");
  });

  it("fills the reference-mean and flag-reference sentences in every counted month's card", () => {
    for (const m of fixture.months.filter((x) => x.count !== null)) {
      const lines = sentenceLines(m.month);
      const name = formatYearMonth(m.month).split(" ")[0];
      expect(lines).toContain(`The 2003–2025 mean for ${name} is ${formatCount(m.reference_mean!)} hotspots.`);
      expect(lines).toContain("Flag thresholds come from 2003–2011, a different period from the mean, so a large anomaly can have no flag and a flag can come with a small anomaly.");
      expect(lines.join(" ")).not.toMatch(/Reference mean|Flag reference years|Anomaly:/);
    }
  });

  it("captions the legend and the table view with the anomaly-scale sentence", () => {
    const want = "Anomaly as a percentage of the 2003–2025 mean for the calendar month. Each class starts at the value shown.";
    expect(text(renderToStaticMarkup(<GridLegend calendar={fixture} measure="anomaly" sentences={APPROVED} />))).toContain(want);
    const t = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} initialView="table" initialMeasure="anomaly" sentences={APPROVED} />);
    expect(text(t)).toContain(want);
  });

  it("heads the cell panel and words partly-inside cells with the contract's sentences", () => {
    const html = renderToStaticMarkup(<FlagCellsView cells={everyState} unit={unit} sentences={APPROVED} />);
    expect(html).toContain("<h3>Flag state of each one-degree cell in November 2026.</h3>");
    expect(text(html)).toContain(APPROVED.partly_inside!);
    expect(text(html)).toContain("Flag thresholds come from 2003–2011");
    expect(text(html)).not.toContain("Partly inside the area. Not");
    const partly = everyState.cells.find((c) => c.partly_inside)!;
    expect(cellSentence(partly, unit, APPROVED)).toContain(APPROVED.partly_inside!);
  });

  it("falls back to the label rather than leave a placeholder empty, and never writes a null as 0", () => {
    const c = withMonths({ "2015-09": { anomaly_pct: null, anomaly_class: null, no_typical_activity: true } });
    const model = buildGridModel(c, meta, APPROVED);
    const r = model.rows.findIndex((row) => row.year === 2015);
    const lines = detailAt(model, { r, c: 8 }, "anomaly")!;
    expect(lines[1]).toBe(`Anomaly: ${formatSigned(19674.4)} ${unit}`);
    expect(lines.join(" ")).not.toMatch(/\{|\}|\(%\)|null/);
  });

  it("puts on screen only served values with the sentences in place (AD-8)", () => {
    const model = buildGridModel(fixture, meta, APPROVED);
    const r = model.rows.findIndex((row) => row.year === 2015);
    const card = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} initialMeasure="anomaly" initialActive={{ r, c: 8 }} sentences={APPROVED} />);
    // From the card's opening "<", so its style attribute is stripped with the tag.
    const shown = text(card.slice(card.lastIndexOf("<", card.indexOf('class="cellcard"'))));
    for (const tok of ["19,674.4", "277.55", "26,763", "7,088.6", "2003", "2025", "2011", "19", "9", "113"]) expect(shown).toContain(tok);
    for (const tok of shown.match(/\d[\d,.]*\d|\d/g) ?? []) {
      expect(["19,674.4", "277.55", "26,763", "7,088.6", "2003", "2025", "2011", "2015", "19", "9", "113", "1", "1.5", "30"], tok).toContain(tok);
    }
  });
});
