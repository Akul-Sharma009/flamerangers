// Story 4.4: the download controls. The CSV text comes from the service and is
// saved as it is; the browser computes nothing (AD-8).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { ProblemError, type Meta, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { defaultArea } from "../area/featured";
import type { Calendar } from "../grid/model";
import { CalendarView } from "../pages/CalendarPage";
import { CSV_BUSY, CSV_UNAVAILABLE, CsvOutcomeNote, DownloadControls } from "./DownloadControls";
import { csvFilename, downloadCsv } from "./csv";

const meta = metaJson as unknown as Meta;
const calendar = calendarJson as unknown as Calendar;
const aoi = defaultArea().aoi;
const noop = () => undefined;

function service(over: Partial<ServiceClient> = {}): ServiceClient {
  return {
    getMeta: vi.fn(), postCalendar: vi.fn(),
    postAnalyticsCsv: vi.fn().mockResolvedValue("a,b\n1,2\n"),
    postHotspotsCsv: vi.fn().mockResolvedValue("x\n"),
    ...over,
  };
}
const tooLarge = () =>
  new ProblemError({ type: "about:blank", title: "too_large_for_sync", status: 413, code: "too_large_for_sync", years: [2019, 2020], estimated_rows: 9, estimated_megabytes: 1.5 });

describe("downloadCsv", () => {
  it("sends the searched range and saves the served text unchanged", async () => {
    const s = service();
    const save = vi.fn();
    const range = { start: "2020-01-01", end: "2020-06-30" };
    const out = await downloadCsv(s, meta, aoi, range, "Sumatra", { kind: "analytics" }, save);
    expect(out).toEqual({ status: "saved" });
    expect(s.postAnalyticsCsv).toHaveBeenCalledWith(expect.objectContaining({ record_version: meta.record_version, ...range }));
    expect(save.mock.calls[0][1]).toBe("hotspots-sumatra-analytics.csv");
    expect(await (save.mock.calls[0][0] as Blob).text()).toBe("a,b\n1,2\n");
  });

  it("asks the whole record when no range is chosen, and carries the all-satellites option", async () => {
    const s = service();
    await downloadCsv(s, meta, aoi, null, "Sumatra", { kind: "hotspots", allSatellites: true }, vi.fn());
    expect(s.postHotspotsCsv).toHaveBeenCalledWith(expect.objectContaining({ start: `${meta.record_start}-01`, end: meta.data_through, all_satellites: true }));
    const call = (s.postHotspotsCsv as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect("year" in call).toBe(false);
  });

  it("a 413 gives the contract sentence and the years offered, and saves nothing", async () => {
    const save = vi.fn();
    const out = await downloadCsv(service({ postHotspotsCsv: () => Promise.reject(tooLarge()) }), meta, aoi, null, "Sumatra", { kind: "hotspots" }, save);
    expect(out).toMatchObject({ status: "too_large", text: messages.problems.too_large_for_sync, years: [2019, 2020] });
    expect(save).not.toHaveBeenCalled();
  });

  it("a one-year request sends that year", async () => {
    const s = service();
    await downloadCsv(s, meta, aoi, null, "Sumatra", { kind: "hotspots", year: 2020 }, vi.fn());
    expect(s.postHotspotsCsv).toHaveBeenCalledWith(expect.objectContaining({ year: 2020 }));
    expect(csvFilename("Sumatra", { kind: "hotspots", allSatellites: true, year: 2020 })).toBe("hotspots-sumatra-hotspot-list-all-satellites-2020.csv");
  });

  it("other problems use their contract sentence; a network failure says the service could not be reached", async () => {
    const rate = new ProblemError({ type: "about:blank", title: "r", status: 429, code: "rate_limited" });
    expect(await downloadCsv(service({ postAnalyticsCsv: () => Promise.reject(rate) }), meta, aoi, null, "A", { kind: "analytics" }, vi.fn()))
      .toEqual({ status: "failed", text: messages.problems.rate_limited });
    expect(await downloadCsv(service({ postAnalyticsCsv: () => Promise.reject(new Error("net")) }), meta, aoi, null, "A", { kind: "analytics" }, vi.fn()))
      .toEqual({ status: "failed", text: messages.client.service_unreachable });
  });
});

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const controls = (svc: ServiceClient | null) => (
  <DownloadControls service={svc} meta={meta} aoi={aoi} range={null} area="Sumatra" pictures={[]} />
);

describe("the controls", () => {
  it("offer both CSVs, the all-satellites option and the pictures with a service", () => {
    const out = html(<DownloadControls service={service()} meta={meta} aoi={aoi} range={null} area="Sumatra"
      pictures={[{ label: "calendar", filename: "f", find: () => null, content: { title: "t", details: [], legendHeading: "", legend: [], notes: [], footer: [] } }]} />);
    expect(out).toContain("Download analytics CSV");
    expect(out).toContain("Download hotspot CSV");
    expect(out).toContain("All satellites");
    expect(out).toContain("Download calendar");
    expect(out).not.toContain(CSV_UNAVAILABLE);
    expect(out).not.toMatch(/<button[^>]*disabled/);
  });

  it("in fixture mode say so and disable the CSV buttons, never offer a broken download", () => {
    const out = html(controls(null));
    expect(out).toContain(CSV_UNAVAILABLE);
    expect((out.match(/<button[^>]*disabled/g) ?? []).length).toBe(2);
  });

  it("show the 413 sentence and a button per offered year", () => {
    const state = { status: "too_large" as const, text: messages.problems.too_large_for_sync, years: [2019, 2020], problem: tooLarge().problem };
    const out = html(<CsvOutcomeNote state={state} busy={false} onYear={noop} />);
    expect(out).toContain(messages.problems.too_large_for_sync);
    expect(out).toContain("Download hotspot CSV for 2019");
    expect(out).toContain("Download hotspot CSV for 2020");
  });

  it("show a clear message on failure and the busy words are defined", () => {
    expect(html(<CsvOutcomeNote state={{ status: "failed", text: messages.client.service_unreachable }} busy={false} onYear={noop} />)).toContain(messages.client.service_unreachable);
    expect(CSV_BUSY).not.toMatch(/fire/i);
  });

  it("sit on the calendar page for any search, with the pictures", () => {
    const view = { selected: aoi, range: null, result: { status: "ready" as const, meta, calendar } };
    const out = html(<CalendarView view={view} onSelect={noop} />);
    expect(out).toContain('aria-label="Downloads"');
    expect(out).toContain(CSV_UNAVAILABLE);
    expect(out).toContain("Download calendar");
    expect(out).toContain("Download ruler");
    expect(html(<CalendarView view={view} onSelect={noop} csvService={service()} />)).not.toContain(CSV_UNAVAILABLE);
  });
});
