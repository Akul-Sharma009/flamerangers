import { useEffect, useState } from "react";
import { client, loadDefaultCalendar, ProblemError, type Calendar, type Meta } from "../api/client";
import { messages } from "../api/messages";
import { formatCount, formatYearMonth } from "../format";
import { CalendarGrid } from "../grid/CalendarGrid";
import { GridLegend } from "../grid/GridLegend";

type State =
  | { status: "loading" }
  | { status: "ready"; meta: Meta; calendar: Calendar }
  | { status: "problem"; text: string };

export function CalendarPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let live = true;
    loadDefaultCalendar(client).then(
      ({ meta, calendar }) => live && setState({ status: "ready", meta, calendar }),
      (err: unknown) => {
        if (!live) return;
        // TODO(label): messages.yaml has no sentence for "service unreachable"; raised with the lead.
        const text = err instanceof ProblemError ? messages.problems[err.code] : "The calendar could not be loaded.";
        setState({ status: "problem", text });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  if (state.status === "loading") {
    return <main className="page"><p className="loading">Loading…</p></main>;
  }
  if (state.status === "problem") {
    return <main className="page"><p className="problem" role="alert">{state.text}</p></main>;
  }

  const { meta, calendar } = state;
  const caveat = messages.labels.region_caveat[calendar.aoi.region_caveat];
  return (
    <main className="page ledger">
      <section aria-label="Area">
        <div className="place">
          Area
          <span className="name">{calendar.aoi.name ?? calendar.aoi.aoi_id}</span>
          <span className="size">{formatCount(calendar.aoi.area_km2)} km²</span>
        </div>
        {calendar.cautions.map((c) => (
          <p key={c.code} className="problem">{messages.cautions[c.code]}</p>
        ))}
        <ol className="notes">
          <li>{messages.notes.hotspot_definition}</li>
          <li>{messages.notes.record_switch}</li>
          <li>{messages.notes.satellite_switch}</li>
          {caveat ? <li>{caveat}</li> : null}
        </ol>
      </section>
      <section aria-label="Calendar">
        <div className="gridhead">
          <h2>
            Hotspots per month, {formatYearMonth(meta.record_start)} to {formatYearMonth(meta.current_month)}
          </h2>
          <span>{calendar.unit_label} · record {calendar.record_version}</span>
        </div>
        <CalendarGrid calendar={calendar} meta={meta} />
        <GridLegend calendar={calendar} />
      </section>
    </main>
  );
}
