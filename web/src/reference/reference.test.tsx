// Story 8.4: the reference period control, the request it sends and the link that carries it.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { rangeRequest, type Calendar, type Meta, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { defaultArea, featuredAreas } from "../area/featured";
import { loadArea } from "../area/load";
import { downloadCsv } from "../download/csv";
import { CalendarView } from "../pages/CalendarPage";
import { currentQuery, encodeShare, parseShare, referenceNote } from "../share";
import { choosableYears, isDefault, usable, withReference } from "./period";
import { ReferencePeriodControl } from "./ReferencePeriodControl";

const meta = metaJson as unknown as Meta;
const calendar = calendarJson as unknown as Calendar;
const aoi = defaultArea().aoi;
const FLAGS = { start_year: 2003, end_year: 2011 };
const LATE = { start_year: 2016, end_year: 2025 };

function service(): ServiceClient {
  return {
    getMeta: vi.fn().mockResolvedValue(meta),
    postCalendar: vi.fn().mockResolvedValue(calendar),
    postAnalyticsCsv: vi.fn().mockResolvedValue("a\n"),
    postHotspotsCsv: vi.fn().mockResolvedValue("x\n"),
  };
}

describe("the period's limits come from /meta", () => {
  it("offers the served default period's years", () => {
    expect(choosableYears(meta)).toEqual(Array.from({ length: 23 }, (_, i) => 2003 + i));
  });
  it("takes whole years inside it, in order, at least the served minimum", () => {
    expect(meta.reference_period_min_years).toBe(5);
    expect(usable(FLAGS, meta)).toBe(true);
    expect(usable({ start_year: 2021, end_year: 2025 }, meta)).toBe(true);
    expect(usable({ start_year: 2022, end_year: 2025 }, meta)).toBe(false);
    expect(usable({ start_year: 2002, end_year: 2010 }, meta)).toBe(false);
    expect(usable({ start_year: 2011, end_year: 2003 }, meta)).toBe(false);
  });
});

describe("the request", () => {
  const base = rangeRequest(meta, aoi, null);
  it("is unchanged with no period, or with the default", () => {
    expect(withReference(base, null, meta)).toEqual(base);
    expect(withReference(base, meta.reference_period, meta)).toEqual(base);
    expect("reference_period" in withReference(base, meta.reference_period, meta)).toBe(false);
    expect(isDefault(meta.reference_period, meta)).toBe(true);
  });
  it("carries the period when one is chosen", async () => {
    const s = service();
    await loadArea(s, aoi, meta, null, undefined, FLAGS);
    expect(s.postCalendar).toHaveBeenCalledWith({ ...base, reference_period: FLAGS });
    const plain = service();
    await loadArea(plain, aoi, meta, null);
    expect(plain.postCalendar).toHaveBeenCalledWith(base);
  });
  it("goes with the analytics CSV, never with the hotspot list", async () => {
    const s = service();
    await downloadCsv(s, meta, aoi, null, "Sumatra", { kind: "analytics" }, vi.fn(), LATE);
    expect(s.postAnalyticsCsv).toHaveBeenCalledWith({ ...base, reference_period: LATE });
    await downloadCsv(s, meta, aoi, null, "Sumatra", { kind: "hotspots" }, vi.fn(), LATE);
    expect(s.postHotspotsCsv).toHaveBeenCalledWith({ ...base, all_satellites: false });
  });
});

describe("the control", () => {
  const html = renderToStaticMarkup(<ReferencePeriodControl calendar={calendar} meta={meta} onChange={() => undefined} />);
  it("shows the served period and says the flags keep their own years", () => {
    expect(html).toContain(messages.sentences!.reference_period_label);
    expect(html).toContain('<option value="2003" selected="">2003</option>');
    expect(html).toContain('<option value="2025" selected="">2025</option>');
    expect(html).toContain("The flags still use 2003–2011.");
    expect(html).toContain("Whole years from 2003 to 2025, at least 5 years.");
  });
  it("offers the default back only when another period is in use", () => {
    expect(html).not.toContain("Back to");
    const late = { ...calendar, reference_period: LATE };
    const other = renderToStaticMarkup(<ReferencePeriodControl calendar={late} meta={meta} onChange={() => undefined} />);
    expect(other).toContain("Back to 2003–2025");
    expect(other).toContain('<option value="2016" selected="">2016</option>');
    expect(other).toContain("The flags still use 2003–2011.");
  });
  it("sits under the card on the calendar page", () => {
    const page = renderToStaticMarkup(
      <CalendarView view={{ selected: aoi, range: null, result: { status: "ready", meta, calendar } }} onSelect={() => undefined} onSelectReference={() => undefined} />,
    );
    expect(page.indexOf('class="reading"')).toBeLessThan(page.indexOf('class="refperiod"'));
    const without = renderToStaticMarkup(
      <CalendarView view={{ selected: aoi, range: null, result: { status: "ready", meta, calendar } }} onSelect={() => undefined} />,
    );
    expect(without).not.toContain("refperiod");
  });
  it("uses only contract words for the refusal", () => {
    expect(messages.problems.invalid_reference_period).toBeTruthy();
  });
});

describe("the shareable link carries the period (additively)", () => {
  const areas = featuredAreas();
  const sumatra = areas.find((a) => a.isDefault)!;
  it("writes ref only when a period is chosen", () => {
    expect(encodeShare({ area: sumatra.aoi, range: null, grid: "grid", measure: "count" }, areas)).toBe("#/?area=sumatra");
    const hash = encodeShare({ area: sumatra.aoi, range: null, grid: "grid", measure: "count", reference: FLAGS }, areas);
    expect(hash).toBe("#/?area=sumatra&ref=2003-2011");
    expect(parseShare(currentQuery(hash), areas).reference).toEqual(FLAGS);
  });
  it("an old link has no period; an unreadable one falls back with the contract sentence", () => {
    expect(parseShare("area=sumatra", areas).reference).toBeNull();
    const bad = parseShare("area=sumatra&ref=2003", areas);
    expect(bad.reference).toBeNull();
    expect(bad.notes).toEqual([messages.problems.invalid_reference_period]);
  });
  it("a period the service would refuse is dropped once /meta is known", () => {
    expect(referenceNote(FLAGS, meta)).toBeNull();
    expect(referenceNote({ start_year: 2023, end_year: 2025 }, meta)).toBe(messages.problems.invalid_reference_period);
  });
});
