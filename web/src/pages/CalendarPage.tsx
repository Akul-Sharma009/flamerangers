import { useEffect, useRef, useState } from "react";
import { client, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { AreaLocator } from "../area/AreaLocator";
import { defaultArea, type AoiInput } from "../area/featured";
import { loadArea, type AreaResult } from "../area/load";
import { areaProblemText } from "../area/words";
import { formatYearMonth } from "../format";
import { CalendarGrid } from "../grid/CalendarGrid";
import { GridLegend } from "../grid/GridLegend";

// TODO(label): messages.yaml has no sentence for "service unreachable"; raised with the lead.
const UNREACHABLE = "The calendar could not be loaded.";

interface View {
  selected: AoiInput;
  /** null while the calendar for `selected` loads. */
  result: AreaResult | null;
}

export function CalendarPage({ service = client }: { service?: ServiceClient }) {
  // Sumatra (the default in regions.geojson) is selected on first load.
  const [view, setView] = useState<View>(() => ({ selected: defaultArea().aoi, result: null }));
  const ask = useRef(0);

  const select = (aoi: AoiInput) => {
    const n = ++ask.current;
    const known = view.result?.meta ?? undefined;
    setView({ selected: aoi, result: null });
    loadArea(service, aoi, known).then((result) => {
      if (n === ask.current) setView({ selected: aoi, result });
    });
  };

  useEffect(() => {
    select(view.selected);
    // First load only; later loads come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CalendarView view={view} onSelect={select} />;
}

/** The page for one state of the view. Exported so tests can render each state. */
export function CalendarView({
  view, onSelect, initialOpen,
}: { view: View; onSelect: (aoi: AoiInput) => void; initialOpen?: boolean }) {
  const { selected, result } = view;
  const ready = result?.status === "ready" ? result : null;
  const calendar = ready?.calendar ?? null;
  const problemText =
    result?.status === "problem" ? areaProblemText(result.code) : result?.status === "failed" ? UNREACHABLE : null;
  const caveat = calendar ? messages.labels.region_caveat[calendar.aoi.region_caveat] : "";

  return (
    <main className="page ledger">
      <div className="leftcol">
        <AreaLocator
          selected={selected}
          calendar={calendar}
          problemText={problemText}
          loading={result === null}
          onSelect={onSelect}
          initialOpen={initialOpen}
        />
        {calendar ? (
          <ol className="notes">
            <li>{messages.notes.hotspot_definition}</li>
            <li>{messages.notes.record_switch}</li>
            <li>{messages.notes.satellite_switch}</li>
            {caveat ? <li>{caveat}</li> : null}
          </ol>
        ) : null}
      </div>
      {/* A refused area draws no calendar at all: never a grid of zeros. */}
      {ready ? (
        <section aria-label="Calendar">
          <div className="gridhead">
            <h2>
              Hotspots per month, {formatYearMonth(ready.meta.record_start)} to {formatYearMonth(ready.meta.current_month)}
            </h2>
            <span>{ready.calendar.unit_label} · record {ready.calendar.record_version}</span>
          </div>
          <CalendarGrid calendar={ready.calendar} meta={ready.meta} />
          <GridLegend calendar={ready.calendar} />
        </section>
      ) : result === null ? (
        <section aria-label="Calendar">
          <p className="loading">Loading…</p>
        </section>
      ) : null}
    </main>
  );
}
