import { messages } from "../api/messages";
import { MONTH_NAMES } from "../format";
import { coversMonth, coversYearTotal, type Highlight } from "./highlight";
import { asSentence, type CellModel, type GridModel, type Measure } from "./model";

const FLAG_TEXT = { strong: "◤", marginal: "○" } as const;

function MonthCell({ c, anomaly, lit }: { c: CellModel; anomaly: boolean; lit: boolean }) {
  const detail = anomaly ? c.anomalyDetail : c.detail;
  const cls = [
    c.count === null ? `null ${c.state}` : "count",
    anomaly && c.tone ? `a-${c.tone}` : "",
    c.monthToDate ? "mtd" : "",
    c.satelliteSwitch ? "satswitch" : "",
    lit ? "hl" : "",
  ].filter(Boolean).join(" ");
  return (
    <td className={cls} data-month={c.month} data-state={c.state} title={detail.join("\n")} aria-label={asSentence(detail)}>
      {c.flag ? <span className={`flag ${c.flag}`} aria-hidden="true">{FLAG_TEXT[c.flag]}</span> : null}
      {anomaly ? c.anomalyLabel : c.label}
      {c.marks ? <sup className="marks">{c.marks}</sup> : null}
    </td>
  );
}

/** The calendar as a plain table: the same served values and marks as the grid. */
export function CalendarTable({ model, measure = "count", highlight = null }: { model: GridModel; measure?: Measure; highlight?: Highlight | null }) {
  const switchAfter = model.rows.findIndex((r) => r.year === model.switchYear);
  const anomaly = measure === "anomaly";
  return (
    <div className="caltable-wrap">
      <table className={`caltable${anomaly ? " anomaly" : ""}`}>
        <caption>
          {anomaly
            ? model.anomalyScale
            : `Hotspots per month by year, ${model.unitLabel}`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            {MONTH_NAMES.map((m) => (
              <th scope="col" key={m} abbr={m}>{m.slice(0, 3)}</th>
            ))}
            <th scope="col">Year total</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, ri) => (
            <RowGroup key={row.year} row={row} anomaly={anomaly} highlight={highlight} switchBelow={ri === switchAfter && ri < model.rows.length - 1} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{anomaly ? "Reference mean" : "Median"} {model.referenceLabel}</th>
            {model.medians.map((m) => (
              <td key={m.calendarMonth} className={highlight?.kind === "calendar_month" && highlight.calendarMonth === m.calendarMonth ? "hl" : undefined} title={(anomaly ? m.meanDetail : m.detail).join("\n")}>{anomaly ? m.meanLabel : m.label}</td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RowGroup({
  row, switchBelow, anomaly, highlight,
}: { row: GridModel["rows"][number]; switchBelow: boolean; anomaly: boolean; highlight: Highlight | null }) {
  const t = row.total;
  // Story 3.9: a highlighted year marks its whole row, total included.
  const yearLit = coversYearTotal(highlight, row.year);
  return (
    <>
      <tr className={[switchBelow ? "before-switch" : "", yearLit ? "hl-row" : ""].filter(Boolean).join(" ") || undefined}>
        <th scope="row">{row.year}</th>
        {row.cells.map((c) => <MonthCell key={c.month} c={c} anomaly={anomaly} lit={coversMonth(highlight, c.month)} />)}
        <td className={`total${t && !t.complete ? " incomplete" : ""}${yearLit ? " hl" : ""}`} title={t ? t.detail.join("\n") : undefined} aria-label={t ? asSentence(t.detail) : undefined}>
          {t ? t.label : "–"}
          {t && t.topRank !== null ? <span className="rank">{t.topRank}</span> : null}
        </td>
      </tr>
      {switchBelow ? (
        <tr className="switch">
          <td colSpan={14}>{messages.notes.record_switch}</td>
        </tr>
      ) : null}
    </>
  );
}
