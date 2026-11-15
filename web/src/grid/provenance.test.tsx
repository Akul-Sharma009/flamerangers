// Story 3.6: provenance and evidence caveats on every calendar cell.
// AC1 to AC3 and the "markers do not dominate" criterion; the region caveat
// (AC4 to AC6) is tested in src/provenance/caveat.test.tsx.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { messages } from "../api/messages";
import { CalendarGrid } from "./CalendarGrid";
import { GridLegend } from "./GridLegend";
import { asSentence, buildGridModel, completeNote, detailAt, qualityTag, satelliteSwitchMonth, type Calendar, type Meta } from "./model";

const meta = metaJson as unknown as Meta;
const fixture = calendarJson as unknown as Calendar;
const WIDE = 795;
const NARROW = 343;
type Month = Calendar["months"][number];

function withMonths(edit: Record<string, Partial<Month>>): Calendar {
  const c = structuredClone(fixture);
  c.months = c.months.map((m) => (edit[m.month] ? { ...m, ...edit[m.month] } : m));
  return c;
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function cellTag(html: string, ym: string): string {
  const m = html.match(new RegExp(`<g[^>]*data-month="${ym}"[^>]*>`));
  if (!m) throw new Error(`no cell ${ym}`);
  return m[0];
}

function cellMarkup(html: string, ym: string): string {
  const start = html.indexOf(cellTag(html, ym));
  return html.slice(start, html.indexOf("</g>", start));
}

/** The aria-label of a month's cell, decoded. */
function label(html: string, ym: string): string {
  return text(cellTag(html, ym).match(/aria-label="([^"]*)"/)![1]);
}

const grid = (c: Calendar, width = WIDE, extra = {}) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={width} {...extra} />);
const table = (c: Calendar) =>
  renderToStaticMarkup(<CalendarGrid calendar={c} meta={meta} width={WIDE} initialView="table" />);

function linesFor(c: Calendar, ym: string): string[] {
  const model = buildGridModel(c, meta);
  const r = model.rows.findIndex((row) => row.year === Number(ym.slice(0, 4)));
  return detailAt(model, { r, c: Number(ym.slice(5)) - 1 })!;
}

const notes = messages.notes as unknown as Record<string, string | undefined>;
// Restore the contract's own value (0.4.0 has one) rather than deleting it,
// so later tests render with the real messages.
const contractMonthComplete = notes.month_complete;
afterEach(() => {
  if (contractMonthComplete === undefined) delete notes.month_complete;
  else notes.month_complete = contractMonthComplete;
});

describe("Story 3.6 AC1: focusing any cell reads every input satellite, standard or NRT, and complete or partial", () => {
  const html = grid(fixture);

  it("names every feeding input of every month with its own quality and served days, in the cell's accessible name", () => {
    for (const m of fixture.months) {
      const name = label(html, m.month);
      for (const i of m.inputs.filter((x) => x.feeds_record)) {
        expect(name).toContain(`${messages.labels.satellite[i.satellite]}, ${i.days} ${i.days === 1 ? "day" : "days"}, ${qualityTag(i.quality)}`);
      }
      if (m.count === null) expect(name).toContain(messages.labels.null_reason[m.null_reason!]);
    }
  });

  it("takes the quality words from the contract's quality labels", () => {
    expect(qualityTag("SP")).toBe("standard quality");
    expect(qualityTag("NRT")).toBe("near real time");
    expect(messages.labels.quality.SP.toLowerCase()).toContain(qualityTag("SP"));
    expect(messages.labels.quality.NRT.toLowerCase()).toContain(qualityTag("NRT"));
  });

  it("gives each satellite and quality of a mixed month its own entry, and the NRT sentence once", () => {
    const mixed = withMonths({
      "2026-09": {
        inputs: [
          { satellite: "SNPP", quality: "SP", days: 20, feeds_record: true },
          { satellite: "SNPP", quality: "NRT", days: 10, feeds_record: true },
          { satellite: "NOAA21", quality: "NRT", days: 30, feeds_record: false },
        ],
      },
    });
    const lines = linesFor(mixed, "2026-09");
    const from = lines.find((l) => l.startsWith("From "))!;
    expect(from).toBe("From Suomi NPP (VIIRS), 20 days, standard quality; Suomi NPP (VIIRS), 10 days, near real time");
    expect(from).not.toContain(messages.labels.satellite.NOAA21); // does not feed the record
    expect(lines.filter((l) => l === messages.labels.quality.NRT)).toHaveLength(1);
  });

  it("states every partial reason; contract 0.4.0 has a sentence for a complete month", () => {
    for (const m of fixture.months.filter((x) => x.count !== null)) {
      const lines = linesFor(fixture, m.month);
      for (const p of m.partial_reasons) expect(lines).toContain(messages.labels.partial_reason[p]);
    }
    expect(completeNote()).toBe(messages.notes.month_complete);
    const done = linesFor(fixture, "2015-09");
    // Story 3.8 appends the month's flag lines after the flag label; the provenance lines before them are unchanged.
    const want = [messages.labels.source.aqua_real, "From Aqua (MODIS), 30 days, standard quality", messages.notes.month_complete, messages.labels.flag_state.strong];
    expect(done.filter((l) => want.includes(l))).toEqual(want); // in this order; 0.4.0 adds the complete-month sentence
  });

  it("says a month is complete once the contract adds notes.month_complete, and only for complete months", () => {
    notes.month_complete = "Complete month.";
    for (const m of fixture.months) {
      const lines = linesFor(fixture, m.month);
      expect(lines.includes("Complete month.")).toBe(m.count !== null && m.complete);
    }
  });

  it("shows the same lines in the card of the cell the keyboard focuses", () => {
    const model = buildGridModel(fixture, meta);
    const r = model.rows.findIndex((row) => row.year === 2026);
    const shown = grid(fixture, WIDE, { initialActive: { r, c: 10 } });
    const card = text(shown.slice(shown.indexOf('class="cellcard"')));
    for (const l of detailAt(model, { r, c: 10 })!) expect(card).toContain(l);
    expect(card).toContain("Suomi NPP (VIIRS), 2 days, near real time; NOAA-20 (VIIRS), 11 days, near real time");
    expect(label(shown, "2026-11")).toBe(text(asSentence(detailAt(model, { r, c: 10 })!)));
  });
});

describe("Story 3.6 AC2: a month fed by NOAA-20 is labelled, and the 2 November 2026 change is marked", () => {
  const html = grid(fixture);

  it("labels every counted month whose served validated_satellite is false, and no other", () => {
    for (const m of fixture.months) {
      const lines = linesFor(fixture, m.month);
      expect(lines.includes(messages.notes.validated_satellite_false)).toBe(m.count !== null && !m.validated_satellite);
    }
    expect(label(html, "2026-11")).toContain(messages.notes.validated_satellite_false);
    expect(label(html, "2026-10")).not.toContain(messages.notes.validated_satellite_false);
  });

  it("labels a later NOAA-20 month too, from the served field, without the switch mark", () => {
    const later = withMonths({
      "2026-12": {
        count: 12.5, null_reason: null, source: "viirs_converted", colour_class: 1, validated_satellite: false, complete: true,
        inputs: [{ satellite: "NOAA20", quality: "SP", days: 31, feeds_record: true }],
      },
    });
    expect(linesFor(later, "2026-12")).toContain(messages.notes.validated_satellite_false);
    expect(cellMarkup(grid(later), "2026-12")).not.toContain("satswitch");
  });

  it("marks the served switch month on the grid, in the table and in the legend, at both widths", () => {
    expect(satelliteSwitchMonth(meta)).toBe("2026-11");
    for (const h of [html, grid(fixture, NARROW)]) {
      expect(cellTag(h, "2026-11")).toContain('data-satswitch="true"');
      expect(cellMarkup(h, "2026-11")).toContain('class="satswitch"');
    }
    expect(label(html, "2026-11")).toContain(messages.notes.satellite_switch);
    expect(table(fixture)).toMatch(/<td class="count mtd satswitch"[^>]*data-month="2026-11"/);
    const legend = renderToStaticMarkup(<GridLegend calendar={fixture} />);
    expect(text(legend)).toContain(messages.notes.satellite_switch);
  });

  it("follows the served switch date, not a typed one", () => {
    const moved = { ...meta, satellite_switch: { snpp_through: "2026-09-30", noaa20_from: "2026-10-01" } };
    const h = renderToStaticMarkup(<CalendarGrid calendar={fixture} meta={moved} width={WIDE} />);
    expect(cellTag(h, "2026-10")).toContain('data-satswitch="true"');
    expect(cellTag(h, "2026-11")).not.toContain("data-satswitch");
  });
});

describe("Story 3.6 AC3: a month from 2022 onward is labelled as outside the years used for the pick", () => {
  it("labels every converted month, and no Aqua month", () => {
    for (const m of fixture.months) {
      const lines = linesFor(fixture, m.month);
      expect(lines.includes(messages.notes.after_pick_years)).toBe(m.source === "viirs_converted");
    }
    const html = grid(fixture);
    expect(label(html, "2022-01")).toContain(messages.notes.after_pick_years);
    expect(label(html, "2021-12")).not.toContain(messages.notes.after_pick_years);
    expect(label(html, "2026-11")).toContain(messages.notes.after_pick_years);
  });

  it("puts the label in the table view's cell too", () => {
    expect(table(fixture)).toMatch(new RegExp(`data-month="2024-03"[^>]*aria-label="[^"]*${messages.notes.after_pick_years.replace(/\./g, "\\.")}`));
  });
});

describe("Story 3.6: the markers do not dominate the calendar's pattern", () => {
  const html = grid(fixture);

  it("adds one drawn mark to the whole grid: the satellite switch, on one month", () => {
    expect([...html.matchAll(/class="satswitch"/g)]).toHaveLength(1);
  });

  it("draws nothing for the validation and pick labels: they are words in the card and the accessible name", () => {
    // A converted, validated, complete month draws exactly what Story 3.5 drew: the tint and the count.
    const may = cellMarkup(html, "2024-05");
    expect([...may.matchAll(/<(rect|path|circle|line|text)\b/g)].map((m) => m[1])).toEqual(["rect", "text"]);
    expect(cellTag(html, "2024-05")).not.toMatch(/data-(satswitch|marks)/);
  });

  it("keeps the region caveat off the calendar cells", () => {
    const untuned = structuredClone(fixture);
    untuned.aoi = { ...untuned.aoi, region_caveat: "untuned_region" };
    expect(grid(untuned)).toBe(html);
  });
});
