import { useState } from "react";
import type { YearRange } from "../reference/period";
import type { DateRange, Meta, ServiceClient } from "../api/client";
import type { AoiInput } from "../area/featured";
import { downloadCsv, type CsvAsk, type CsvKind, type CsvOutcome } from "./csv";
import { PictureDownload, type PictureContent } from "./PictureDownload";
import "./download.css";

/** TODO(csv_fixture): no contract sentence; the lead approves the wording (DECISIONS.md, Story 4.4). */
export const CSV_UNAVAILABLE = "The CSV files come from the data service, which this copy of the page is not connected to.";
/** TODO(csv_busy): no contract sentence for the in-progress state. */
export const CSV_BUSY = "Preparing the file…";

export interface PictureSpec {
  label: string;
  filename: string;
  find: () => SVGSVGElement | null;
  content: PictureContent;
}

export type State = { status: "idle" } | { status: "busy"; key: string } | CsvOutcome;

/**
 * Every download in one place (Story 4.4): the analytics CSV, the hotspot CSV
 * (all-satellites option, one-year fallback) and the pictures. `service` is
 * null when the page has no data service (fixture mode): the CSV rows then say
 * so and offer nothing that would fail.
 */
export function DownloadControls({
  service, meta, aoi, range, area, pictures, reference = null,
}: {
  service: ServiceClient | null;
  meta: Meta;
  aoi: AoiInput;
  range: DateRange | null;
  area: string;
  pictures: PictureSpec[];
  /** Story 8.4: the reference period on screen, for the analytics CSV. */
  reference?: YearRange | null;
}) {
  const [allSatellites, setAllSatellites] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const busy = state.status === "busy";

  const go = async (key: string, kind: CsvKind, ask: Partial<CsvAsk> = {}) => {
    if (!service) return;
    setState({ status: "busy", key });
    setState(await downloadCsv(service, meta, aoi, range, area, { kind, ...ask }, undefined, reference));
  };

  return (
    <section className="downloads" aria-label="Downloads">
      <h2>Downloads</h2>
      {service === null ? <p className="dlnote">{CSV_UNAVAILABLE}</p> : null}
      <div className="dlrow">
        <button type="button" disabled={service === null || busy} onClick={() => go("analytics", "analytics")}>
          Download analytics CSV
        </button>
        {busy && state.key === "analytics" ? <span role="status">{CSV_BUSY}</span> : null}
      </div>
      <div className="dlrow">
        <button type="button" disabled={service === null || busy} onClick={() => go("hotspots", "hotspots", { allSatellites })}>
          Download hotspot CSV
        </button>
        <label>
          <input type="checkbox" checked={allSatellites} disabled={service === null} onChange={(e) => setAllSatellites(e.target.checked)} />
          All satellites
        </label>
        {busy && state.key.startsWith("hotspots") ? <span role="status">{CSV_BUSY}</span> : null}
      </div>
      <CsvOutcomeNote state={state} busy={busy} onYear={(y) => go(`hotspots-${y}`, "hotspots", { allSatellites, year: y })} />
      {pictures.map((p) => (
        <PictureDownload key={p.label} {...p} />
      ))}
    </section>
  );
}

/** The failure message, or the 413 sentence with the one-year buttons (exported for tests). */
export function CsvOutcomeNote({ state, busy, onYear }: { state: State; busy: boolean; onYear: (year: number) => void }) {
  if (state.status === "failed") return <p role="alert" className="dlerr">{state.text}</p>;
  if (state.status !== "too_large") return null;
  return (
    <div role="alert" className="dlerr">
      <p>{state.text}</p>
      {state.years.length ? (
        <p className="dlyears">
          {state.years.map((y) => (
            <button key={y} type="button" disabled={busy} aria-label={`Download hotspot CSV for ${y}`} onClick={() => onYear(y)}>
              {y}
            </button>
          ))}
        </p>
      ) : null}
    </div>
  );
}
