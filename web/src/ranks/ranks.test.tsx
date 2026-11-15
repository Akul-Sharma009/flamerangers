// Story 3.9: most active months and years. One block per acceptance criterion.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import savannaJson from "../../../contract/fixture/examples/calendar_small_savanna_area.json";
import untunedJson from "../../../contract/fixture/examples/calendar_untuned_area.json";
import metaJson from "../../../contract/fixture/meta.json";
import { defaultArea } from "../area/featured";
import { MONTH_NAMES, formatCount, formatDay, formatYearMonth } from "../format";
import { CalendarGrid } from "../grid/CalendarGrid";
import { HL_PAD, coversMonth, coversYearTotal, highlightBox, sameHighlight, type Highlight } from "../grid/highlight";
import { GAP, layoutGrid } from "../grid/layout";
import { buildGridModel, type Meta } from "../grid/model";
import { CalendarView } from "../pages/CalendarPage";
import { buildRankings, currentHighlight, nextHighlight, type Calendar } from "./model";
import { RankingsPanel } from "./RankingsPanel";
import { RANK_NOTE_KEYS, RANK_SENTENCE_KEYS, contractRankWords, type RankWords } from "./words";

const meta = metaJson as unknown as Meta;
const fixture = calendarJson as unknown as Calendar;
const savanna = savannaJson as unknown as Calendar;
const untuned = untunedJson as unknown as Calendar;
const WIDE = 795; // the grid column at a 1280 px window
const NARROW = 343; // a 375 px window less the page gutters

/** The wording suggested in DECISIONS.md (Story 3.9), as a contract bump would add it. */
const PROPOSED: RankWords = {
  rankings_range: "Only complete months and years from {range_start} to {range_end} are ranked.",
  rank_tie: "An equals sign after a rank means the rank is shared: those values are equal.",
  no_complete_month: "No complete month falls in these dates, so none is ranked.",
  no_complete_year: "No complete year falls in these dates, so none is ranked.",
  range_and_reference: "Rankings cover the dates you chose. Medians and anomalies always use the reference period.",
};

const panel = (c: Calendar, highlight: Highlight | null = null, words: RankWords = {}) =>
  renderToStaticMarkup(<RankingsPanel calendar={c} highlight={highlight} onHighlight={() => undefined} words={words} />);

/** Visible text: tags dropped, entities decoded, screen-reader-only spans kept. */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

/** One table's markup, by its data-list. */
function list(html: string, id: string): string {
  const start = html.indexOf(`data-list="${id}"`);
  return html.slice(start, html.indexOf("</table>", start));
}

/** Each body row of a table as [rank cell text, name, value]. */
function rowsOf(tableHtml: string): string[][] {
  const body = tableHtml.slice(tableHtml.indexOf("<tbody>"));
  return [...body.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map((c, i) =>
      // The rank cell is read as one string ("7=, tied"): its parts are adjacent spans.
      i === 0 ? c[1].replace(/<[^>]+>/g, "").trim() : text(c[1]).trim(),
    ),
  );
}

const page = (calendar: Calendar, extra = {}) =>
  renderToStaticMarkup(
    <CalendarView
      view={{ selected: defaultArea().aoi, range: null, result: { status: "ready", meta, calendar } }}
      onSelect={() => undefined}
      rankWords={{}}
      {...extra}
    />,
  );

describe("AC1: top 5 months and top 5 years with values and ranks, ties as ties, busiest calendar months on average", () => {
  const html = panel(fixture);

  it("lists the served top months with their served counts and ranks, in served order", () => {
    const rows = rowsOf(list(html, "months"));
    expect(rows).toEqual(fixture.statistics.top_months.map((e) => [String(e.rank), formatYearMonth(e.month), formatCount(e.count)]));
    expect(rows).toHaveLength(5);
  });

  it("lists the served top years with their served totals and ranks, in served order", () => {
    const rows = rowsOf(list(html, "years"));
    expect(rows).toEqual(fixture.statistics.top_years.map((e) => [String(e.rank), String(e.year), formatCount(e.total)]));
    expect(rows).toHaveLength(5);
  });

  it("lists every served busiest calendar month with its served mean and rank", () => {
    const t = list(html, "calendar_months");
    expect(t).toContain("on average");
    expect(t).toContain(">Mean<");
    const rows = rowsOf(t);
    expect(rows).toEqual(
      fixture.statistics.busiest_calendar_months.map((e) => [String(e.rank), MONTH_NAMES[e.calendar_month - 1], formatCount(e.mean_count)]),
    );
    expect(rows).toHaveLength(12);
  });

  it("names the unit and the served range the rankings cover", () => {
    expect(html).toContain(fixture.unit_label);
    expect(html).toContain(`${formatDay(fixture.range.start)} to ${formatDay(fixture.range.end)}`);
  });

  it("shows ties as ties: a shared served rank reads '7=' and 'tied', the others do not", () => {
    const rows = rowsOf(list(panel(savanna), "calendar_months"));
    const served = savanna.statistics.busiest_calendar_months;
    const sevens = served.filter((e) => e.rank === 7);
    expect(sevens.length).toBe(6);
    for (const [i, e] of served.entries()) {
      // The visible "=" and the screen-reader word are both in the rank cell.
      expect(rows[i][0]).toBe(e.rank === 7 ? "7=, tied" : String(e.rank));
    }
    // A tied entry that is a 0 mean stays a served 0, not a dash.
    expect(rows.filter((r) => r[0].startsWith("7=")).map((r) => r[2])).toEqual(sevens.map((e) => formatCount(e.mean_count)));
    const m = buildRankings(savanna, {});
    expect(m.anyTie).toBe(true);
    expect(m.lists[2].rows.filter((r) => r.tied).map((r) => r.rankLabel)).toEqual(Array(6).fill("7="));
  });

  it("shows more than five entries when the service serves a tie at the cut", () => {
    const c = structuredClone(fixture);
    c.statistics.top_months = [
      ...c.statistics.top_months.slice(0, 4),
      { month: "2014-08", count: 11068, rank: 5 },
      { month: "2019-09", count: 11068, rank: 5 },
    ];
    const rows = rowsOf(list(panel(c), "months"));
    expect(rows).toHaveLength(6);
    expect(rows.slice(4).map((r) => r[0])).toEqual(["5=, tied", "5=, tied"]);
    expect(rows.slice(0, 4).every((r) => !r[0].includes("tied"))).toBe(true);
  });

  it("never re-ranks: served order and served ranks are kept even when the values would order differently", () => {
    const c = structuredClone(fixture);
    // An edited answer whose counts are not descending; the browser must not fix it.
    c.statistics.top_years = [
      { year: 2009, total: 100, rank: 1 },
      { year: 2015, total: 200, rank: 2 },
    ];
    expect(rowsOf(list(panel(c), "years"))).toEqual([["1", "2009", "100"], ["2", "2015", "200"]]);
    // Ties come from served ranks only, never from equal values.
    c.statistics.top_years = [
      { year: 2009, total: 100, rank: 1 },
      { year: 2015, total: 100, rank: 2 },
    ];
    expect(rowsOf(list(panel(c), "years")).map((r) => r[0])).toEqual(["1", "2"]);
  });

  it("ranks only what is served for the range: no complete year shows a dash, never a 0 or a year", () => {
    const rows = rowsOf(list(panel(untuned), "years"));
    expect(untuned.statistics.top_years).toEqual([]);
    expect(rows).toEqual([["–", ""]]);
    expect(rowsOf(list(panel(untuned, null, PROPOSED), "years"))).toEqual([["–", PROPOSED.no_complete_year]]);
    // The incomplete current year, served with rank null, is not listed anywhere.
    const html = panel(fixture);
    const current = fixture.year_totals.find((t) => !t.complete)!;
    expect(current.rank).toBeNull();
    expect(rowsOf(list(html, "years")).map((r) => r[1])).not.toContain(String(current.year));
  });

  it("an empty month list shows a dash, never zeros", () => {
    const c = structuredClone(fixture);
    c.statistics.top_months = [];
    c.statistics.busiest_calendar_months = [];
    const html = panel(c, null, PROPOSED);
    expect(rowsOf(list(html, "months"))).toEqual([["–", PROPOSED.no_complete_month]]);
    expect(rowsOf(list(html, "calendar_months"))).toEqual([["–", PROPOSED.no_complete_month]]);
  });

  it("follows the range: a range-limited answer lists that answer's rankings, not the whole record's", () => {
    const rows = rowsOf(list(panel(savanna), "months"));
    expect(rows.map((r) => r[1])).toEqual(savanna.statistics.top_months.map((e) => formatYearMonth(e.month)));
    // The whole-record high (2014) is outside this range and is not ranked here.
    expect(savanna.statistics.record_high?.month).toBe("2014-08");
    expect(rows.map((r) => r[1])).not.toContain("August 2014");
    expect(panel(savanna)).toContain(`${formatDay(savanna.range.start)} to ${formatDay(savanna.range.end)}`);
  });

  it("contract 0.4.0 serves the rankings' sentences; with none passed, the web types none", () => {
    expect(Object.keys(contractRankWords()).length).toBeGreaterThan(0);
    const t = text(panel(fixture, null, {}));
    expect(t).not.toContain("complete months and years");
    expect(panel(fixture, null, {})).not.toContain("rangenote");
  });

  it("uses the contract's sentences once they exist, filled from the served range", () => {
    const html = panel(savanna, null, PROPOSED);
    expect(text(html)).toContain(`Only complete months and years from ${formatDay(savanna.range.start)} to ${formatDay(savanna.range.end)} are ranked.`);
    expect(text(html)).toContain(PROPOSED.rank_tie!);
    expect(text(html)).toContain(PROPOSED.range_and_reference!);
    // The tie sentence only shows when a list has a tie.
    expect(text(panel(fixture, null, PROPOSED))).not.toContain(PROPOSED.rank_tie!);
    expect([...RANK_SENTENCE_KEYS, ...RANK_NOTE_KEYS].sort()).toEqual(Object.keys(PROPOSED).sort());
  });

  it("every number in the panel is served: a rank, a value, or the served range's days", () => {
    for (const c of [fixture, savanna, untuned]) {
      const s = c.statistics;
      const allowed = new Set<string>([
        ...s.top_months.flatMap((e) => [String(e.rank), formatCount(e.count), e.month.slice(0, 4)]),
        ...s.top_years.flatMap((e) => [String(e.rank), formatCount(e.total), String(e.year)]),
        ...s.busiest_calendar_months.flatMap((e) => [String(e.rank), formatCount(e.mean_count)]),
        ...[c.range.start, c.range.end].flatMap((d) => [String(Number(d.slice(8, 10))), d.slice(0, 4)]),
      ]);
      const nums = text(panel(c, null, PROPOSED)).match(/\d[\d,.]*/g) ?? [];
      for (const n of nums) expect(allowed, `${n} in the panel is not served`).toContain(n.replace(/[.,]$/, ""));
    }
  });

  it("sits on the calendar page after the calendar in source order, only when a calendar is served", () => {
    const html = page(fixture);
    expect(html).toContain('class="page ledger has-ranks"');
    expect(html.indexOf('class="rankings"')).toBeGreaterThan(html.indexOf('class="calsection"'));
    const refused = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: null, result: { status: "problem", code: "no_land", meta } }} onSelect={() => undefined} />,
    );
    expect(refused).not.toContain('class="rankings"');
    expect(refused).not.toContain("has-ranks");
  });
});

describe("AC2: a selected ranked item is highlighted on the calendar", () => {
  const model = buildGridModel(fixture, meta);
  const sep2015: Highlight = { kind: "month", month: "2015-09" };
  const y2015: Highlight = { kind: "year", year: 2015 };
  const sept: Highlight = { kind: "calendar_month", calendarMonth: 9 };

  it("each entry is a toggle button: selecting marks it, selecting it again clears it, another moves the mark", () => {
    expect(nextHighlight(null, sep2015)).toEqual(sep2015);
    expect(nextHighlight(sep2015, { kind: "month", month: "2015-09" })).toBeNull();
    expect(nextHighlight(sep2015, y2015)).toEqual(y2015);
    // A year and the calendar month of the same number are different items.
    expect(sameHighlight({ kind: "year", year: 9 }, { kind: "calendar_month", calendarMonth: 9 })).toBe(false);
    const html = panel(fixture);
    expect((html.match(/<button type="button" aria-pressed="false">/g) ?? []).length).toBe(5 + 5 + 12);
  });

  it("the selected entry is pressed and drawn reversed; no other entry is", () => {
    for (const [h, key] of [[sep2015, "2015-09"], [y2015, "2015"], [sept, "cm-9"]] as const) {
      const html = panel(fixture, h);
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html).toMatch(new RegExp(`<tr class="on" data-key="${key}"`));
      expect(html.match(/class="on"/g)).toHaveLength(1);
    }
  });

  it("a month is framed around its own cell, outside the cell, at both widths and in both measures", () => {
    for (const width of [WIDE, NARROW]) {
      const L = layoutGrid(model, width);
      const r = model.rows.findIndex((row) => row.year === 2015);
      const box = highlightBox(model, L, sep2015, GAP)!;
      expect(box.x).toBeCloseTo(L.yearW + 8 * L.cellW - HL_PAD);
      expect(box.y).toBeCloseTo(L.rowYs[r] - HL_PAD);
      expect(box.width).toBeCloseTo(L.cellW - GAP + 2 * HL_PAD);
      expect(box.height).toBeCloseTo(L.rowH + 2 * HL_PAD);
      for (const measure of ["count", "anomaly"] as const) {
        const html = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={width} measure={measure} highlight={sep2015} />);
        expect(html).toContain('data-highlight="month"');
        expect(html).toContain(`<rect class="hl" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"`);
      }
    }
  });

  it("a year is framed across its whole row, total included, inside the drawing", () => {
    for (const width of [WIDE, NARROW]) {
      const L = layoutGrid(model, width);
      const r = model.rows.findIndex((row) => row.year === 2015);
      const box = highlightBox(model, L, y2015, GAP)!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(L.width);
      expect(box.x + box.width).toBeGreaterThan(L.totalX + 50 > L.width ? L.totalX : L.totalX + 50);
      expect(box.y).toBeCloseTo(L.rowYs[r] - HL_PAD);
      expect(box.height).toBeCloseTo(L.rowH + 2 * HL_PAD);
    }
    const html = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} highlight={y2015} />);
    expect(html).toContain('data-highlight="year"');
  });

  it("a calendar month is framed down its whole column through its median", () => {
    for (const width of [WIDE, NARROW]) {
      const L = layoutGrid(model, width);
      const box = highlightBox(model, L, sept, GAP)!;
      expect(box.x).toBeCloseTo(L.yearW + 8 * L.cellW - HL_PAD);
      expect(box.y).toBeCloseTo(L.rowYs[0] - HL_PAD);
      expect(box.y + box.height).toBeGreaterThan(L.footY + L.footH - 2);
      expect(box.y + box.height).toBeLessThanOrEqual(L.height);
    }
  });

  it("draws no frame without a selection, and none for an item that is not on the grid", () => {
    const html = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} />);
    expect(html).not.toContain('class="hl"');
    const L = layoutGrid(model, WIDE);
    expect(highlightBox(model, L, { kind: "month", month: "1999-01" }, GAP)).toBeNull();
    expect(highlightBox(model, L, { kind: "year", year: 1999 }, GAP)).toBeNull();
    expect(
      renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} highlight={{ kind: "year", year: 1999 }} />),
    ).not.toContain('class="hl"');
  });

  it("the table view marks the same months: one cell, a year's row and total, or a column and its median", () => {
    const tbl = (h: Highlight) =>
      renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} width={WIDE} initialView="table" highlight={h} />);
    const lit = (html: string) => [...html.matchAll(/<td class="[^"]*\bhl\b[^"]*" data-month="(\d{4}-\d{2})"/g)].map((m) => m[1]);
    expect(lit(tbl(sep2015))).toEqual(["2015-09"]);
    const year = tbl(y2015);
    expect(lit(year)).toEqual(fixture.months.filter((m) => m.month.startsWith("2015")).map((m) => m.month));
    expect(year).toContain('class="hl-row"');
    expect(year).toMatch(/<td class="total hl"/);
    const col = tbl(sept);
    expect(lit(col)).toEqual(model.rows.map((r) => r.cells[8].month));
    expect(col.slice(col.indexOf("<tfoot>")).match(/class="hl"/g)).toHaveLength(1);
    // Helpers agree with the marks.
    expect(coversMonth(sept, "2003-09")).toBe(true);
    expect(coversMonth(sept, "2003-10")).toBe(false);
    expect(coversYearTotal(y2015, 2015)).toBe(true);
    expect(coversYearTotal(sep2015, 2015)).toBe(false);
  });

  it("on the page, the selection reaches both the rankings and the grid", () => {
    const html = page(fixture, { initialHighlight: y2015 });
    expect(html).toMatch(/<tr class="on" data-key="2015"/);
    // The grid measures its width in the browser; in the table view the mark needs no width.
    expect(html).toContain("calsection");
    const tableHtml = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={meta} initialView="table" highlight={y2015} />);
    expect(tableHtml).toContain('class="hl-row"');
  });

  it("a new area or range clears the mark; the same calendar keeps it", () => {
    const a = structuredClone(fixture);
    const b = structuredClone(fixture);
    expect(currentHighlight({ of: undefined, item: sep2015 }, a)).toEqual(sep2015);
    expect(currentHighlight({ of: a, item: sep2015 }, a)).toEqual(sep2015);
    expect(currentHighlight({ of: a, item: sep2015 }, b)).toBeNull();
    expect(currentHighlight({ of: a, item: sep2015 }, null)).toBeNull();
  });

  it("the frame is a shape, not a colour: drawn outside the cell in ink on a paper halo, never red", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../grid/grid.css", import.meta.url), "utf8");
    const rule = css.slice(css.indexOf("Story 3.9"));
    expect(rule).toMatch(/\.calgrid \.hl \{[^}]*stroke: var\(--ink\)/);
    expect(rule).toMatch(/\.calgrid \.hl-halo \{[^}]*stroke: var\(--paper\)/);
    expect(rule.toLowerCase()).not.toMatch(/red|#f00|#e00|#c00/);
  });
});
