// Story 3.5: the burning activity calendar. One block per acceptance criterion.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { messages } from "../api/messages";
import { formatCount } from "../format";
import { CalendarGrid } from "./CalendarGrid";
import { GridLegend } from "./GridLegend";
import { layoutGrid, move } from "./layout";
import { MARKS, buildGridModel, detailAt, qualityTag, type Calendar, type Meta } from "./model";

const meta = metaJson as unknown as Meta;
const fixture = calendarJson as unknown as Calendar;
const WIDE = 795; // the grid column at a 1280 px window
const NARROW = 343; // a 375 px window less the page gutters

type Month = Calendar["months"][number];

/** A copy of the fixture with some months changed, as the service could serve them. */
function withMonths(edit: Record<string, Partial<Month>>): Calendar {
  const c = structuredClone(fixture);
  c.months = c.months.map((m) => (edit[m.month] ? { ...m, ...edit[m.month] } : m));
  return c;
}

/** Visible text of rendered markup: tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<title>.*?<\/title>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** The opening tag of the element carrying data-month="ym". */
function cellTag(html: string, ym: string): string {
  const m = html.match(new RegExp(`<g[^>]*data-month="${ym}"[^>]*>`));
  if (!m) throw new Error(`no cell ${ym}`);
  return m[0];
}

/** Everything from a cell's opening tag to its closing </g> (cells hold no nested <g>). */
function cellMarkup(html: string, ym: string): string {
  const start = html.indexOf(cellTag(html, ym));
  return html.slice(start, html.indexOf("</g>", start));
}

const grid = (c: Calendar, width = WIDE, extra = {}) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={width} {...extra} />);
const table = (c: Calendar) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={WIDE} initialView="table" />);

describe("AC1: years by months on one ramp, with breaks and unit in the legend", () => {
  const html = grid(fixture);
  const model = buildGridModel(fixture, meta);

  it("draws rows newest first and January to December", () => {
    const years = [...html.matchAll(/data-year="(\d{4})"/g)].map((m) => Number(m[1]));
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(2002);
    expect(years).toHaveLength(25);
    for (const r of model.rows) expect(r.cells.map((c) => c.month.slice(5))).toEqual(
      ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
    );
  });

  it("colours every counted month by its served colour_class", () => {
    for (const m of fixture.months) {
      const tag = cellTag(html, m.month);
      if (m.count === null) expect(tag).toContain('class="cell nullcell"');
      else expect(tag).toContain(`class="cell k${m.colour_class}"`);
    }
  });

  it("puts every served class break and the served unit label in the legend", () => {
    const legend = text(renderToStaticMarkup(<GridLegend calendar={fixture} />));
    expect(legend).toContain(fixture.unit_label);
    for (const b of fixture.statistics.colour_breaks) expect(legend).toContain(formatCount(b));
    expect(model.classes).toHaveLength(fixture.statistics.colour_breaks.length);
  });
});

describe("AC2: one scale across the record switch, marked and explained", () => {
  it("gives the same count the same colour on both sides of the switch", () => {
    // The service sets colour_class from the count alone; equal counts get equal classes.
    const c = withMonths({
      "2021-12": { count: 1500, colour_class: 2 },
      "2022-01": { count: 1500, colour_class: 2 },
    });
    const html = grid(c);
    expect(cellTag(html, "2021-12")).toContain('class="cell k2"');
    expect(cellTag(html, "2022-01")).toContain('class="cell k2"');
  });

  it("styles a cell by its class only, never by its source", () => {
    const html = grid(fixture);
    for (const m of fixture.months) {
      const cls = cellTag(html, m.month).match(/class="([^"]+)"/)![1];
      expect(cls).toBe(m.count === null ? "cell nullcell" : `cell k${m.colour_class}`);
    }
  });

  it("draws the rule between the 2021 and 2022 rows, from meta.record_switch", () => {
    const model = buildGridModel(fixture, meta);
    const L = layoutGrid(model, WIDE);
    const i22 = model.rows.findIndex((r) => r.year === 2022);
    const i21 = model.rows.findIndex((r) => r.year === 2021);
    expect(i21).toBe(i22 + 1);
    expect(L.rule).not.toBeNull();
    expect(L.rule!.y).toBeGreaterThan(L.rowYs[i22] + L.rowH);
    expect(L.rule!.y).toBeLessThan(L.rowYs[i21]);
    const html = grid(fixture);
    expect(html).toContain('class="switch-rule"');
  });

  it("explains the switch in the grid and in the legend", () => {
    expect(text(grid(fixture))).toContain(messages.notes.record_switch.slice(0, 40));
    expect(text(renderToStaticMarkup(<GridLegend calendar={fixture} />))).toContain(messages.notes.record_switch);
  });
});

describe("AC3: outside the record, zero, NRT and partial months", () => {
  const c = withMonths({
    "2010-03": { partial_reasons: ["range_cut"], complete: true }, // a range starting 15 March 2010
    "2011-02": { count: 0, colour_class: 0, rank: null }, // a zero month
  });
  const html = grid(c);

  it("draws outside the record hatched and zero as a filled 0", () => {
    const out = cellMarkup(html, "2002-03");
    expect(out).toContain('data-state="outside_record"');
    expect(out).toContain("url(#hatch-record)");
    const zero = cellMarkup(html, "2011-02");
    expect(zero).toContain('data-state="count"');
    expect(zero).toContain('class="cell k0"');
    expect(text(zero).trim()).toBe("0");
    expect(zero).not.toContain("hatch");
  });

  it("keeps the two apart in the table view too", () => {
    const t = table(c);
    expect(t).toMatch(/<td class="null outside_record"[^>]*data-month="2002-03"[^>]*>–<\/td>/);
    expect(t).toMatch(/<td class="count"[^>]*data-month="2011-02"[^>]*>0<\/td>/);
  });

  it("marks NRT months with a text mark, not colour alone", () => {
    for (const m of fixture.months) {
      const nrt = m.inputs.some((i) => i.feeds_record && i.quality === "NRT");
      const marks = cellTag(html, m.month).match(/data-marks="([^"]*)"/)?.[1] ?? "";
      expect(marks.includes(MARKS.nrt)).toBe(nrt);
    }
    expect(cellMarkup(html, "2026-09")).toMatch(new RegExp(`class="marks"[^>]*>${MARKS.nrt}<`));
  });

  it("marks partial months: missing days and record start with *, month to date with a dashed outline", () => {
    expect(cellTag(html, "2022-08")).toContain(`data-marks="${MARKS.incomplete}"`);
    expect(cellTag(html, "2002-07")).toContain(`data-marks="${MARKS.incomplete}"`);
    expect(cellMarkup(html, "2026-11")).toContain('class="mtd"');
  });

  it("labels months the range cuts as cut, and still shows the whole-month count", () => {
    const cut = cellMarkup(html, "2010-03");
    expect(cellTag(html, "2010-03")).toContain(`data-marks="${MARKS.cut}"`);
    expect(text(cut)).toContain(formatCount(c.months.find((m) => m.month === "2010-03")!.count!));
    expect(cellTag(html, "2026-11")).toContain(`data-marks="${MARKS.nrt}${MARKS.cut}"`);
    expect(table(c)).toMatch(new RegExp(`data-month="2010-03"[^>]*>[^<]*<sup class="marks">${MARKS.cut}</sup>`));
  });

  it("explains every mark in the legend with the contract's sentences", () => {
    const legend = text(renderToStaticMarkup(<GridLegend calendar={fixture} />));
    for (const s of [
      messages.labels.null_reason.outside_record,
      messages.labels.null_reason.outside_coverage,
      messages.labels.quality.NRT,
      messages.labels.partial_reason.data_through,
      messages.labels.partial_reason.record_start,
      messages.labels.partial_reason.missing_days,
      messages.labels.partial_reason.range_cut,
    ]) expect(legend).toContain(s);
  });

  it("draws the marks at 375 px too, where cells show tint only", () => {
    const narrow = grid(c, NARROW);
    expect(cellMarkup(narrow, "2026-09")).toMatch(new RegExp(`class="marks"[^>]*>${MARKS.nrt}<`));
    expect(cellMarkup(narrow, "2010-03")).toMatch(new RegExp(`class="marks"[^>]*>${MARKS.cut}<`));
    expect(cellMarkup(narrow, "2002-03")).toContain("url(#hatch-record)");
  });
});

describe("AC4: hover, focus or tap shows the exact count and provenance; a table holds the same data", () => {
  const model = buildGridModel(fixture, meta);
  const html = grid(fixture);

  it("gives every month a detail with its exact served count, source, inputs and partial reasons", () => {
    for (const m of fixture.months) {
      const r = model.rows.findIndex((row) => row.year === Number(m.month.slice(0, 4)));
      const lines = detailAt(model, { r, c: Number(m.month.slice(5)) - 1 })!;
      if (m.count === null) {
        expect(lines[1]).toBe(messages.labels.null_reason[m.null_reason!]);
        continue;
      }
      expect(lines[1]).toBe(`${formatCount(m.count)} ${fixture.unit_label}`);
      expect(lines).toContain(messages.labels.source[m.source!]);
      // Story 3.6 lists each feeding input with its own quality; the NRT sentence follows once.
      for (const i of m.inputs.filter((x) => x.feeds_record)) {
        expect(lines.join(" ")).toContain(`${messages.labels.satellite[i.satellite]}, ${i.days} days, ${qualityTag(i.quality)}`);
        if (i.quality === "NRT") expect(lines).toContain(messages.labels.quality.NRT);
      }
      for (const p of m.partial_reasons) expect(lines).toContain(messages.labels.partial_reason[p]);
    }
  });

  it("makes every month, total and median focusable, with the detail as its accessible name", () => {
    const cells = [...html.matchAll(/role="gridcell"/g)].length;
    expect(cells).toBe(fixture.months.length + fixture.year_totals.length + 12);
    expect([...html.matchAll(/tabindex="0"/g)]).toHaveLength(1); // one tab stop, arrows inside
    expect(cellTag(html, "2015-09")).toContain(`aria-label="September 2015. ${formatCount(26763)} ${fixture.unit_label}.`);
  });

  it("shows the card for the focused or tapped cell", () => {
    const r = model.rows.findIndex((row) => row.year === 2026);
    const shown = grid(fixture, WIDE, { initialActive: { r, c: 10 } });
    const card = shown.slice(shown.indexOf('class="cellcard"'));
    expect(text(card)).toContain("November 2026");
    expect(text(card)).toContain(`261.3 ${fixture.unit_label}`);
    expect(text(card)).toContain(messages.labels.quality.NRT);
    expect(text(card)).toContain(messages.labels.partial_reason.range_cut);
    expect(shown).toContain('class="ring"');
  });

  it("moves with the arrow keys between months, totals and medians", () => {
    const n = model.rows.length;
    expect(move({ r: 0, c: 0 }, "ArrowRight", n)).toEqual({ r: 0, c: 1 });
    expect(move({ r: 0, c: 0 }, "ArrowUp", n)).toEqual({ r: 0, c: 0 });
    expect(move({ r: 0, c: 11 }, "ArrowRight", n)).toEqual({ r: 0, c: 12 }); // the year total
    expect(move({ r: n - 1, c: 12 }, "ArrowDown", n)).toEqual({ r: n, c: 11 }); // medians have no total
    expect(move({ r: 3, c: 4 }, "End", n)).toEqual({ r: 3, c: 12 });
    expect(move({ r: 3, c: 4 }, "Tab", n)).toBeNull();
  });

  it("has the same values and marks in the table view", () => {
    const t = table(fixture);
    for (const r of model.rows) {
      for (const c of r.cells) {
        const td = t.match(new RegExp(`<td[^>]*data-month="${c.month}"[^>]*>(.*?)</td>`))![1];
        expect(text(td).replace(/[◤○]/g, "").replace(/\s/g, "")).toBe(`${c.label}${c.marks}`);
      }
      expect(t).toContain(`<th scope="row">${r.year}</th>`);
    }
    expect(text(t)).toContain(messages.notes.record_switch);
  });
});

describe("AC5: year totals end each row, medians foot each column, every number served", () => {
  it("ends each row with its served total and foots each column with its served median", () => {
    for (const width of [WIDE, NARROW]) {
      const model = buildGridModel(fixture, meta);
      const html = grid(fixture, width);
      for (const t of fixture.year_totals) {
        const r = model.rows.find((x) => x.year === t.year)!;
        expect(r.total!.label).toBe(t.total === null ? "–" : formatCount(t.total));
        expect(html).toContain(`>${r.total!.label}</text>`);
      }
      fixture.calendar_month_medians.forEach((e) => {
        expect(html).toContain(`>${e.median === null ? "–" : formatCount(e.median)}</text>`);
      });
    }
  });

  it("shows a median of 0 as 0, not as missing", () => {
    const c = structuredClone(fixture);
    c.calendar_month_medians[0] = { ...c.calendar_month_medians[0], median: 0, no_typical_activity: true };
    const model = buildGridModel(c, meta);
    expect(model.medians[0].label).toBe("0");
    expect(model.medians[0].detail).toContain(messages.notes.no_typical_activity);
  });

  it("puts on screen only numbers the service served (AD-8)", () => {
    const served = new Set<string>();
    const add = (v: number | null | undefined) => { if (v !== null && v !== undefined) served.add(formatCount(v)); };
    for (const m of fixture.months) add(m.count);
    for (const t of fixture.year_totals) { add(t.total); served.add(String(t.year)); }
    for (const e of fixture.calendar_month_medians) add(e.median);
    for (const b of fixture.statistics.colour_breaks) add(b);
    for (const t of fixture.statistics.top_years) served.add(String(t.rank));
    served.add(String(fixture.reference_period.start_year));
    served.add(String(fixture.reference_period.end_year));
    // Numbers inside contract sentences ("December 2021", "1.5 times") are the contract's words.
    const words = [...Object.values(messages.notes), ...Object.values(messages.labels).flatMap((t) => Object.values(t))];
    for (const s of words) for (const d of s.match(/\d[\d,.]*\d|\d/g) ?? []) served.add(d);

    const screens = [
      grid(fixture, WIDE), grid(fixture, NARROW), table(fixture),
      renderToStaticMarkup(<GridLegend calendar={fixture} />),
    ];
    for (const html of screens) {
      for (const tok of text(html).match(/\d[\d,.]*\d|\d/g) ?? []) expect(served, tok).toContain(tok);
    }
  });
});

describe("AC6: layout follows UI-CONCEPT.md", () => {
  it("rings the top five years, keeps a hollow bar for incomplete years, and has no red", () => {
    const html = grid(fixture);
    expect([...html.matchAll(/class="rank"/g)]).toHaveLength(fixture.statistics.top_years.length);
    expect(html).toContain('class="tot-bar hollow"');
    expect(html.toLowerCase()).not.toMatch(/\bred\b|#f00|#ff0000/);
  });
});
