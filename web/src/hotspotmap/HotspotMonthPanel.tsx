// Story 7.7: the picked month's hotspots on a map. It sits under the grid and
// loads that month's rows and 1° cells from the service (one request each, kept
// for the month). The dots are served rows; the panel shows no number of its own.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import type { AoiInput } from "../area/featured";
import { formatYearMonth } from "../format";
import { loadCells as defaultLoadCells, type Cells, type CellsLoader } from "../provenance/cells";
import type { HotspotMapProps } from "./HotspotMap";
import { loadHotspots as defaultLoadHotspots, MAX_DRAWN, selectDrawn, type HotspotLoader, type HotspotOutcome } from "./hotspots";
import "./hotspotmap.css";

type S = components["schemas"];

const LazyMap = lazy(() => import("./HotspotMap"));
const PICK_DELAY_MS = 250;
/** The first month the record has VIIRS-converted counts. */
const SWITCH_MONTH = "2022-01";

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
const words = (k: string) => messages.hotspot_map?.[k] ?? "";

export interface HotspotMonthPanelProps {
  meta: S["Meta"];
  aoi: AoiInput;
  /** "YYYY-MM": the month picked in the grid. */
  month: string;
  /** Set when the month's served count is null: no loading, the served reason is shown. */
  nullMonth?: { null_reason: S["NullReason"] | null };
  loadHotspots?: HotspotLoader;
  loadCells?: CellsLoader;
  /** Tests swap the WebGL map for a stand-in. */
  MapComponent?: ComponentType<HotspotMapProps>;
}

export function HotspotMonthPanel({
  meta, aoi, month, nullMonth, loadHotspots = defaultLoadHotspots, loadCells = defaultLoadCells, MapComponent,
}: HotspotMonthPanelProps) {
  const [outcome, setOutcome] = useState<HotspotOutcome | null>(null);
  const [cells, setCells] = useState<Cells | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const cache = useRef(new Map<string, { outcome: HotspotOutcome; cells: Cells | null }>());
  const geometryKey = JSON.stringify(aoi.geometry);

  useEffect(() => {
    cache.current.clear();
  }, [meta.record_version, geometryKey]);

  const isNull = !!nullMonth;
  useEffect(() => {
    if (isNull) return;
    const hit = cache.current.get(month);
    if (hit) {
      setOutcome(hit.outcome);
      setCells(hit.cells);
      return;
    }
    let live = true;
    setOutcome(null);
    // Wait after the last pick, so arrowing through the grid sends one request.
    const t = setTimeout(async () => {
      const [o, c] = await Promise.all([loadHotspots(meta, aoi, month), loadCells(meta, aoi, month)]);
      cache.current.set(month, { outcome: o, cells: c });
      if (live) {
        setOutcome(o);
        setCells(c);
      }
    }, PICK_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [month, meta, aoi, loadHotspots, loadCells, isNull]);

  if (nullMonth) {
    const heading = fill(words("heading"), { month: formatYearMonth(month) });
    const reason = nullMonth.null_reason ? messages.labels.null_reason[nullMonth.null_reason] : "";
    return (
      <section className="hotspotmap" aria-label={heading} data-month={month}>
        <h3>{heading}</h3>
        {reason ? <p className="hm-note" role="status">{reason}</p> : null}
      </section>
    );
  }

  return (
    <HotspotMonthView
      geometry={aoi.geometry}
      month={month}
      outcome={outcome}
      cells={cells}
      showExcluded={showExcluded}
      onShowExcluded={setShowExcluded}
      MapComponent={MapComponent}
    />
  );
}

export interface HotspotMonthViewProps {
  geometry: AoiInput["geometry"];
  month: string;
  /** null while loading. */
  outcome: HotspotOutcome | null;
  cells: Cells | null;
  showExcluded: boolean;
  onShowExcluded: (on: boolean) => void;
  MapComponent?: ComponentType<HotspotMapProps>;
}

/** The panel's markup, from already-loaded rows and cells. */
export function HotspotMonthView({ geometry, month, outcome, cells, showExcluded, onShowExcluded, MapComponent }: HotspotMonthViewProps) {
  const drawn = useMemo(() => (outcome?.status === "ok" ? selectDrawn(outcome.rows, showExcluded) : null), [outcome, showExcluded]);
  const label = formatYearMonth(month);
  const MapView = MapComponent ?? LazyMap;
  return (
    <section className="hotspotmap" aria-label={fill(words("heading"), { month: label })} aria-busy={outcome === null || undefined} data-month={month}>
      <h3>{fill(words("heading"), { month: label })}</h3>
      {outcome === null ? <p className="hm-note">{words("loading")}</p> : null}
      {outcome?.status === "failed" ? <p className="hm-note" role="status">{words("unavailable")}</p> : null}
      {outcome?.status === "too_large" ? <p className="hm-note" role="status">{words("too_large")}</p> : null}
      {drawn ? (
        <>
          <p className="hm-note">{words("intro")}</p>
          {month >= SWITCH_MONTH ? <p className="hm-note">{words("after_switch")}</p> : null}
          <label className="hm-toggle">
            <input type="checkbox" checked={showExcluded} onChange={(e) => onShowExcluded(e.target.checked)} />
            {words("show_excluded")}
          </label>
          {showExcluded ? <p className="hm-note">{words("excluded_note")}</p> : null}
          {drawn.points.length === 0 ? <p className="hm-note" role="status">{words("none_in_month")}</p> : null}
          {drawn.capped ? <p className="hm-note" role="status">{fill(words("capped"), { limit: MAX_DRAWN.toLocaleString("en") })}</p> : null}
          <Suspense fallback={<p className="hm-note">{words("loading")}</p>}>
            <MapView geometry={geometry} points={drawn.points} cells={cells?.cells ?? []} label={fill(words("map_label"), { month: label })} />
          </Suspense>
          <ul className="hm-key">
            <li><span className="hm-dot" aria-hidden="true" />{words("key_counted")}</li>
            {showExcluded ? <li><span className="hm-dot open" aria-hidden="true" />{words("key_excluded")}</li> : null}
            <li><span className="hm-line strong" aria-hidden="true" />{words("key_strong")}</li>
            <li><span className="hm-line marginal" aria-hidden="true" />{words("key_marginal")}</li>
          </ul>
        </>
      ) : null}
    </section>
  );
}
