// Story 4.3: picture downloads. The picture carries the served values and the
// contract's words; the browser computes none of them (AD-8).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { messages } from "../api/messages";
import { defaultArea } from "../area/featured";
import { formatCount, formatDay } from "../format";
import type { Calendar, Meta } from "../grid/model";
import { CalendarView } from "../pages/CalendarPage";
import { calendarPicture, rulerPicture } from "./content";
import { composeFigure } from "./figure";
import { areaLabel, sourceLine } from "./words";

const calendar = calendarJson as unknown as Calendar;
const meta = metaJson as unknown as Meta;
const colors = { paper: "#f6f0e4", ink: "#111", muted: "#666", rule: "#ccc" };
const fonts = { serif: "Georgia, serif", sans: "Arial, sans-serif" };
const chart = { markup: '<svg width="700" height="300"><rect class="bg" width="10" height="10"/></svg>', width: 700, height: 300 };

function figure(measure: "count" | "anomaly" = "count") {
  const { content } = calendarPicture(calendar, meta, measure);
  return composeFigure({ ...content, chart, colors, fonts });
}

describe("the picture carries its provenance", () => {
  it("has title, area, dates, unit, legend, data-through, record version and source", () => {
    const svg = figure().svg;
    const text = svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("Hotspots per month");
    expect(text).toContain(calendar.aoi.name!);
    expect(text).toContain(`${formatDay(calendar.range.start)} to ${formatDay(calendar.range.end)}`);
    expect(text).toContain(calendar.unit_label);
    expect(text).toContain(`Data through ${formatDay(calendar.data_through)}`);
    expect(text).toContain(`Record version ${calendar.record_version}`);
    expect(text).toContain(sourceLine());
    expect(text).toContain(messages.notes.hotspot_definition);
  });

  it("draws one legend swatch per served colour break, labelled with the served bound", () => {
    const svg = figure().svg;
    const breaks = calendar.statistics.colour_breaks;
    expect((svg.match(/<rect x="\d+" y="[\d.]+" width="14"/g) ?? []).length).toBe(breaks.length);
    for (const b of breaks) expect(svg).toContain(`>${formatCount(b)}</text>`);
  });

  it("the anomaly picture is labelled by the anomaly classes", () => {
    const { content, filename } = calendarPicture(calendar, meta, "anomaly");
    expect(content.legend).toHaveLength(calendar.statistics.anomaly_breaks.length);
    expect(filename).toMatch(/anomaly$/);
  });

  it("says when the data is a placeholder", () => {
    const text = composeFigure({ ...calendarPicture(calendar, { ...meta, placeholder: true }, "count").content, chart, colors, fonts }).svg;
    expect(text).toContain(messages.notes.placeholder);
    const real = composeFigure({ ...calendarPicture(calendar, { ...meta, placeholder: false }, "count").content, chart, colors, fonts }).svg;
    expect(real).not.toContain(messages.notes.placeholder);
  });

  it("an unnamed area is shown by its coordinates, never left blank", () => {
    const geometry = { type: "Polygon" as const, coordinates: [[[100, -1], [101, -1], [101, 0.5], [100, 0.5], [100, -1]]] };
    expect(areaLabel(null, geometry)).toBe("Box -1° to 0.5° latitude, 100° to 101° longitude");
    const c = { ...calendar, aoi: { ...calendar.aoi, name: null } };
    expect(calendarPicture(c, meta, "count", geometry).content.details[0]).toContain("latitude");
  });

  it("the ruler picture carries the same provenance", () => {
    const { content } = rulerPicture(calendar, meta, "Same days");
    const text = composeFigure({ ...content, chart, colors, fonts }).svg.replace(/<[^>]+>/g, " ");
    expect(text).toContain("Same days");
    expect(text).toContain(`Record version ${calendar.record_version}`);
    expect(text).toContain(`Data through ${formatDay(calendar.data_through)}`);
  });

  it("escapes markup in served text", () => {
    const svg = composeFigure({ title: "a <b> & c", details: [], chart, notes: [], footer: [], colors, fonts }).svg;
    expect(svg).toContain("a &lt;b&gt; &amp; c");
  });

  it("embeds the chart unchanged, so its values are the screen's", () => {
    expect(figure().svg).toContain(chart.markup);
  });
});

describe("the controls", () => {
  it("the calendar and the ruler each offer PNG and SVG", () => {
    const html = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: null, result: { status: "ready", meta, calendar } }} onSelect={() => undefined} />,
    );
    expect(html).toContain("Download the calendar as a picture");
    expect(html).toContain("Download the ruler as a picture");
    expect(html.match(/<option [^>]*value="png"[^>]*>PNG<\/option>/g)).toHaveLength(2);
    expect(html.match(/<option [^>]*value="svg"[^>]*>SVG<\/option>/g)).toHaveLength(2);
  });

  it("no download appears for a refused area", () => {
    const html = renderToStaticMarkup(
      <CalendarView view={{ selected: defaultArea().aoi, range: null, result: { status: "problem", meta, code: "no_land" } }} onSelect={() => undefined} />,
    );
    expect(html).not.toContain("as a picture");
  });

  it("the wording says hotspots, never fires", () => {
    expect(sourceLine().toLowerCase()).not.toContain("fire,");
    expect(figure().svg.toLowerCase()).not.toMatch(/\bfires\b/);
  });
});
