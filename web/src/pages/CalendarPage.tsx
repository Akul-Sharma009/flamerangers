import { useEffect, useRef, useState, type RefObject } from "react";
import { client, type Calendar, type DateRange, type Meta, type ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { AreaLocator } from "../area/AreaLocator";
import { defaultArea, type AoiInput } from "../area/featured";
import { loadArea, type AreaResult } from "../area/load";
import { areaProblemText } from "../area/words";
import { CurrentMonthCard } from "../card/CurrentMonthCard";
import { calendarPicture, rulerPicture } from "../download/content";
import { DownloadControls } from "../download/DownloadControls";
import { areaLabel } from "../download/words";
import { buildCard } from "../card/model";
import { SERVICE_BASE_URL } from "../config";
import { formatYearMonth } from "../format";
import type { Measure } from "../grid/anomaly";
import { CalendarGrid, type View as GridView } from "../grid/CalendarGrid";
import { FlagCellsPanel } from "../grid/FlagCells";
import { GridLegend } from "../grid/GridLegend";
import type { Highlight } from "../grid/highlight";
import type { CellsLoader } from "../provenance/cells";
import { CaveatLine, RegionCaveat } from "../provenance/RegionCaveat";
import { currentHighlight, type Marked } from "../ranks/model";
import { RankingsPanel } from "../ranks/RankingsPanel";
import type { RankWords } from "../ranks/words";
import { addressChange, currentQuery, encodeShare, parseShare, rangeNote } from "../share";

const UNREACHABLE = messages.client.service_unreachable;

interface View {
  selected: AoiInput;
  /** The range asked for; null is the whole record (July 2002 to the served data_through). */
  range: DateRange | null;
  /** null while the calendar for `selected` loads. */
  result: AreaResult | null;
}

export function CalendarPage({ service = client }: { service?: ServiceClient }) {
  // Story 8.1: an address edited in an open tab (or Back and Forward) loads what it names. The page
  // starts over from the new address, exactly as opening the link fresh does.
  const [opened, setOpened] = useState(0);
  return <LinkedCalendar key={opened} service={service} onRelink={() => setOpened((n) => n + 1)} />;
}

function LinkedCalendar({ service, onRelink }: { service: ServiceClient; onRelink: () => void }) {
  // Story 8.1: the address may carry the area, the dates and the view. No state in it is the default area, as before.
  const [link] = useState(() => parseShare(currentQuery(window.location.hash)));
  const written = useRef(window.location.hash);
  const [view, setView] = useState<View>(() => ({ selected: link.area, range: link.range, result: null }));
  const [look, setLook] = useState<{ measure: Measure; grid: GridView }>({ measure: link.measure, grid: link.grid });
  const [notes, setNotes] = useState<string[]>(link.notes);
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
    // First load. A range from the link is checked against the served record first; a refused one
    // is dropped (the whole record loads) and the contract's sentence for it is shown.
    const n = ++ask.current;
    (async () => {
      let range = view.range;
      let meta: Meta | undefined;
      if (range) {
        try {
          meta = await service.getMeta();
          const note = rangeNote(range, meta);
          if (note) {
            range = null;
            if (n === ask.current) setNotes((old) => [...old, note]);
          }
        } catch {
          // loadArea asks /meta again and reports the failure itself.
        }
      }
      const result = await loadArea(service, view.selected, meta, range);
      if (n === ask.current) setView({ selected: view.selected, range, result });
    })();
    // First load only; later loads come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address follows the area, dates and view. replaceState adds no history entry and fires no hashchange.
  useEffect(() => {
    const hash = encodeShare({ area: view.selected, range: view.range, ...look });
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    written.current = hash;
  }, [view.selected, view.range, look]);

  // A hashchange comes only from outside the page: the address bar, Back and Forward, or a link.
  useEffect(() => {
    const onChange = () => {
      const what = addressChange(window.location.hash, written.current);
      if (what === "restore") window.history.replaceState(null, "", written.current);
      else if (what === "reload") onRelink();
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [onRelink]);

  return (
    <CalendarView
      view={view}
      csvService={service !== client || SERVICE_BASE_URL !== null ? service : null}
      onSelect={(aoi) => { setNotes([]); show(aoi, view.range); }}
      onSelectRange={(r) => { setNotes([]); show(view.selected, r); }}
      initialMeasure={link.measure}
      initialGrid={link.grid}
      onLookChange={(measure, grid) => setLook({ measure, grid })}
      linkNotes={notes}
    />
  );
}

/** The page for one state of the view. Exported so tests can render each state. */
export function CalendarView({
  view, onSelect, onSelectRange, initialOpen, initialMeasure = "count", initialGrid = "grid", onLookChange, linkNotes = [], loadFlagCells, initialHighlight = null, rankWords, csvService = null,
}: {
  view: View;
  /** Story 4.4: the service the CSV downloads ask; null (fixture mode) offers none. */
  csvService?: ServiceClient | null;
  onSelect: (aoi: AoiInput) => void;
  onSelectRange?: (range: DateRange | null) => void;
  initialOpen?: boolean;
  /** Story 3.8: what the grid is coloured by on first draw. */
  initialMeasure?: Measure;
  /** Story 8.1: grid or table on first draw, and a callback so the address follows both switches. */
  initialGrid?: GridView;
  onLookChange?: (measure: Measure, grid: GridView) => void;
  /** Story 8.1: contract sentences for the parts of an opened link that could not be used. */
  linkNotes?: string[];
  /** Story 3.8: the /cells loader for the anomaly view's cell panel (tests pass their own). */
  loadFlagCells?: CellsLoader;
  /** Story 3.9: a ranked item marked on first draw (tests). */
  initialHighlight?: Highlight | null;
  /** Story 3.9: the rankings' contract words (tests pass their own). */
  rankWords?: RankWords;
}) {
  const { selected, range, result } = view;
  // The measure and the picked month live here so the legend and the cell panel follow the grid.
  const [measure, setMeasure] = useState<Measure>(initialMeasure);
  const [grid, setGrid] = useState<GridView>(initialGrid);
  const [picked, setPicked] = useState<string | null>(null);
  const calRef = useRef<HTMLElement>(null);
  useEffect(() => onLookChange?.(measure, grid), [measure, grid]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = result?.status === "ready" ? result : null;
  const calendar = ready?.calendar ?? null;
  // Story 3.9: the ranked item marked on the calendar. It belongs to the calendar it
  // was chosen from, so a new area or range clears it.
  const [marked, setMarked] = useState<Marked>({ of: undefined, item: initialHighlight });
  const highlight = currentHighlight(marked, calendar);
  const setHighlight = (item: Highlight | null) => setMarked({ of: calendar, item });
  const problemText =
    result?.status === "problem" ? areaProblemText(result.code) : result?.status === "failed" ? UNREACHABLE : null;

  return (
    <main className={`page ledger${ready ? " has-ranks" : ""}`}>
      <div className="leftcol">
        {linkNotes.map((t) => (
          <p key={t} className="linknote" role="status">{t}</p>
        ))}
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
        {ready ? (
          <DownloadControls
            // A new area or range starts the block afresh, so a 413's year buttons never ask for another area.
            key={`${JSON.stringify(selected.geometry)}|${range?.start ?? ""}|${range?.end ?? ""}`}
            service={csvService}
            meta={ready.meta}
            aoi={selected}
            range={range}
            area={areaLabel(ready.calendar.aoi.name, selected.geometry)}
            pictures={pictureSpecs(ready.calendar, ready.meta, measure, selected, calRef)}
          />
        ) : null}
      </div>
      {/* A refused area draws no calendar at all: never a grid of zeros. */}
      {ready ? (
        <section aria-label="Calendar" className="calsection" ref={calRef}>
          <div className="gridhead">
            <h2>
              Hotspots per month, {formatYearMonth(ready.calendar.range.start.slice(0, 7))} to{" "}
              {formatYearMonth(ready.calendar.range.end.slice(0, 7))}
            </h2>
            <span>{ready.calendar.unit_label} · record {ready.calendar.record_version}</span>
          </div>
          <CaveatLine calendar={ready.calendar} />
          <CalendarGrid calendar={ready.calendar} meta={ready.meta} measure={measure} onMeasureChange={setMeasure} view={grid} onViewChange={setGrid} onPick={setPicked} highlight={highlight} />
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
      {/* Story 3.9: below the hero's left side, beside the grid; after the grid on a phone. */}
      {ready ? (
        <RankingsPanel calendar={ready.calendar} highlight={highlight} onHighlight={setHighlight} words={rankWords} />
      ) : null}
    </main>
  );
}

/** The pictures the download block offers: the calendar always, the ruler when the card drew one. */
function pictureSpecs(calendar: Calendar, meta: Meta, measure: Measure, selected: AoiInput, calRef: RefObject<HTMLElement | null>) {
  const specs = [
    {
      label: "calendar",
      find: () => calRef.current?.querySelector<SVGSVGElement>('svg[role="grid"]') ?? null,
      ...calendarPicture(calendar, meta, measure, selected.geometry),
    },
  ];
  const card = buildCard(calendar, meta);
  if (card.kind !== "not_loaded" && card.ruler.past.length > 0) {
    specs.push({
      label: "ruler",
      find: () => document.querySelector<SVGSVGElement>(".reading .ruler svg"),
      ...rulerPicture(calendar, meta, card.rulerCaption ?? `${card.monthLabel}, to date: the same days in each year`, selected.geometry),
    });
  }
  return specs;
}
