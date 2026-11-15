import { useMemo, type KeyboardEvent } from "react";
import { sameHighlight, type Highlight } from "../grid/highlight";
import { buildRankings, nextHighlight, type Calendar, type RankList } from "./model";
import type { RankWords } from "./words";
import "./ranks.css";

/**
 * The most active months and years (Story 3.9): the served top months, top
 * years and busiest calendar months, each with its served value and rank. Every
 * entry is a toggle button; selecting it marks the item on the calendar, and
 * selecting it again (or Escape) clears the mark. `words` lets tests pass the
 * contract's sentences; the default reads messages.yaml.
 */
export function RankingsPanel({
  calendar, highlight, onHighlight, words,
}: {
  calendar: Calendar;
  highlight: Highlight | null;
  onHighlight: (h: Highlight | null) => void;
  words?: RankWords;
}) {
  const model = useMemo(() => buildRankings(calendar, words), [calendar, words]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && highlight !== null) {
      e.preventDefault();
      onHighlight(null);
    }
  };
  return (
    <section className="rankings" aria-labelledby="rankings-heading" onKeyDown={onKey}>
      <h2 id="rankings-heading">Most active months and years</h2>
      <p className="kicker">{model.rangeLabel}</p>
      {model.rangeSentence ? <p className="rangenote">{model.rangeSentence}</p> : null}
      <div className="ranklists">
        {model.lists.map((l) => (
          <RankTable key={l.id} list={l} unit={model.unitLabel} highlight={highlight} onHighlight={onHighlight} />
        ))}
      </div>
      {(model.anyTie && model.tieNote) || model.notes.length ? (
        <ul className="ranknotes">
          {model.anyTie && model.tieNote ? <li>{model.tieNote}</li> : null}
          {model.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

function RankTable({
  list, unit, highlight, onHighlight,
}: {
  list: RankList;
  unit: string;
  highlight: Highlight | null;
  onHighlight: (h: Highlight | null) => void;
}) {
  return (
    <table className="ranktable" data-list={list.id}>
      <caption>
        {list.heading}
        <span className="unit">{unit}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col" className="rk">Rank</th>
          <th scope="col">{list.id === "years" ? "Year" : "Month"}</th>
          <th scope="col" className="val">{list.valueHeading}</th>
        </tr>
      </thead>
      <tbody>
        {list.rows.length === 0 ? (
          <tr className="empty">
            {/* An empty list ranks nothing; it is not a list of zeros. */}
            <td className="rk">–</td>
            <td colSpan={2}>{list.emptyNote ?? ""}</td>
          </tr>
        ) : (
          list.rows.map((r) => {
            const on = sameHighlight(highlight, r.highlight);
            return (
              <tr key={r.key} className={on ? "on" : undefined} data-key={r.key} data-rank={r.rank} data-tied={r.tied || undefined}>
                <td className="rk">
                  {r.rank}
                  {r.tied ? (
                    <>
                      <span aria-hidden="true">=</span>
                      <span className="sr">, tied</span>
                    </>
                  ) : null}
                </td>
                <th scope="row">
                  <button type="button" aria-pressed={on} onClick={() => onHighlight(nextHighlight(highlight, r.highlight))}>
                    {r.name}
                  </button>
                </th>
                <td className="val">{r.value}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
