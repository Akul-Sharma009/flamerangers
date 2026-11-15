import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendar from "../../../contract/fixture/calendar.json";
import meta from "../../../contract/fixture/meta.json";
import splice from "../../../contract/fixture/examples/raw_splice.json";
import type { Calendar, Meta, RawSplice } from "../api/client";
import { messages } from "../api/messages";
import { SpliceChart } from "./SpliceChart";
import { SpliceToggle } from "./SpliceToggle";
import { axisTop, bars, withSplice } from "./model";

const cal = calendar as unknown as Calendar;
const met = meta as unknown as Meta;
const sp = splice as unknown as RawSplice;

describe("Story 7.2 raw splice view", () => {
  it("changes the values and keeps the colour scale", () => {
    const raw = withSplice(cal, sp);
    expect(raw.statistics.colour_breaks).toEqual(cal.statistics.colour_breaks);
    const m = (c: Calendar, ym: string) => c.months.find((x) => x.month === ym)!;
    expect(m(raw, "2015-06").count).toBe(sp.months.find((x) => x.month === "2015-06")!.count);
    expect(m(raw, "2015-06").count).not.toBe(m(cal, "2015-06").count);
    expect(m(raw, "2015-06").colour_class).toBe(sp.months.find((x) => x.month === "2015-06")!.colour_class);
    expect(m(raw, "2015-06").rank).toBeNull();
  });

  it("leaves null as null", () => {
    const raw = withSplice(cal, sp);
    expect(raw.months.find((x) => x.month === "2002-01")!.count).toBeNull();
  });

  it("marks raw early VIIRS months with the bad-scan caution", () => {
    const b = bars(cal, sp, "raw");
    expect(b.find((x) => x.month === "2013-12")!.earlyBadScan).toBe(true);
    expect(b.find((x) => x.month === "2014-01")!.earlyBadScan).toBe(false);
    expect(axisTop(cal, sp)).toBeGreaterThan(0);
  });

  it("toggle's caption explains the step and the record's two sources", () => {
    const rec = renderToStaticMarkup(<SpliceToggle series="record" onChange={() => {}} loading={false} failed={false} />);
    expect(rec).toContain("real Aqua through December 2021");
    expect(rec).toContain("C1");
    expect(rec).toContain('aria-pressed="true">Harmonized record');
    const raw = renderToStaticMarkup(<SpliceToggle series="raw" onChange={() => {}} loading={false} failed={false} />);
    expect(raw).toContain("January 2012");
    expect(raw).toContain('aria-pressed="true">Raw splice');
  });

  it("draws the chart with the caution and offers PNG and SVG", () => {
    const html = renderToStaticMarkup(<SpliceChart calendar={cal} meta={met} splice={sp} series="raw" />);
    expect(html).toContain(messages.notes.early_viirs_bad_scans);
    expect(html).toContain('role="img"');
    expect(html).toContain("raw splice chart picture format");
    expect(html).toContain("PNG");
    expect(html).toContain("SVG");
    const rec = renderToStaticMarkup(<SpliceChart calendar={cal} meta={met} splice={sp} series="record" />);
    expect(rec).not.toContain(messages.notes.early_viirs_bad_scans);
  });
});
