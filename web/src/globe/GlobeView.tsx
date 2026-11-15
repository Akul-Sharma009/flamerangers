// Story 8.10: the globe of unusual burning, a secondary view reached from the
// calendar (UI-CONCEPT.md, FR-36). It opens on the current month; the month
// control asks /world_cells for another month. The words, the table of flagged
// cells and the picture all read the same served answer (AD-8).
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import { formatCount, formatYearMonth } from "../format";
import { composeFigure } from "../download/figure";
import { cssVar } from "../download/capture";
import { downloadFigure, type PictureFormat } from "../download/save";
import type { Claim, Evidence } from "../evidence/types";
import {
  cellLink, cellWords, cornerWords, flaggedCells, landPath, loadWorldCells as defaultLoader, monthWords,
  stepMonth, worldMapMarkup, type FlagState, type WorldCells, type WorldCellsLoader,
} from "./world";
import "./globe.css";

const GlobeMap = lazy(() => import("./GlobeMap").then((m) => ({ default: m.GlobeMap })));

type Meta = components["schemas"]["Meta"];

/** The fixed claims the globe carries, quoted whole from evidence/claims.yaml by id. */
export const GLOBE_CLAIMS = ["trade-off-recall", "tiers-not-checked-everywhere", "caveat-southern-africa"] as const;
const SAVANNA = "Southern African savanna";
const KEY_STATES: FlagState[] = ["strong", "marginal", "none", "not_flaggable", "outside_record"];
const defaultLoadEvidence = () => import("../evidence/evidence.json").then((m) => m.default as unknown as Evidence);

function KeyMark({ state }: { state: FlagState | "uncovered" }) {
  return (
    <svg width="14" height="14" aria-hidden="true" className={`gk gk-${state}`}>
      <rect x="0.5" y="0.5" width="13" height="13" />
      {state === "strong" ? <circle cx="7" cy="7" r="3.2" className="gk-dot" /> : null}
      {state === "marginal" ? <circle cx="7" cy="7" r="3.2" className="gk-ring" /> : null}
      {state === "uncovered" ? <path d="M0,4 L4,0 M0,9 L9,0 M0,14 L14,0 M5,14 L14,5 M10,14 L14,10" className="gk-hatch" /> : null}
    </svg>
  );
}

export interface GlobeViewProps {
  meta: Meta;
  loadCells?: WorldCellsLoader;
  loadEvidence?: () => Promise<Evidence>;
  /** Tests leave the WebGL map out. */
  showMap?: boolean;
  /** Given answers render before any load (tests, server rendering). */
  initialCells?: WorldCells | null;
  initialClaims?: Claim[];
}

export function GlobeView({ meta, loadCells = defaultLoader, loadEvidence = defaultLoadEvidence, showMap = true, initialCells = null, initialClaims = [] }: GlobeViewProps) {
  const [month, setMonth] = useState(meta.current_month);
  const [cells, setCells] = useState<WorldCells | null>(initialCells);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const first = meta.record_start;
  const last = meta.current_month;

  useEffect(() => {
    let live = true;
    setBusy(true);
    loadCells(meta, month).then((w) => {
      if (!live) return;
      setBusy(false);
      setFailed(w === null);
      if (w) setCells(w);
    });
    return () => { live = false; };
  }, [meta, month, loadCells]);

  useEffect(() => {
    loadEvidence().then(
      (e) => setClaims(GLOBE_CLAIMS.map((id) => e.claims.find((c) => c.id === id)).filter((c): c is Claim => !!c)),
      () => setClaims([]),
    );
  }, [loadEvidence]);

  const flagged = useMemo(() => (cells ? flaggedCells(cells) : []), [cells]);
  const words = cells ? monthWords(cells) : [];
  const heading = cells ? `Unusual burning by 1° cell, ${formatYearMonth(cells.month)}` : "Unusual burning by 1° cell";

  const download = async (format: PictureFormat) => {
    if (!cells) return;
    const [topo, land] = await Promise.all([import("topojson-client"), import("world-atlas/land-110m.json")]);
    const atlas = land.default as unknown as Parameters<typeof topo.feature>[0];
    const lf = topo.feature(atlas, atlas.objects.land!) as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] };
    const palette = {
      strong: cssVar("--c4", "#9a5f2e"), marginal: cssVar("--c2", "#d3a866"), none: cssVar("--paper", "#f6f0e4"),
      not_flaggable: cssVar("--paper", "#f6f0e4"), outside_record: cssVar("--faint", "#e9e0cf"),
      ink: cssVar("--ink", "#1d1a16"), land: cssVar("--faint", "#e9e0cf"), rule: cssVar("--rule", "#c9bfae"), paper: cssVar("--faint", "#e9e0cf"),
    };
    const chart = worldMapMarkup(cells, landPath(lf.features), palette);
    const fig = composeFigure({
      title: heading,
      details: words,
      chart,
      legendHeading: "Each 1° cell, by flag state. Strong cells carry a filled dot, marginal cells a ring.",
      legend: KEY_STATES.map((s) => ({ color: palette[s], label: messages.labels.flag_state[s] })),
      notes: [messages.notes.globe_cells, messages.notes.globe_uncovered, messages.notes.flag_scale, messages.notes.strong_tier,
        ...claims.map((c) => (c.id === "caveat-southern-africa" ? `${SAVANNA}: ${c.text}` : c.text))],
      footer: [`Data through ${cells.data_through}. Record version ${cells.record_version}.`, messages.notes.record_switch],
      colors: { paper: cssVar("--paper", "#f6f0e4"), ink: palette.ink, muted: cssVar("--muted", "#6b6257"), rule: palette.rule },
      fonts: { serif: cssVar("--serif", "Georgia, serif"), sans: cssVar("--sans", "sans-serif") },
    });
    await downloadFigure(fig, format, `globe-${cells.month}`);
  };

  return (
    <section className="globe" aria-busy={busy || undefined} data-month={cells?.month}>
      <h2>{heading}</h2>
      <p className="globe-lead">{messages.notes.globe_cells}</p>

      <div className="globe-controls" role="group" aria-label="Month">
        <button type="button" onClick={() => setMonth(stepMonth(month, -1, first, last))} disabled={month <= first}>
          Previous month
        </button>
        <label>
          Month{" "}
          <input type="month" value={month} min={first} max={last}
            onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(stepMonth(e.target.value, 0, first, last)); }} />
        </label>
        <button type="button" onClick={() => setMonth(stepMonth(month, 1, first, last))} disabled={month >= last}>
          Next month
        </button>
      </div>

      <div className="globe-words" aria-live="polite">
        {failed ? <p>{messages.client.service_unreachable}</p> : words.map((w) => <p key={w}>{w}</p>)}
        {cells && cells.month !== month ? <p className="globe-note">The answer shown is for {formatYearMonth(cells.month)}.</p> : null}
      </div>

      {showMap ? (
        <Suspense fallback={<div className="globe-map" />}>
          <GlobeMap cells={cells} label={`${heading}. ${messages.notes.globe_cells}`} />
        </Suspense>
      ) : null}

      <ul className="globe-key" aria-label="Key">
        {KEY_STATES.map((s) => (
          <li key={s}><KeyMark state={s} />{messages.labels.flag_state[s]}</li>
        ))}
        <li><KeyMark state="uncovered" />{messages.labels.coverage_status.not_loaded}</li>
      </ul>

      <div className="globe-notes">
        <p>{messages.notes.globe_uncovered}</p>
        <p>{messages.notes.globe_select}</p>
        <p>{messages.notes.flag_scale} {messages.notes.strong_tier}</p>
        <ol className="globe-claims">
          {claims.map((c) => <li key={c.id} data-claim={c.id}>{c.id === "caveat-southern-africa" ? `${SAVANNA}: ` : ""}{c.text}</li>)}
        </ol>
      </div>

      <div className="globe-download">
        <button type="button" onClick={() => void download("png")} disabled={!cells}>Download picture (PNG)</button>
        <button type="button" onClick={() => void download("svg")} disabled={!cells}>Download picture (SVG)</button>
      </div>

      {cells ? (
        <table className="globe-table">
          <caption>Flagged cells, {formatYearMonth(cells.month)}, with links to their calendars</caption>
          <thead>
            <tr>
              <th scope="col">South-west corner</th>
              <th scope="col">Flag state</th>
              <th scope="col">Count</th>
              <th scope="col">Threshold</th>
              <th scope="col">Evidence</th>
              <th scope="col">Calendar</th>
            </tr>
          </thead>
          <tbody>
            {flagged.length === 0 ? <tr><td colSpan={6}>No cell is flagged in this month.</td></tr> : null}
            {flagged.map((c) => (
              <tr key={`${c.sw_lon},${c.sw_lat}`} data-state={c.flag_state}>
                <th scope="row">{cornerWords(c)}</th>
                <td>{messages.labels.flag_state[c.flag_state]}</td>
                <td className="num">{c.count === null ? "–" : formatCount(c.count)}</td>
                <td className="num">{c.threshold === null ? "–" : formatCount(c.threshold)}</td>
                <td>{messages.labels.evidence_class[c.evidence_class]}</td>
                <td><a href={cellLink(c)} aria-label={`Open the calendar for ${cellWords(c)}`}>Open its calendar</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
