// Stories 7.3/7.4: the seasonal profile chart, its table equivalent and its words, from the served fixture.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import seasonJson from "../../../contract/fixture/season.json";
import { createClient } from "../api/client";
import { messages } from "../api/messages";
import { defaultArea } from "../area/featured";
import { MONTH_NAMES, formatCount } from "../format";
import { monthList, seasonSentence, tableRows, yearHasGaps, yearsOf, type Season } from "./model";
import { SeasonChart } from "./SeasonChart";
import { SeasonReady } from "./SeasonPanel";

const season = seasonJson as unknown as Season;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("7.4 words", () => {
  it("names the served peak month and season length", () => {
    expect(seasonSentence(season)).toBe(
      "Peak month: September. Season: 4 months (July, August, September and October), each with at least 10% of the year's hotspots.");
    expect(monthList([3])).toBe("March");
  });
  it("says so when there is no typical activity", () => {
    const none = { ...season, typical: { ...season.typical, peak_month: null, season_length: null, season_months: [] } };
    expect(seasonSentence(none)).toMatch(/no typical activity/);
  });
});

describe("7.4 chart", () => {
  const html = (year: number | null) => renderToStaticMarkup(<SeasonChart season={season} year={year} label="x" />);
  it("marks the peak and shades each season month", () => {
    const h = html(null);
    expect(h).toContain("Peak: September");
    expect((h.match(/class="season"/g) ?? []).length).toBe(season.typical.season_length);
    expect(h).not.toContain("yearline");
  });
  it("overlays a selected year, with a gap and not a zero for months the record lacks", () => {
    const h = html(2002); // the record starts in July 2002
    expect(h).toContain("yearline");
    const d = h.match(/class="yearline" d="([^"]+)"/)![1]!;
    expect(d.startsWith("M")).toBe(true);
    expect((d.match(/M/g) ?? []).length).toBe(1);
    expect((d.match(/[ML]/g) ?? []).length).toBe(6); // July to December only
  });
});

describe("7.4 table equivalent", () => {
  it("has a row per calendar month with the served median and range, and marks peak and season", () => {
    const rows = tableRows(season, null);
    expect(rows).toHaveLength(12);
    const sep = rows[8]!;
    const m = season.typical.months[8]!;
    expect([sep.month, sep.median, sep.low, sep.high, sep.flags]).toEqual(
      ["September", formatCount(m.median!), formatCount(m.low!), formatCount(m.high!), "Peak, In season"]);
    expect(rows[0]!.flags).toBe("");
  });
  it("shows the selected year's counts and a dash, not zero, for a month the record lacks", () => {
    const rows = tableRows(season, 2002);
    expect(rows[0]!.year).toBe("–");
    expect(rows[6]!.year).toBe(formatCount(season.years.find((y) => y.year === 2002)!.counts[6]!));
    expect(yearHasGaps(season, 2002)).toBe(true);
    expect(yearHasGaps(season, 2010)).toBe(false);
    expect(yearsOf(season)[0]).toBe(2002);
  });
  it("renders in the panel with the contract words, the year column and the download", () => {
    const h = renderToStaticMarkup(<SeasonReady season={season} aoi={defaultArea().aoi} year={2002} onYear={() => undefined} />);
    const t = text(h);
    expect(t).toContain(messages.notes.season_definition);
    expect(t).toContain(messages.notes.season_year_partial);
    expect(h).toContain('<th scope="col">2002</th>');
    expect(t).toContain("Download seasonal profile");
    for (const n of MONTH_NAMES) expect(t).toContain(n);
    expect(t).not.toMatch(/\bfires?\b/i);
  });
});

describe("7.4 service", () => {
  it("the fixture client answers /season, and a stale version is refused", async () => {
    const c = createClient(null);
    const meta = await c.getMeta();
    const s = await c.postSeason!({ record_version: meta.record_version, aoi: calendarJson.aoi as never });
    expect(s.typical.peak_month).toBe(9);
    await expect(c.postSeason!({ record_version: "stale", aoi: {} as never })).rejects.toThrow();
  });
});
