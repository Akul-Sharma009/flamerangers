// Story 7.6: the season-to-date chart. Every figure is a served value (AD-8).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import metaJson from "../../../contract/fixture/meta.json";
import seasonJson from "../../../contract/fixture/season_to_date.json";
import { defaultArea as pickDefault } from "../area/featured";
import type { Meta } from "../api/client";
import { formatCount } from "../format";
import { composeFigure } from "../download/figure";
import { createSeasonToDateLoader, seasonToDateRequest, type SeasonToDate } from "./load";
import { layoutSeason, seasonRows, seasonWords } from "./model";
import { seasonPicture } from "./picture";
import { SeasonToDateSection } from "./SeasonToDateSection";

const season = seasonJson as unknown as SeasonToDate;
const meta = metaJson as unknown as Meta;
const defaultArea = pickDefault().aoi;
const nov = season.months[10]!;

describe("the chart (7.6 AC1)", () => {
  it("draws the year's curve, the median and the band, and states the percentiles", () => {
    const l = layoutSeason(season);
    expect(l.solid).not.toBeNull();
    expect(l.median).not.toBeNull();
    expect(l.band).not.toBeNull();
    const w = seasonWords(season);
    expect(w.usual).toContain("10th to the 90th percentile");
    expect(w.usual).toContain(`${season.past_years.length} complete years`);
  });

  it("starts at the served 0 on 1 January and marks the current month as to date", () => {
    const l = layoutSeason(season);
    expect(l.solid!.startsWith(`M${l.baseline.x1.toFixed(1)},${l.baseline.y.toFixed(1)}`)).toBe(true);
    expect(l.toDate).not.toBeNull();
    expect(l.dashed).not.toBeNull();
    expect(l.labels.find((x) => x.kind === "year")!.text).toBe(`${formatCount(nov.cumulative!)} to date`);
    expect(seasonWords(season).toDate).toContain("is to date");
  });

  it("labels the lines with served values only", () => {
    const texts = layoutSeason(season).labels.map((x) => x.text);
    const dec = season.months[11]!;
    expect(texts).toEqual(expect.arrayContaining([formatCount(dec.median!), formatCount(dec.band_high!), formatCount(dec.band_low!)]));
  });

  it("does not draw a curve for a year with no running total, and never draws zeros for it", () => {
    const none = { ...season, months: season.months.map((m) => ({ ...m, cumulative: null, to_date: false })) };
    const l = layoutSeason(none);
    expect(l.hasCurve).toBe(false);
    expect(l.solid).toBeNull();
    expect(l.labels.some((x) => x.kind === "year")).toBe(false);
  });

  it("leaves out the band and median when no past year is complete", () => {
    const l = layoutSeason({ ...season, past_years: [], months: season.months.map((m) => ({ ...m, median: null, band_low: null, band_high: null })) });
    expect(l.band).toBeNull();
    expect(l.median).toBeNull();
  });
});

describe("the table equivalent (7.6 AC2)", () => {
  it("has a row per month with the served figures; the to-date month is marked and a missing value is a dash", () => {
    const rows = seasonRows(season);
    expect(rows).toHaveLength(12);
    expect(rows[10]!.cumulative).toBe(`${formatCount(nov.cumulative!)} (to date)`);
    expect(rows[11]!.cumulative).toBe("–");
    expect(rows[0]!.median).toBe(formatCount(season.months[0]!.median!));
  });

  it("renders as a table with the percentiles in its headings", () => {
    const html = renderToStaticMarkup(<SeasonToDateSection meta={meta} aoi={defaultArea} areaName="Sumatra" loadSeason={async () => season} />);
    expect(html).toContain("Season to date");
    expect(html).toContain("Year");
  });
});

describe("exports (7.6 AC2)", () => {
  it("the picture carries the percentiles, the to-date note, the data-through date and the record version", () => {
    const fig = composeFigure({
      ...seasonPicture(season, "Sumatra"), chart: { markup: "<svg/>", width: 640, height: 330 },
      colors: { paper: "#fff", ink: "#000", muted: "#666", rule: "#ccc" }, fonts: { serif: "serif", sans: "sans-serif" },
    });
    const text = fig.svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("90th percentile");
    expect(text).toContain("is to date");
    expect(text).toContain(season.record_version);
  });
});

describe("the loader", () => {
  it("asks /season_to_date with the version, the area and the year, and gives null for a refusal", async () => {
    let seen: { url: string; body: unknown } | null = null;
    const ok = createSeasonToDateLoader("http://x", (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(init.body as string) };
      return { ok: true, json: async () => season };
    }) as unknown as typeof fetch);
    expect(await ok(meta, defaultArea, 2020)).toEqual(season);
    expect(seen).toEqual({ url: "http://x/season_to_date", body: seasonToDateRequest(meta, defaultArea, 2020) });
    const refused = createSeasonToDateLoader("http://x", (async () => ({ ok: false })) as unknown as typeof fetch);
    expect(await refused(meta, defaultArea, 2020)).toBeNull();
  });
});
