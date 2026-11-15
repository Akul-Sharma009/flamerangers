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
import { HotspotMonthPanel } from "../hotspotmap/HotspotMonthPanel"; // Story 7.7
import type { Highlight } from "../grid/highlight";
import type { CellsLoader } from "../provenance/cells";
import { CaveatLine, RegionCaveat } from "../provenance/RegionCaveat";
import { currentHighlight, type Marked } from "../ranks/model";
import { RankingsPanel } from "../ranks/RankingsPanel";
import type { RankWords } from "../ranks/words";
import { loadAdminUnit } from "../area/admin/units";
import { useRawSplice } from "../splice/useRawSplice"; // Story 7.2
import { SpliceToggle } from "../splice/SpliceToggle";
import { SpliceChart } from "../splice/SpliceChart";
import { withSplice, type Series } from "../splice/model";
import { SeasonPanel } from "../season/SeasonPanel";
import { TrendIndicator } from "../trend/TrendIndicator";
import { CompareSection } from "../compare/CompareSection";
import { otherThan } from "../compare/model";
import { COMPARE_WORDS } from "../compare/words";
import { SeasonToDateSection } from "../todate/SeasonToDateSection";
import { addressChange, currentQuery, encodeShare, parseShare, rangeNote, referenceNote } from "../share";
// Story 8.4: the reference period control.
import { isDefault, type YearRange } from "../reference/period";
import { ReferencePeriodControl } from "../reference/ReferencePeriodControl";

const UNREACHABLE = messages.client.service_unreachable;

interface View {
  selected: AoiInput;
  /** The range asked for; null is the whole record (July 2002 to the served data_through). */
  range: DateRange | null;
  /** null while the calendar for `selected` loads. */
  result: AreaResult | null;
  /** Story 8.4: the comparison years asked for; null (or absent) is the served default. */
  reference?: YearRange | null;
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
  const [view, setView] = useState<View>(() => ({ selected: link.area, range: link.range, result: null, reference: link.reference ?? null }));
  const [look, setLook] = useState<{ measure: Measure; grid: GridView }>({ measure: link.measure, grid: link.grid });
  const [notes, setNotes] = useState<string[]>(link.notes);
  // Story 8.7: the second area of a side-by-side comparison; null is none.
  const [second, setSecond] = useState<AoiInput | null>(link.compare ?? null);
  const ask = useRef(0);

  // Every request carries the area and the range together (Story 3.4).
  const show = (aoi: AoiInput, range: DateRange | null, reference: YearRange | null = view.reference ?? null) => {
    const n = ++ask.current;
    const known = view.result?.meta ?? undefined;
    setView({ selected: aoi, range, result: null, reference });
    loadArea(service, aoi, known, range, undefined, reference).then((result) => {
      if (n === ask.current) setView({ selected: aoi, range, result, reference });
    });
  };

  useEffect(() => {
    // First load. A range from the link is checked against the served record first; a refused one
    // is dropped (the whole record loads) and the contract's sentence for it is shown.
    const n = ++ask.current;
    (async () => {
      let range = view.range;
      let reference = view.reference ?? null;
      let meta: Meta | undefined;
      // Story 8.2: a link naming a country or region loads that outline first; if it can't, the default shows.
      let area = view.selected;
      if (link.admin) {
        const unit = await loadAdminUnit(link.admin).catch(() => null);
        if (unit) area = unit.aoi;
        else if (n === ask.current) setNotes((old) => [...old, messages.problems.invalid_aoi]);
      }
      if (range || reference) {
        try {
          meta = await service.getMeta();
          const note = range ? rangeNote(range, meta) : null;
          if (note) {
            range = null;
            if (n === ask.current) setNotes((old) => [...old, note]);
          }
          // Story 8.4: comparison years the service would refuse are dropped the same way.
          const refNote = reference ? referenceNote(reference, meta) : null;
          if (refNote) {
            reference = null;
            if (n === ask.current) setNotes((old) => [...old, refNote]);
          } else if (reference && isDefault(reference, meta)) reference = null;
        } catch {
          // loadArea asks /meta again and reports the failure itself.
        }
      }
      const result = await loadArea(service, area, meta, range, undefined, reference);
      if (n === ask.current) setView({ selected: area, range, result, reference });
    })();
    // First load only; later loads come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address follows the area, dates and view. replaceState adds no history entry and fires no hashchange.
  useEffect(() => {
    const hash = encodeShare({ area: view.selected, range: view.range, ...look, compare: second, reference: view.reference });
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    written.current = hash;
  }, [view.selected, view.range, view.reference, look, second]);

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
      spliceService={service}
      seasonService={service}
      csvService={service !== client || SERVICE_BASE_URL !== null ? service : null}
      onSelect={(aoi) => { setNotes([]); show(aoi, view.range); }}
      onSelectRange={(r) => { setNotes([]); show(view.selected, r); }}
      onSelectReference={(p) => { setNotes([]); show(view.selected, view.range, p); }}
      initialMeasure={link.measure}
      initialGrid={link.grid}
      onLookChange={(measure, grid) => setLook({ measure, grid })}
      linkNotes={notes}
      compare={{ service, second, onSecond: setSecond }}
    />
  );
}

/** The page for one state of the view. Exported so tests can render each state. */
export function CalendarView({
  view, onSelect, onSelectRange, onSelectReference, spliceService = null, seasonService = null, initialOpen, initialMeasure = "count", initialGrid = "grid", onLookChange, linkNotes = [], loadFlagCells, initialHighlight = null, rankWords, csvService = null, compare,
}: {
  view: View;
  /** Story 4.4: the service the CSV downloads ask; null (fixture mode) offers none. */
  csvService?: ServiceClient | null;
  /** Story 7.2: the service the raw splice is asked of; null offers no toggle. */
  spliceService?: ServiceClient | null;
  /** Story 7.4: the service the seasonal profile asks; null draws none. */
  seasonService?: ServiceClient | null;
  onSelect: (aoi: AoiInput) => void;
  onSelectRange?: (range: DateRange | null) => void;
  /** Story 8.4: new comparison years; null is the served default. Absent draws no control. */
  onSelectReference?: (reference: YearRange | null) => void;
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
  /** Story 8.7: the side-by-side view. Absent, or `second` null, is the single calendar. */
  compare?: { service: ServiceClient; second: AoiInput | null; onSecond: (aoi: AoiInput | null) => void };
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
  // Story 7.2: the raw splice, asked of the service once the calendar is ready. The grid then draws the
  // splice's served counts and colour classes on the record's scale.
  const [series, setSeries] = useState<Series>("record");
  const splice = useRawSplice(spliceService, ready?.meta ?? null, selected, range, !!ready);
  const rawOn = series === "raw" && splice.status === "ready" && ready ? splice.splice : null;
  const gridCalendar = ready && rawOn ? withSplice(ready.calendar, rawOn) : ready?.calendar ?? null;
  const offerSplice = ready !== null && !!spliceService?.postRawSplice;
  const comparing = compare?.second ?? null;
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
        {/* Story 8.4: the comparison years for the card's usual, the medians and the anomalies. */}
        {ready && onSelectReference ? (
          <ReferencePeriodControl calendar={ready.calendar} meta={ready.meta} onChange={onSelectReference} />
        ) : null}
        {calendar ? (
          <ol className="notes">
            <li>{messages.notes.hotspot_definition}</li>
            <li>{messages.notes.record_switch}</li>
            <li>{messages.notes.satellite_switch}</li>
          </ol>
        ) : null}
        {/* Story 8.6: the trend test on the annual totals. */}
        {ready ? <TrendIndicator calendar={ready.calendar} /> : null}
        {ready ? (
          <DownloadControls
            // A new area or range starts the block afresh, so a 413's year buttons never ask for another area.
            key={`${JSON.stringify(selected.geometry)}|${range?.start ?? ""}|${range?.end ?? ""}|${view.reference?.start_year ?? ""}-${view.reference?.end_year ?? ""}`}
            service={csvService}
            meta={ready.meta}
            aoi={selected}
            range={range}
            reference={view.reference ?? null}
            area={areaLabel(ready.calendar.aoi.name, selected.geometry)}
            pictures={pictureSpecs(ready.calendar, ready.meta, measure, selected, calRef).filter((p) => !rawOn || p.label !== "calendar")}
          />
        ) : null}
      </div>
      {/* Story 8.7: two areas side by side replace the single calendar. */}
      {ready && compare && comparing ? (
        <CompareSection
          service={compare.service} first={selected} second={comparing} range={range} meta={ready.meta}
          onSecond={compare.onSecond} onStop={() => compare.onSecond(null)}
          measure={measure} onMeasure={setMeasure} view={grid} onView={setGrid}
        />
      ) : null}
      {/* A refused area draws no calendar at all: never a grid of zeros. */}
      {ready && !comparing ? (
        <section aria-label="Calendar" className="calsection" ref={calRef}>
          <div className="gridhead">
            <h2>
              Hotspots per month, {formatYearMonth(ready.calendar.range.start.slice(0, 7))} to{" "}
              {formatYearMonth(ready.calendar.range.end.slice(0, 7))}
            </h2>
            <span>{ready.calendar.unit_label} · record {ready.calendar.record_version}</span>
          </div>
          <CaveatLine calendar={ready.calendar} />
          {compare ? <CompareStart onStart={() => compare.onSecond(otherThan(selected))} /> : null}
          {offerSplice ? <SpliceToggle series={series} onChange={setSeries} loading={series === "raw" && splice.status === "loading"} failed={series === "raw" && splice.status === "failed"} /> : null}
          <CalendarGrid calendar={gridCalendar ?? ready.calendar} meta={ready.meta} measure={rawOn ? "count" : measure} onMeasureChange={(m) => { if (m === "anomaly") setSeries("record"); setMeasure(m); }} view={grid} onViewChange={setGrid} onPick={setPicked} highlight={highlight} />
          <GridLegend calendar={ready.calendar} measure={rawOn ? "count" : measure} />
          {offerSplice && splice.status === "ready" ? (
            <SpliceChart calendar={ready.calendar} meta={ready.meta} splice={splice.splice} series={series} geometry={selected.geometry} />
          ) : null}
          {/* Story 7.7: the picked month's hotspots on a map. */}
          {picked ? <HotspotMonthPanel meta={ready.meta} aoi={selected} month={picked} loadCells={loadFlagCells} /> : null}
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
          {/* Story 7.4: the seasonal profile of the area (reference period, not the chosen dates). */}
          {seasonService ? <SeasonPanel service={seasonService} meta={ready.meta} aoi={selected} /> : null}
          {/* Story 8.10: the globe is a secondary view reached from here. */}
          <p className="globe-link"><a href="#/globe">Where on Earth is this month unusual? Open the globe of 1° cells.</a></p>
        </section>
      ) : result === null ? (
        <section aria-label="Calendar">
          <p className="loading">Loading…</p>
        </section>
      ) : null}
      {/* Story 7.6: season to date, under the calendar. */}
      {ready ? <SeasonToDateSection meta={ready.meta} aoi={selected} areaName={ready.calendar.aoi.name} /> : null}
      {/* Story 3.9: below the hero's left side, beside the grid; after the grid on a phone. */}
      {ready && !comparing ? (
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

/** Story 8.7: the button that starts a comparison; the second area is changed with the picker there. */
function CompareStart({ onStart }: { onStart: () => void }) {
  return <button type="button" className="comparebtn" onClick={onStart}>{COMPARE_WORDS.start}</button>;
}
