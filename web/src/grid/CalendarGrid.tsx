import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MONTH_INITIALS } from "../format";
import { CalendarTable } from "./CalendarTable";
import { GAP, layoutGrid, move, type Layout } from "./layout";
import { asSentence, buildGridModel, detailAt, type Calendar, type CellModel, type GridModel, type GridSentences, type Measure, type Meta, type Pos } from "./model";
import "./grid.css";

type View = "grid" | "table";

const key = (p: Pos) => `${p.r}-${p.c}`;
const same = (a: Pos | null, b: Pos) => a !== null && a.r === b.r && a.c === b.c;

/**
 * The year × month calendar (Story 3.5), with a table view of the same data,
 * coloured by the count or, in the anomaly view (Story 3.8), by the anomaly.
 * `width`, `initialView`, `initialMeasure` and `initialActive` let tests render
 * a fixed state. `measure` with `onMeasureChange` lets the page hold the
 * measure, so the legend and the cells panel follow it; `onPick` reports the
 * month the user focused or tapped.
 */
export function CalendarGrid({
  calendar, meta, width: fixedWidth, initialView = "grid", initialMeasure = "count", initialActive = null,
  measure: heldMeasure, onMeasureChange, onPick, sentences,
}: {
  calendar: Calendar;
  meta: Meta;
  width?: number;
  initialView?: View;
  initialMeasure?: Measure;
  initialActive?: Pos | null;
  measure?: Measure;
  onMeasureChange?: (m: Measure) => void;
  onPick?: (month: string) => void;
  /** The contract's sentences; tests pass their own. Default: messages.yaml. */
  sentences?: GridSentences;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);
  const [view, setView] = useState<View>(initialView);
  const [ownMeasure, setOwnMeasure] = useState<Measure>(initialMeasure);
  const measure = heldMeasure ?? ownMeasure;
  const setMeasure = (m: Measure) => {
    setOwnMeasure(m);
    onMeasureChange?.(m);
  };
  const model = useMemo(() => buildGridModel(calendar, meta, sentences), [calendar, meta, sentences]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || fixedWidth !== undefined) return;
    setMeasured(el.clientWidth);
    const ro = new ResizeObserver(() => setMeasured(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedWidth, view]);

  const width = fixedWidth ?? measured;

  return (
    <div className="calfigure">
      <div className="switches">
        <div className="viewswitch" role="group" aria-label="Calendar view">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
        </div>
        <div className="viewswitch" role="group" aria-label="Colour cells by">
          <button type="button" aria-pressed={measure === "count"} onClick={() => setMeasure("count")}>Counts</button>
          <button type="button" aria-pressed={measure === "anomaly"} onClick={() => setMeasure("anomaly")}>Anomalies</button>
        </div>
      </div>
      {view === "grid" ? (
        <div className="calgrid" ref={wrapRef} data-measure={measure}>
          {width > 0 ? (
            <GridSvg model={model} layout={layoutGrid(model, width)} measure={measure} initialActive={initialActive} onPick={onPick} />
          ) : null}
        </div>
      ) : (
        <CalendarTable model={model} measure={measure} />
      )}
    </div>
  );
}

function GridSvg({
  model, layout: L, measure, initialActive, onPick,
}: {
  model: GridModel;
  layout: Layout;
  measure: Measure;
  initialActive: Pos | null;
  onPick?: (month: string) => void;
}) {
  // pinned: set by focus or tap; hover: the pointer, shown over pinned while it lasts.
  const [pinned, setPinnedState] = useState<Pos | null>(initialActive);
  const anomaly = measure === "anomaly";
  const setPinned = (p: Pos | null) => {
    setPinnedState(p);
    const month = p && p.c < 12 ? model.rows[p.r]?.cells[p.c]?.month : undefined;
    if (month) onPick?.(month);
  };
  const [hover, setHover] = useState<Pos | null>(null);
  const refs = useRef(new Map<string, SVGGElement>());
  const shown = hover ?? pinned;
  const tabStop: Pos = pinned ?? { r: 0, c: 0 };
  const nRows = model.rows.length;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPinned(null);
      setHover(null);
      return;
    }
    // The focused element names its own place, so a key that arrives before the
    // focus has re-rendered still moves from the right cell.
    const at = (e.target as Element).closest?.("[data-pos]")?.getAttribute("data-pos");
    const from = at ? { r: Number(at.split("-")[0]), c: Number(at.split("-")[1]) } : (pinned ?? tabStop);
    const next = move(from, e.key, nRows);
    if (!next) return;
    e.preventDefault();
    setHover(null);
    setPinned(next);
    refs.current.get(key(next))?.focus();
  };

  // Common props for every focusable place.
  const focusable = (p: Pos, label: string) => ({
    ref: (el: SVGGElement | null) => {
      if (el) refs.current.set(key(p), el);
      else refs.current.delete(key(p));
    },
    "data-pos": key(p),
    tabIndex: same(tabStop, p) ? 0 : -1,
    role: "gridcell",
    "aria-label": label,
    "aria-selected": same(pinned, p),
    onFocus: () => setPinned(p),
    onClick: () => setPinned(p),
    onMouseEnter: () => setHover(p),
  });

  const cellX = (c: number) => L.yearW + c * L.cellW;
  const w = Math.max(1, L.cellW - GAP);
  const h = L.rowH;

  return (
    <div className="gridstage" onMouseLeave={() => setHover(null)}>
      <svg
        width={L.width}
        height={L.height}
        role="grid"
        aria-label={`Hotspots per month by year, ${model.unitLabel}. Arrow keys move between months.`}
        onKeyDown={onKey}
        onBlur={(e) => {
          // Leaving the grid (tapping elsewhere, tabbing on) closes the card.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPinned(null);
        }}
      >
        <defs>
          <pattern id="hatch-record" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line className="hatch-line" x1="0" y1="0" x2="0" y2="5" />
          </pattern>
          <pattern id="hatch-coverage" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle className="dot" cx="2.5" cy="2.5" r="1" />
          </pattern>
        </defs>

        <g className="head" aria-hidden="true">
          {MONTH_INITIALS.map((m, i) => (
            <text key={i} className="colhead" x={cellX(i) + L.cellW / 2} y={12}>{m}</text>
          ))}
          <text className="colhead" x={L.totalX} y={12} style={{ textAnchor: "start" }}>{L.narrow ? "Total" : "Year total"}</text>
        </g>

        {model.rows.map((row, ri) => {
          const ry = L.rowYs[ri];
          return (
            <g key={row.year} className="row" role="row" data-year={row.year}>
              <text className="yr" role="rowheader" x={L.yearW - 6} y={ry + h / 2 + 4}>{row.year}</text>
              {row.cells.map((c, ci) => (
                <g
                  key={c.month}
                  className={`cell ${c.count === null ? "nullcell" : anomaly ? `a-${c.tone ?? "none"}` : `k${c.colourClass ?? 0}`}`}
                  transform={`translate(${cellX(ci)},${ry})`}
                  data-month={c.month}
                  data-state={c.state}
                  data-flag={c.flag ?? undefined}
                  data-mtd={c.monthToDate || undefined}
                  data-marks={c.marks || undefined}
                  data-satswitch={c.satelliteSwitch || undefined}
                  data-anomaly-class={anomaly && c.anomalyClass !== null ? c.anomalyClass : undefined}
                  {...focusable({ r: ri, c: ci }, asSentence(anomaly ? c.anomalyDetail : c.detail))}
                >
                  <Cell c={c} w={w} h={h} showNums={L.showNums} anomaly={anomaly} />
                  {same(shown, { r: ri, c: ci }) ? <rect className="ring" x={-1.5} y={-1.5} width={w + 3} height={h + 3} /> : null}
                </g>
              ))}
              {row.total ? (
                <g
                  className={`total${row.total.complete ? "" : " incomplete"}`}
                  transform={`translate(${L.totalX},${ry})`}
                  {...focusable({ r: ri, c: 12 }, asSentence(row.total.detail))}
                >
                  <rect className="hit" width={L.totalW - 4} height={h} />
                  {L.narrow ? (
                    <>
                      {!row.total.complete ? <rect className="tot-box" x={13} y={1.5} width={L.totalW - 15} height={h - 3} /> : null}
                      <text className="tot-num narrow" x={L.totalW - 5} y={h / 2 + 3.5} style={{ textAnchor: "end" }}>{row.total.label}</text>
                    </>
                  ) : (
                    <>
                      <rect
                        className={`tot-bar${row.total.complete ? "" : " hollow"}`}
                        x={0} y={4} height={h - 8}
                        width={Math.max(0, (row.total.shareOfMax ?? 0) * L.barMax)}
                      />
                      <text className="tot-num" x={L.barMax + 6} y={h / 2 + 4}>{row.total.label}</text>
                    </>
                  )}
                  {row.total.topRank !== null ? (
                    <g className={`rank${L.narrow ? " narrow" : ""}`} transform={`translate(${L.narrow ? 6 : L.totalW - 14},${h / 2})`}>
                      <circle r={L.narrow ? 5.5 : 7} />
                      <text y={L.narrow ? 3 : 3.3}>{row.total.topRank}</text>
                    </g>
                  ) : null}
                  {same(shown, { r: ri, c: 12 }) ? <rect className="ring" x={-1.5} y={-1.5} width={L.totalW - 1} height={h + 3} /> : null}
                </g>
              ) : null}
            </g>
          );
        })}

        {L.rule ? (
          <g className="switch" aria-hidden="true">
            <line className="switch-rule" x1={0} x2={L.width} y1={L.rule.y} y2={L.rule.y} />
            <text className="switch-note" x={L.yearW} y={L.rule.noteY + 10}>
              {L.rule.lines.map((l, i) => (
                <tspan key={i} x={L.yearW} dy={i === 0 ? 0 : 13}>{l}</tspan>
              ))}
            </text>
          </g>
        ) : null}

        <line className="foot-rule" x1={L.yearW} x2={L.width} y1={L.footY} y2={L.footY} />
        <g role="row" className="medians">
          <text className="colhead foot-label" role="rowheader" x={L.yearW - 6} y={L.footY + 15} style={{ textAnchor: "end" }}>
            {anomaly ? "mean" : L.narrow ? "med." : "median"}
          </text>
          {model.medians.map((m, i) => {
            const p = { r: nRows, c: i };
            const x = cellX(i);
            // The anomaly view's foot row is the served reference mean, the centre of its ramp.
            const footLabel = anomaly ? m.meanLabel : m.label;
            return (
              <g key={i} className="median" transform={`translate(${x},${L.footY})`} {...focusable(p, asSentence(anomaly ? m.meanDetail : m.detail))}>
                <rect className="hit" width={w} height={L.footH} />
                {L.narrow ? (
                  <text className="median-num" transform={`translate(${w / 2 + 3},${L.footH - 3}) rotate(-90)`}>{footLabel}</text>
                ) : (
                  <text className="median-num" x={w / 2} y={15} style={{ textAnchor: "middle" }}>{footLabel}</text>
                )}
                {same(shown, p) ? <rect className="ring" x={-1.5} y={1} width={w + 3} height={L.footH - 1} /> : null}
              </g>
            );
          })}
        </g>
      </svg>
      {shown ? <DetailCard model={model} layout={L} pos={shown} measure={measure} /> : null}
    </div>
  );
}

function Cell({ c, w, h, showNums, anomaly }: { c: CellModel; w: number; h: number; showNums: boolean; anomaly: boolean }) {
  const isNull = c.count === null;
  const label = anomaly ? c.anomalyLabel : c.label;
  // With numerals shown, marks sit after the count as superscripts (about 5.2 px a glyph).
  const marksW = showNums && c.marks ? c.marks.length * 5.2 + 1 : 0;
  return (
    <>
      {isNull ? (
        <>
          <rect width={w} height={h} className="null-bg" />
          <rect width={w} height={h} className="null-pat" fill={`url(#${c.state === "outside_coverage" ? "hatch-coverage" : "hatch-record"})`} />
          {showNums ? <text className="dash" x={w / 2} y={h / 2 + 4}>–</text> : null}
        </>
      ) : (
        <>
          <rect className="bg" width={w} height={h} />
          {showNums && label ? <text className={`num${(marksW && label.length >= (anomaly ? 6 : 7)) || label.length >= 8 ? " tight" : ""}`} x={w - 3 - marksW} y={h / 2 + 4.5}>{label}</text> : null}
        </>
      )}
      {c.monthToDate ? <rect className="mtd" x={1} y={1} width={w - 2} height={h - 2} /> : null}
      {c.flag === "strong" ? <path className="flag-strong" d="M1.5,1.5 L7,1.5 L1.5,7 Z" /> : null}
      {c.flag === "marginal" ? <circle className="flag-marginal" cx={4.5} cy={4.5} r={2.4} /> : null}
      {/* The 3 November 2026 change of feeding satellite: a short rule on the month's left edge,
          the same ink rule as the sensor change but one cell high (Story 3.6). */}
      {c.satelliteSwitch ? <line className="satswitch" x1={-1} x2={-1} y1={-2} y2={h + 2} /> : null}
      {c.marks ? <text className="marks" x={w - 2} y={showNums ? h / 2 + 0.5 : 7.5}>{c.marks}</text> : null}
    </>
  );
}

const CARD_W = 270;

function DetailCard({ model, layout: L, pos, measure }: { model: GridModel; layout: Layout; pos: Pos; measure: Measure }) {
  const lines = detailAt(model, pos, measure);
  if (!lines) return null;
  const isMedian = pos.r === model.rows.length;
  const x = pos.c === 12 ? L.totalX : L.yearW + pos.c * L.cellW;
  const cardW = Math.min(CARD_W, L.width);
  const left = Math.max(0, Math.min(x, L.width - cardW));
  const y = isMedian ? L.footY : L.rowYs[pos.r];
  // Below the cell in the upper half of the grid, above it in the lower half.
  const below = y < L.height / 2;
  const style = below
    ? { left, top: y + (isMedian ? L.footH : L.rowH) + 6, width: cardW }
    : { left, bottom: L.height - y + 6, width: cardW };
  return (
    <div className="cellcard" style={style} aria-hidden="true" data-pos={key(pos)}>
      <strong>{lines[0]}</strong>
      <span className="count">{lines[1]}</span>
      {lines.slice(2).map((l, i) => <span key={i}>{l}</span>)}
    </div>
  );
}
