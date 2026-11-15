import type { Calendar } from "../api/client";
import { TREND_CITATIONS } from "../about/citations";
import { buildTrend } from "./model";
import "./trend.css";

const W = 300, H = 56, GAP = 2, TOP = 14, LABEL = 14;

/**
 * Story 8.6: the trend test on the annual totals, with its name, result and p-value, the record
 * switch marked on a strip of the yearly totals (bar length is the served share_of_max), and the
 * caution that a step at the switch can look like a trend. Years the test left out are drawn pale.
 */
export function TrendIndicator({ calendar }: { calendar: Calendar }) {
  const t = calendar.trend;
  // A service older than contract 0.5.0 sends no trend: show nothing rather than fail the page.
  if (!t) return null;
  const v = buildTrend(t);
  if (!v.result) return null;
  const years = calendar.year_totals;
  const left = new Set(t.left_out.map((y) => y.year));
  const w = (W - GAP * (years.length - 1)) / Math.max(years.length, 1);
  const x = (i: number) => i * (w + GAP);
  const sw = years.findIndex((y) => y.year === 2022); // the switch falls before the first bar of 2022
  return (
    <section className="trend" aria-labelledby="trend-heading" data-status={t.status} data-direction={t.direction ?? ""}>
      <h2 id="trend-heading">{v.heading}</h2>
      <p className="trendtest">{v.testName}</p>
      <p className="trendresult" data-testid="trend-result">{v.result}</p>
      {years.length > 1 && !v.refused ? (
        <svg viewBox={`0 0 ${W} ${TOP + H + LABEL}`} role="img" aria-label={`${v.heading}: ${years[0].year} to ${years[years.length - 1].year}`} className="trendstrip">
          <g transform={`translate(0,${TOP})`}>
          {years.map((y, i) => (
            <rect key={y.year} x={x(i)} y={H - H * (y.share_of_max ?? 0)} width={w} height={H * (y.share_of_max ?? 0)}
              className={left.has(y.year) ? "bar out" : "bar"}><title>{y.year}</title></rect>
          ))}
          {years.map((y, i) => (i === 0 || i === years.length - 1 || left.has(y.year) ? (
            <text key={`l${y.year}`} className="yearlabel" x={x(i) + w / 2} y={H + 12}
              textAnchor={i === 0 ? "start" : i === years.length - 1 ? "end" : "middle"}
              {...(i === 0 ? { x: x(i) } : i === years.length - 1 ? { x: x(i) + w } : {})}>{y.year}</text>
          ) : null))}
          {t.record_switch_inside && sw > 0 ? (
            <g className="switch" data-testid="trend-switch">
              <line x1={x(sw) - GAP / 2} x2={x(sw) - GAP / 2} y1={0} y2={H + 4} />
              <text x={x(sw) - GAP / 2} y={-4} textAnchor="middle">record switch</text>
            </g>
          ) : null}
          </g>
        </svg>
      ) : null}
      {v.switchMarked ? <p className="trendnote">{v.switchMarked}</p> : null}
      {v.switchCaution ? <p className="trendcaution" role="note">{v.switchCaution}</p> : null}
      {v.leftOut ? <p className="trendnote">{v.leftOut}</p> : null}
      {v.level ? <p className="trendnote">{v.level}</p> : null}
      <details className="trendsources">
        <summary>Sources</summary>
        <ul>
          {TREND_CITATIONS.map((c) => (
            <li key={c.text}>
              {c.text}{" "}
              {c.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
              ))}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
