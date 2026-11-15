// Story 8.7: two areas' calendars side by side, aligned by year and month, on one colour scale.
// Both areas are asked for with the other named in the request (shared_scale_with), so the service
// returns identical colour_breaks and the same count has the same colour in both. The browser computes
// no class and no number (AD-8). Seasonal profiles (Stories 7.3, 7.4) are to be added where marked below.
import { useEffect, useState } from "react";
import type { DateRange, Meta, ServiceClient } from "../api/client";
import { messages } from "../api/messages";
import { AreaPicker } from "../area/AreaPicker";
import type { AoiInput } from "../area/featured";
import { loadArea, type AreaResult } from "../area/load";
import { areaProblemText } from "../area/words";
import { formatCount, formatYearMonth } from "../format";
import type { Measure } from "../grid/anomaly";
import { CalendarGrid, type View } from "../grid/CalendarGrid";
import { GridLegend } from "../grid/GridLegend";
import { CaveatLine } from "../provenance/RegionCaveat";
import { sharesScale } from "./model";
import { COMPARE_WORDS as W } from "./words";

const UNREACHABLE = messages.client.service_unreachable;

export interface Pair {
  a: AreaResult;
  b: AreaResult;
}

/** Both areas, each asked for with the other named, so the service gives both one set of colour classes. */
export async function loadPair(service: ServiceClient, first: AoiInput, second: AoiInput, range: DateRange | null, meta?: Meta): Promise<Pair> {
  const [a, b] = await Promise.all([
    loadArea(service, first, meta, range, second),
    loadArea(service, second, meta, range, first),
  ]);
  return { a, b };
}

export function CompareSection({
  service, first, second, range, meta, onSecond, onStop, measure, onMeasure, view, onView,
}: {
  service: ServiceClient;
  first: AoiInput;
  second: AoiInput;
  range: DateRange | null;
  meta: Meta | null;
  onSecond: (aoi: AoiInput) => void;
  onStop: () => void;
  measure: Measure;
  onMeasure: (m: Measure) => void;
  view: View;
  onView: (v: View) => void;
}) {
  const [pair, setPair] = useState<Pair | null>(null);
  const [picking, setPicking] = useState(false);
  const key = `${JSON.stringify(first.geometry)}|${JSON.stringify(second.geometry)}|${range?.start ?? ""}|${range?.end ?? ""}`;

  useEffect(() => {
    let current = true;
    setPair(null);
    loadPair(service, first, second, range, meta ?? undefined).then((p) => current && setPair(p));
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section aria-label="Two areas side by side" className="comparesection">
      <div className="gridhead">
        <h2>{W.heading}</h2>
        <span>
          <button type="button" className="comparebtn" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>{W.change}</button>{" "}
          <button type="button" className="comparebtn" onClick={onStop}>{W.stop}</button>
        </span>
      </div>
      {picking ? (
        <AreaPicker
          currentName={second.name ?? null}
          onClose={() => setPicking(false)}
          onSelect={(aoi) => { setPicking(false); onSecond(aoi); }}
        />
      ) : null}
      {pair === null ? <p className="loading">{W.loading}</p> : (
        <ComparedCalendars pair={pair} measure={measure} onMeasure={onMeasure} view={view} onView={onView} />
      )}
    </section>
  );
}

/** The two loaded answers, side by side under one key. */
export function ComparedCalendars({
  pair, measure, onMeasure, view, onView,
}: { pair: Pair; measure: Measure; onMeasure: (m: Measure) => void; view: View; onView: (v: View) => void }) {
  const both =  pair && pair.a.status === "ready" && pair.b.status === "ready" ? { a: pair.a, b: pair.b } : null;
  const same = both ? sharesScale(both.a.calendar, both.b.calendar) : false;
  return (
    <>
      {both && same ? <p className="comparenote" data-compare="shared-scale">{W.sharedScale}</p> : null}
      <div className="comparegrids">
        <Side label={W.first} result={pair.a} measure={measure} onMeasure={onMeasure} view={view} onView={onView} />
        <Side label={W.second} result={pair.b} measure={measure} onMeasure={onMeasure} view={view} onView={onView} />
      </div>
      {both && !same ? <p className="comparenote" data-compare="not-shared" role="status">{W.notShared}</p> : null}
      {/* One key for both: the classes are identical. */}
      {both && same ? <GridLegend calendar={both.a.calendar} measure={measure} /> : null}
      {/* Seasonal profiles of the two areas (Stories 7.3, 7.4) go here, on the same shared scale. */}
    </>
  );
}

function Side({
  label, result, measure, onMeasure, view, onView,
}: { label: string; result: AreaResult; measure: Measure; onMeasure: (m: Measure) => void; view: View; onView: (v: View) => void }) {
  if (result.status !== "ready") {
    return (
      <div className="compareside" data-side={label}>
        <h3>{label}</h3>
        <p role="status">{result.status === "problem" ? areaProblemText(result.code) : `${W.failed} ${UNREACHABLE}`}</p>
      </div>
    );
  }
  const c = result.calendar;
  return (
    <div className="compareside" data-side={label}>
      <h3>
        <span className="sidelabel">{label}</span> {c.aoi.name ?? "Your area"}
      </h3>
      <p className="sideinfo">
        {formatCount(c.aoi.area_km2)} km² · {formatYearMonth(c.range.start.slice(0, 7))} to {formatYearMonth(c.range.end.slice(0, 7))} · {c.unit_label} · record {c.record_version}
      </p>
      <CaveatLine calendar={c} />
      <CalendarGrid calendar={c} meta={result.meta} measure={measure} onMeasureChange={onMeasure} view={view} onViewChange={onView} />
    </div>
  );
}
