// Story 3.8: the flag state of each 1° cell for the month picked in the
// anomaly view. Flags live on whole 1° cells (AD-9); a month's card gives
// only the served counts per tier, so this is where "not flaggable",
// "provisional" and "reference years" read for each cell. Every value is a
// served field of POST /cells, formatted only (AD-8).
import { useEffect, useMemo, useRef, useState } from "react";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import { formatCount, formatYearMonth } from "../format";
import { layoutCellMap } from "../provenance/cellMap";
import { cellsHeading, flagReferenceLine, gridSentences, partlyInsideText, type GridSentences } from "./anomaly";
import { loadCells as defaultLoadCells, type Cells, type CellsLoader } from "../provenance/cells";
import "./flagcells.css";

type S = components["schemas"];
type Cell = S["Cell"];
type FlagState = S["FlagState"];

export const FLAG_STATES: FlagState[] = ["strong", "marginal", "none", "not_flaggable", "outside_record"];

const MAP_W = 400;
const MAP_H = 300;
/** Wait this long after the last pick before asking, so arrowing through the grid sends one request. */
const PICK_DELAY_MS = 250;

/** "102°, −7°": a cell's served south-west corner, longitude first. String formatting only. */
export function cornerLabel(c: Cell): string {
  const deg = (v: number) => `${String(v).replace("-", "−")}°`;
  return `${deg(c.sw_lon)}, ${deg(c.sw_lat)}`;
}

/** Each served note a cell carries, as words from messages.yaml. */
export function cellNotes(c: Cell, sentences: GridSentences = gridSentences()): string[] {
  const out: string[] = [];
  // notes.partly_inside once contract 0.4.0 merges; a short label until then.
  if (c.partly_inside) out.push(partlyInsideText(sentences));
  if (c.reference_year) out.push(messages.notes.reference_year);
  if (c.provisional) out.push(messages.notes.provisional);
  return out;
}

/** One cell's full reading: corner, state, served count and threshold, notes. */
export function cellSentence(c: Cell, unit: string, sentences: GridSentences = gridSentences()): string {
  const parts = [
    `Cell ${cornerLabel(c)}.`,
    messages.labels.flag_state[c.flag_state],
    c.count === null ? `Count –.` : `Count ${formatCount(c.count)} ${unit}.`,
    c.threshold === null ? "Threshold –." : `Threshold ${formatCount(c.threshold)}.`,
    ...cellNotes(c, sentences),
  ];
  return parts.join(" ");
}

function StateMark({ state, size }: { state: FlagState; size: number }) {
  const s = size;
  if (state === "strong") return <path className="fc-strong" d={`M1,1 L${Math.max(4, s * 0.6)},1 L1,${Math.max(4, s * 0.6)} Z`} />;
  if (state === "marginal") return <circle className="fc-marginal" cx={s / 2} cy={s / 2} r={Math.max(1.5, s * 0.26)} />;
  return null;
}

/** The cells drawn as a map, north up, each marked by its served flag_state; a key; and the same cells as a table. */
export function FlagCellsView({
  cells, unit, busy = false, sentences: given,
}: { cells: Cells; unit: string; busy?: boolean; sentences?: GridSentences }) {
  const L = useMemo(() => layoutCellMap(cells.cells, MAP_W, MAP_H), [cells]);
  const sentences = given ?? gridSentences();
  const labels = messages.labels.flag_state;
  const heading = cellsHeading(cells.month, sentences);
  const anyProvisional = cells.cells.some((c) => c.provisional);
  return (
    <section className="flagcells" aria-label={heading} aria-busy={busy || undefined} data-month={cells.month}>
      <h3>{heading}</h3>
      <p className="fc-note">{messages.notes.flag_scale} {messages.notes.strong_tier}</p>
      <p className="fc-note">{flagReferenceLine(cells.flag_reference_years, sentences)}</p>
      {anyProvisional ? <p className="fc-note">{messages.notes.provisional}</p> : null}
      {L ? (
        <svg className="fc-map" width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} role="img" aria-label={heading}>
          <defs>
            <pattern id="fc-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line className="fc-hatch-line" x1="0" y1="0" x2="0" y2="4" />
            </pattern>
          </defs>
          {L.boxes.map((b) => {
            const size = Math.max(1, b.size - 1);
            return (
              <g key={b.key} className={`fc-cell ${b.cell.flag_state}`} data-state={b.cell.flag_state} transform={`translate(${b.x + 0.5},${b.y + 0.5})`}>
                <title>{cellSentence(b.cell, unit, sentences)}</title>
                <rect width={size} height={size} fill={b.cell.flag_state === "outside_record" ? "url(#fc-hatch)" : undefined} />
                <StateMark state={b.cell.flag_state} size={size} />
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="fc-key">
        {FLAG_STATES.map((s) => (
          <li key={s} data-state={s}>
            <svg width="14" height="14" aria-hidden="true">
              <defs>
                <pattern id={`fck-hatch-${s}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line className="fc-hatch-line" x1="0" y1="0" x2="0" y2="4" />
                </pattern>
              </defs>
              <g className={`fc-cell ${s}`}>
                <rect x="0.5" y="0.5" width="13" height="13" fill={s === "outside_record" ? `url(#fck-hatch-${s})` : undefined} />
                <StateMark state={s} size={13} />
              </g>
            </svg>
            {labels[s]}
          </li>
        ))}
      </ul>
      <details className="fc-table">
        <summary>Each cell as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">South-west corner (lon, lat)</th>
              <th scope="col">Flag state</th>
              <th scope="col">Count</th>
              <th scope="col">Threshold</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {cells.cells.map((c) => (
              <tr key={`${c.sw_lon},${c.sw_lat}`} data-state={c.flag_state}>
                <th scope="row">{cornerLabel(c)}</th>
                <td>{labels[c.flag_state]}</td>
                <td className="num">{c.count === null ? "–" : formatCount(c.count)}</td>
                <td className="num">{c.threshold === null ? "–" : formatCount(c.threshold)}</td>
                <td>{cellNotes(c, sentences).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export interface FlagCellsPanelProps {
  meta: S["Meta"];
  aoi: S["CellsRequest"]["aoi"];
  /** The month to show: the one picked in the grid, else the current month. */
  month: string;
  unit: string;
  /** Given cells skip the loader (tests, server rendering). */
  cells?: Cells | null;
  loadCells?: CellsLoader;
}

/** Loads /cells for the picked month (one request per month and record version) and draws it. */
export function FlagCellsPanel({ meta, aoi, month, unit, cells: given, loadCells = defaultLoadCells }: FlagCellsPanelProps) {
  const [cells, setCells] = useState<Cells | null>(given ?? null);
  const [busy, setBusy] = useState(false);
  const cache = useRef(new Map<string, Cells | null>());

  useEffect(() => {
    cache.current.clear();
  }, [meta.record_version, aoi]);

  useEffect(() => {
    if (given !== undefined) return;
    const hit = cache.current.get(month);
    if (hit !== undefined) {
      setCells(hit);
      setBusy(false);
      return;
    }
    let live = true;
    setBusy(true);
    const t = setTimeout(() => {
      loadCells(meta, aoi, month).then((c) => {
        cache.current.set(month, c);
        if (live) {
          setCells(c);
          setBusy(false);
        }
      });
    }, PICK_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [month, meta, aoi, given, loadCells]);

  if (!cells) return null;
  return <FlagCellsView cells={cells} unit={unit} busy={busy} />;
}
