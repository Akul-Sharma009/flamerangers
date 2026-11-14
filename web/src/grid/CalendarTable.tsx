import { messages } from "../api/messages";
import { MONTH_NAMES } from "../format";
import { asSentence, type CellModel, type GridModel } from "./model";

const FLAG_TEXT = { strong: "◤", marginal: "○" } as const;

function MonthCell({ c }: { c: CellModel }) {
  const cls = [
    c.count === null ? `null ${c.state}` : "count",
    c.monthToDate ? "mtd" : "",
  ].filter(Boolean).join(" ");
  return (
    <td className={cls} data-month={c.month} data-state={c.state} title={c.detail.join("\n")} aria-label={asSentence(c.detail)}>
      {c.flag ? <span className={`flag ${c.flag}`} aria-hidden="true">{FLAG_TEXT[c.flag]}</span> : null}
      {c.label}
      {c.marks ? <sup className="marks">{c.marks}</sup> : null}
    </td>
  );
}

/** The calendar as a plain table: the same served values and marks as the grid. */
export function CalendarTable({ model }: { model: GridModel }) {
  const switchAfter = model.rows.findIndex((r) => r.year === model.switchYear);
  return (
    <div className="caltable-wrap">
      <table className="caltable">
        <caption>Hotspots per month by year, {model.unitLabel}</caption>
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
            <RowGroup key={row.year} row={row} switchBelow={ri === switchAfter && ri < model.rows.length - 1} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Median {model.referenceLabel}</th>
            {model.medians.map((m) => (
              <td key={m.calendarMonth} title={m.detail.join("\n")}>{m.label}</td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RowGroup({ row, switchBelow }: { row: GridModel["rows"][number]; switchBelow: boolean }) {
  const t = row.total;
  return (
    <>
      <tr className={switchBelow ? "before-switch" : undefined}>
        <th scope="row">{row.year}</th>
        {row.cells.map((c) => <MonthCell key={c.month} c={c} />)}
        <td className={`total${t && !t.complete ? " incomplete" : ""}`} title={t ? t.detail.join("\n") : undefined} aria-label={t ? asSentence(t.detail) : undefined}>
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
