// Story 3.7: the current-month card. One block per acceptance criterion.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import metaAfterCheckJson from "../../../contract/fixture/examples/meta_after_noaa20_check.json";
import { messages } from "../api/messages";
import type { AoiInput } from "../area/featured";
import { defaultArea } from "../area/featured";
import { formatCount } from "../format";
import { CalendarView } from "../pages/CalendarPage";
import { CurrentMonthCard } from "./CurrentMonthCard";
import { buildCard, type Calendar, type Meta } from "./model";
import { layoutRuler } from "./ruler";
import { contractSentences, fill, type Sentences } from "./words";

const meta = metaJson as unknown as Meta;
const metaAfterCheck = metaAfterCheckJson as unknown as Meta;
const fixture = calendarJson as unknown as Calendar;
const cm = fixture.current_month!;
const WIDE = 420; // the left column at a 1280 px window
const NARROW = 343; // a 375 px window less the page gutters

/** The wording suggested for contract 0.4.0 (DECISIONS.md, Story 3.7). Test input only. */
const PROPOSED: Sentences = {
  current_month: "So far this month: {count} hotspots, {ratio}× the {reference_start}–{reference_end} median for the same days of {month_name}.",
  current_month_count: "So far this month: {count} hotspots.",
  current_month_usual:
    "Usual = the {reference_start}–{reference_end} median for days 1 to {day} of {month_name}: {median} hotspots. This month differs by {difference}. Data through {data_through}.",
  cells_flagged: "{strong} of {total} one-degree cells are flagged strong and {marginal} marginal, a caution and not an alarm.",
  ruler_caption: "Days 1 to {day} of {month_name} in each year from {reference_start} to {reference_end}.",
  record_high: "The highest month on record here is {month}, with {count} hotspots.",
  noaa20_compared:
    "From {period_start} to {period_end}, converted NOAA-20 counts differed from converted Suomi NPP counts by {bias_pct}% overall, with a mean absolute difference of {mean_abs_difference} per one-degree cell-month.",
};

/** A copy of the fixture with the current month changed, as the service could serve it. */
function withCurrent(edit: Partial<NonNullable<Calendar["current_month"]>>): Calendar {
  const c = structuredClone(fixture);
  c.current_month = { ...c.current_month!, ...edit };
  return c;
}

/** Visible text of rendered markup: titles and tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<title>.*?<\/title>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const render = (calendar: Calendar, m: Meta = meta, sentences?: Sentences, width = WIDE) =>
  renderToStaticMarkup(<CurrentMonthCard calendar={calendar} meta={m} sentences={sentences} rulerWidth={width} />);

/** The value of the figure `key` in rendered markup, or null. */
function figure(html: string, key: string): string | null {
  const m = html.match(new RegExp(`data-figure="${key}"><dt>[^<]*</dt><dd>([^<]*)</dd>`));
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

describe("AC1: the card shows every served value of the current month", () => {
  const html = render(fixture, meta, {}); // contract 0.3.0: labelled figures

  it("count to date, median, ratio and difference are the served values", () => {
    expect(text(html)).toContain(`${formatCount(cm.count_to_date)} hotspots`);
    expect(figure(html, "median")).toBe(formatCount(cm.same_days_median));
    expect(figure(html, "ratio")).toBe(`${cm.ratio}×`);
    expect(figure(html, "difference")).toBe("−195.1"); // served -195.1
  });

  it("flagged 1° cells in each tier, of the served total", () => {
    expect(figure(html, "flagged")).toBe(`${cm.cells_flagged_strong} strong · ${cm.cells_flagged_marginal} marginal · of ${cm.cells_total}`);
    const flagged = withCurrent({ cells_flagged_strong: 3, cells_flagged_marginal: 7 });
    expect(figure(render(flagged, meta, {}), "flagged")).toBe("3 strong · 7 marginal · of 113");
  });

  it("the reference period, the same days, the data-through date and the feeding satellites", () => {
    expect(figure(html, "reference_period")).toBe("2003–2025");
    expect(figure(html, "same_days")).toBe(`1–${cm.day} November`);
    expect(figure(html, "data_through")).toBe("13 November 2026"); // served 2026-11-13
    expect(figure(html, "satellite")).toBe("Suomi NPP (VIIRS), 2 days; NOAA-20 (VIIRS), 11 days");
  });

  it("the NRT label is the contract's quality sentence; SP gets its own", () => {
    expect(text(html)).toContain(messages.labels.quality.NRT);
    const sp = text(render(withCurrent({ quality: "SP" }), meta, {}));
    expect(sp).toContain(messages.labels.quality.SP);
    expect(sp).not.toContain(messages.labels.quality.NRT);
  });

  it("states that the flags are provisional and that validation was on whole months only", () => {
    expect(text(html)).toContain(messages.notes.provisional);
    expect(text(html)).toContain(messages.notes.monthly_validation_only);
  });

  it("with contract sentences, the same served values are in the sentences", () => {
    const t = text(render(fixture, meta, PROPOSED));
    expect(t).toContain("Usual = the 2003–2025 median for days 1 to 13 of November: 456.4 hotspots. This month differs by −195.1. Data through 13 November 2026.");
    expect(t).toContain("0 of 113 one-degree cells are flagged strong and 0 marginal");
  });
});

describe("AC2: headline sentence, ruler and the highest month on record", () => {
  it("the ruler has one mark per served reference year, the median tick and this year's mark", () => {
    const html = render(fixture);
    const years = [...html.matchAll(/class="past"[^>]*data-year="(\d+)"/g)].map((m) => Number(m[1]));
    expect(years).toEqual(cm.same_days_by_year.map((p) => p.year));
    for (const p of cm.same_days_by_year) expect(html).toContain(`<title>${p.year}: ${formatCount(p.count)}</title>`);
    expect(html).toContain(`median ${formatCount(cm.same_days_median)}`);
    expect(html).toContain(`2026: ${formatCount(cm.count_to_date)}`);
    expect(html).toMatch(/class="current"/);
  });

  it("marks sit in the served order of their counts, inside the drawing, at both widths", () => {
    const card = buildCard(fixture, meta);
    if (card.kind !== "card") throw new Error("card expected");
    for (const width of [WIDE, NARROW]) {
      const l = layoutRuler(card.ruler, width);
      const byCount = [...card.ruler.past].sort((a, b) => a.count - b.count).map((p) => p.year);
      const byX = [...l.past].sort((a, b) => a.x - b.x).map((p) => p.year);
      expect(byX).toEqual(byCount);
      for (const x of [...l.past.map((p) => p.x), l.median!.x, l.current!.x]) {
        expect(x).toBeGreaterThanOrEqual(l.axis.x1);
        expect(x).toBeLessThanOrEqual(l.axis.x2);
      }
      // This year (261.3) is left of the median (456.4), as served.
      expect(l.current!.x).toBeLessThan(l.median!.x);
    }
  });

  it("a 0 count sits at the left end of the axis", () => {
    const card = buildCard(withCurrent({ count_to_date: 0 }), meta);
    if (card.kind !== "card") throw new Error("card expected");
    const l = layoutRuler(card.ruler, NARROW);
    expect(l.current!.x).toBe(l.axis.x1);
  });

  it("the ruler's table view holds every year's served count", () => {
    const t = text(render(fixture));
    for (const p of cm.same_days_by_year) expect(t).toContain(`${p.year} ${formatCount(p.count)}`);
  });

  it("the second sentence gives the served record high, from the rankings", () => {
    const high = fixture.statistics.record_high!;
    expect(figure(render(fixture, meta, {}), "record_high")).toBe(`September 2015: ${formatCount(high.count)} hotspots`);
    expect(text(render(fixture, meta, PROPOSED))).toContain("The highest month on record here is September 2015, with 26,763 hotspots.");
    const none = structuredClone(fixture);
    none.statistics.record_high = null;
    expect(render(none, meta, {})).not.toContain("record_high");
  });

  it("the card is placed under the locator and before the footnotes on the calendar page", () => {
    const selected: AoiInput = defaultArea().aoi;
    const html = renderToStaticMarkup(
      <CalendarView view={{ selected, range: null, result: { status: "ready", meta, calendar: fixture } }} onSelect={() => undefined} />,
    );
    const left = html.slice(html.indexOf('class="leftcol"'), html.indexOf('aria-label="Calendar"'));
    expect(left).toContain('class="reading"');
    expect(left.indexOf('class="reading"')).toBeLessThan(left.indexOf('class="notes"'));
  });
});

describe("AC3: the sentence is a contract template filled with served values", () => {
  it("reads like the criterion's example, using only served values", () => {
    const c = withCurrent({ count_to_date: 412, ratio: 2.3, same_days_median: 179.1, difference: 232.9 });
    const html = render(c, meta, PROPOSED);
    expect(html).toContain("<h1 class=\"sentence\">So far this month: 412 hotspots, 2.3× the 2003–2025 median for the same days of November.</h1>");
  });

  it("contract 0.3.0 has no card sentence, so the web types none: the headline is the served count", () => {
    expect(contractSentences()).toEqual({});
    const html = render(fixture);
    expect(html).toMatch(/<h1 class="sentence figurehead"><span class="n">261.3<\/span> hotspots<\/h1>/);
    expect(text(html)).not.toMatch(/So far this month/);
  });

  it("a template whose value is missing or null is not filled", () => {
    expect(fill("{count} hotspots", { count: "12" })).toBe("12 hotspots");
    expect(fill("{count} hotspots", { count: null })).toBeNull();
    expect(fill("{unknown} hotspots", { count: "12" })).toBeNull();
    expect(fill(undefined, { count: "12" })).toBeNull();
  });

  it("every number in the card is a served value", () => {
    const served = new Set<string>([
      ...cm.same_days_by_year.flatMap((p) => [String(p.year), formatCount(p.count)]),
      formatCount(cm.count_to_date), formatCount(cm.same_days_median), String(cm.ratio), "195.1",
      String(cm.day), "2026", "13", "2003", "2025", "2015", formatCount(fixture.statistics.record_high!.count),
      String(cm.cells_flagged_strong), String(cm.cells_flagged_marginal), String(cm.cells_total),
      "2", "11", // the served day counts of the feeding satellites
      "1", // the first day of "days 1 to d" and the "1°" cell size
    ]);
    for (const s of [{}, PROPOSED]) {
      // Numbers inside the contract's own words (for example "NOAA-20") are the contract's.
      let t = text(render(fixture, meta, s));
      for (const w of [...Object.values(messages.labels.satellite), ...Object.values(messages.notes), ...Object.values(messages.labels.quality)]) {
        t = t.split(w).join(" ");
      }
      const nums = t.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
      for (const n of nums) expect(served, `${n} is not served`).toContain(n);
    }
  });
});

describe("AC4: a median of 0 shows the count and no typical activity, with no ratio", () => {
  const quiet = withCurrent({ count_to_date: 3, same_days_median: 0, no_typical_activity: true, ratio: null, difference: 3 });

  it("shows the count and the contract's sentence, and no ratio at all", () => {
    for (const s of [{}, PROPOSED]) {
      const html = render(quiet, meta, s);
      const t = text(html);
      expect(t).toContain(messages.notes.no_typical_activity);
      expect(t).toContain("3 hotspots");
      expect(t).not.toContain("×");
      expect(figure(html, "ratio")).toBeNull();
    }
    expect(render(quiet, meta, PROPOSED)).toContain("<h1 class=\"sentence\">So far this month: 3 hotspots.</h1>");
  });

  it("the served median of 0 is shown as 0, not as missing", () => {
    expect(figure(render(quiet, meta, {}), "median")).toBe("0");
  });

  it("a current month outside coverage is 'not loaded', never a card of zeros", () => {
    const none = structuredClone(fixture);
    none.current_month = null;
    const t = text(render(none, meta, PROPOSED));
    expect(t).toContain(messages.labels.null_reason.outside_coverage);
    expect(t).toContain("November 2026");
    expect(t).not.toMatch(/\b0\b/);
    expect(t).not.toContain("hotspots");
  });

  it("a null count or median (should the service send one) shows a dash, never 0", () => {
    const nulls = withCurrent({ count_to_date: null as unknown as number, same_days_median: null as unknown as number, ratio: null, difference: null as unknown as number });
    const html = render(nulls, meta, PROPOSED);
    expect(html).toContain('<span class="n">–</span>'); // the sentence cannot be filled
    expect(figure(html, "median")).toBe("–");
    expect(figure(html, "ratio")).toBe("–");
    expect(html).not.toMatch(/class="current"/);
    expect(html).not.toContain("median 0");
  });
});

describe("AC5: a current month fed by NOAA-20", () => {
  it("says the satellite was not part of the validation", () => {
    expect(cm.validated_satellite).toBe(false);
    expect(text(render(fixture))).toContain(messages.notes.validated_satellite_false);
  });

  it("before Story 2.10 has run, says the comparison has not been run", () => {
    expect(meta.noaa20_check).toBeNull();
    expect(text(render(fixture))).toContain(messages.notes.noaa20_check_not_run);
  });

  it("once served, gives the comparison from the served figures, labelled reported only", () => {
    const html = render(fixture, metaAfterCheck, {});
    const t = text(html);
    expect(t).toContain(messages.notes.noaa20_check);
    expect(messages.notes.noaa20_check.startsWith("Reported only.")).toBe(true);
    expect(figure(html, "noaa20_period")).toBe("January 2022 to October 2026");
    expect(figure(html, "noaa20_bias")).toBe("−2.6%");
    expect(figure(html, "noaa20_mad")).toBe("2.8");
    expect(figure(html, "noaa20_n")).toBe("3,758");
    expect(text(render(fixture, metaAfterCheck, PROPOSED))).toContain(
      "From January 2022 to October 2026, converted NOAA-20 counts differed from converted Suomi NPP counts by −2.6% overall",
    );
  });

  it("a validated satellite gets none of these lines", () => {
    const t = text(render(withCurrent({ validated_satellite: true }), metaAfterCheck));
    expect(t).not.toContain(messages.notes.validated_satellite_false);
    expect(t).not.toContain(messages.notes.noaa20_check);
    expect(t).not.toContain(messages.notes.noaa20_check_not_run);
  });
});
