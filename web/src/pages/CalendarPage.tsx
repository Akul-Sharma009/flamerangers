import { useEffect, useRef, useState } from "react";
import { client, type DateRange, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { AreaLocator } from "../area/AreaLocator";
import { defaultArea, type AoiInput } from "../area/featured";
import { loadArea, type AreaResult } from "../area/load";
import { areaProblemText } from "../area/words";
import { CurrentMonthCard } from "../card/CurrentMonthCard";
import { formatYearMonth } from "../format";
import type { Measure } from "../grid/anomaly";
import { CalendarGrid } from "../grid/CalendarGrid";
import { FlagCellsPanel } from "../grid/FlagCells";
import { GridLegend } from "../grid/GridLegend";
import type { CellsLoader } from "../provenance/cells";
import { CaveatLine, RegionCaveat } from "../provenance/RegionCaveat";

const UNREACHABLE = messages.client.service_unreachable;

interface View {
  selected: AoiInput;
  /** The range asked for; null is the whole record (July 2002 to the served data_through). */
  range: DateRange | null;
  /** null while the calendar for `selected` loads. */
  result: AreaResult | null;
}

export function CalendarPage({ service = client }: { service?: ServiceClient }) {
  // Sumatra (the default in regions.geojson) is selected on first load.
  const [view, setView] = useState<View>(() => ({ selected: defaultArea().aoi, range: null, result: null }));
  const ask = useRef(0);

  // Every request carries the area and the range together (Story 3.4).
  const show = (aoi: AoiInput, range: DateRange | null) => {
    const n = ++ask.current;
    const known = view.result?.meta ?? undefined;
    setView({ selected: aoi, range, result: null });
    loadArea(service, aoi, known, range).then((result) => {
      if (n === ask.current) setView({ selected: aoi, range, result });
    });
  };

  useEffect(() => {
    show(view.selected, view.range);
    // First load only; later loads come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CalendarView view={view} onSelect={(aoi) => show(aoi, view.range)} onSelectRange={(r) => show(view.selected, r)} />
  );
}

/** The page for one state of the view. Exported so tests can render each state. */
export function CalendarView({
  view, onSelect, onSelectRange, initialOpen, initialMeasure = "count", loadFlagCells,
}: {
  view: View;
  onSelect: (aoi: AoiInput) => void;
  onSelectRange?: (range: DateRange | null) => void;
  initialOpen?: boolean;
  /** Story 3.8: what the grid is coloured by on first draw. */
  initialMeasure?: Measure;
  /** Story 3.8: the /cells loader for the anomaly view's cell panel (tests pass their own). */
  loadFlagCells?: CellsLoader;
}) {
  const { selected, range, result } = view;
  // The measure and the picked month live here so the legend and the cell panel follow the grid.
  const [measure, setMeasure] = useState<Measure>(initialMeasure);
  const [picked, setPicked] = useState<string | null>(null);
  const ready = result?.status === "ready" ? result : null;
  const calendar = ready?.calendar ?? null;
  const problemText =
    result?.status === "problem" ? areaProblemText(result.code) : result?.status === "failed" ? UNREACHABLE : null;

  return (
    <main className="page ledger">
      <div className="leftcol">
        <AreaLocator
          selected={selected}
          calendar={calendar}
          problemText={problemText}
          loading={result === null}
          onSelect={onSelect}
          meta={result?.meta ?? null}
          range={range}
          onSelectRange={onSelectRange}
          initialOpen={initialOpen}
        />
        {/* The region caveat sits beside the map, not only on the evidence page (Story 3.6). */}
        {ready ? <RegionCaveat calendar={ready.calendar} meta={ready.meta} aoi={selected} /> : null}
        {/* The headline sentence and ruler sit under the locator (UI-CONCEPT.md, left column). */}
        {ready ? <CurrentMonthCard calendar={ready.calendar} meta={ready.meta} /> : null}
        {calendar ? (
          <ol className="notes">
            <li>{messages.notes.hotspot_definition}</li>
            <li>{messages.notes.record_switch}</li>
            <li>{messages.notes.satellite_switch}</li>
          </ol>
        ) : null}
      </div>
      {/* A refused area draws no calendar at all: never a grid of zeros. */}
      {ready ? (
        <section aria-label="Calendar">
          <div className="gridhead">
            <h2>
              Hotspots per month, {formatYearMonth(ready.calendar.range.start.slice(0, 7))} to{" "}
              {formatYearMonth(ready.calendar.range.end.slice(0, 7))}
            </h2>
            <span>{ready.calendar.unit_label} · record {ready.calendar.record_version}</span>
          </div>
          <CaveatLine calendar={ready.calendar} />
          <CalendarGrid calendar={ready.calendar} meta={ready.meta} measure={measure} onMeasureChange={setMeasure} onPick={setPicked} />
          <GridLegend calendar={ready.calendar} measure={measure} />
          {/* The anomaly view shows each 1° cell's flag state for the picked month, else the current month. */}
          {measure === "anomaly" ? (
            <FlagCellsPanel
              meta={ready.meta}
              aoi={selected}
              month={picked ?? ready.meta.current_month}
              unit={ready.calendar.unit_label}
              loadCells={loadFlagCells}
            />
          ) : null}
        </section>
      ) : result === null ? (
        <section aria-label="Calendar">
          <p className="loading">Loading…</p>
        </section>
      ) : null}
    </main>
  );
}
