// Story 8.6: the test's name, result and p-value, the record switch marked, and the caution.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import savannaJson from "../../../contract/fixture/examples/calendar_small_savanna_area.json";
import type { Calendar } from "../api/client";
import { messages } from "../api/messages";
import { TrendIndicator } from "./TrendIndicator";
import { buildTrend, formatP } from "./model";

const fixture = calendarJson as unknown as Calendar;
const savanna = savannaJson as unknown as Calendar;
const html = (c: Calendar) => renderToStaticMarkup(<TrendIndicator calendar={c} />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const words = (messages as unknown as { sentences: Record<string, string> }).sentences;

describe("the trend indicator", () => {
  it("shows the test's name, the served result and p-value", () => {
    const t = fixture.trend;
    const text = html(fixture);
    expect(text).toContain(words.trend_test_name);
    expect(text).toContain(`p = ${t.p_value}`);
    expect(text).toContain(`S = ${String(t.s).replace("-", "−")}, z = −0.34`);
    expect(text).toContain("no monotonic trend is detected");
    expect(text).toContain("2003–2025, 22 complete years");
  });

  it("marks the record switch and carries the caution that a step can look like a trend", () => {
    const markup = renderToStaticMarkup(<TrendIndicator calendar={fixture} />);
    expect(markup).toContain('data-testid="trend-switch"');
    expect(markup).toContain(words.trend_switch_caution);
    expect(markup).not.toMatch(/\bfires?\b/i);
  });

  it("says which years were left out", () => {
    expect(html(fixture)).toContain("Left out: 2002, 2022, 2026");
  });

  it("names the three sources, none unverified", () => {
    const text = html(fixture);
    expect(text).toContain("Mann, H. B. (1945)");
    expect(text).toContain("Sen, P. K. (1968)");
    expect(text).toContain("Kendall, M. G. (1938)");
    expect(text).not.toContain("unverified");
  });

  it("with too few complete years it states the refusal, shows no figures and no switch mark", () => {
    const markup = renderToStaticMarkup(<TrendIndicator calendar={savanna} />);
    expect(markup).toContain("at least 10 complete years");
    expect(markup).not.toContain("trend-switch");
    expect(markup).not.toContain("p =");
  });

  it("formats an exact zero p as below the smallest p shown, never as 0", () => {
    expect(formatP(0)).toBe("< 0.0001");
    expect(formatP(0.0412)).toBe("0.0412");
  });

  it("falls back to nothing when the contract has no words", () => {
    expect(buildTrend(fixture.trend, {}).result).toBeNull();
  });

  it("shows nothing when the service sends no trend (a service before contract 0.5.0)", () => {
    const old = { ...fixture } as Record<string, unknown>;
    delete old.trend;
    expect(renderToStaticMarkup(<TrendIndicator calendar={old as unknown as Calendar} />)).toBe("");
  });
});
