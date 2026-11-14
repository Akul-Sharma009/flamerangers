import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { buildCard, type Calendar, type Figure, type Meta, type RulerData } from "./model";
import { layoutRuler } from "./ruler";
import type { Sentences } from "./words";
import "./card.css";

/**
 * The current-month card (Story 3.7): the page's headline sentence, the line
 * that defines "usual", the ruler, and a second sentence with the highest
 * month on record. `sentences` and `rulerWidth` let tests render fixed states.
 */
export function CurrentMonthCard({
  calendar, meta, sentences, rulerWidth,
}: {
  calendar: Calendar;
  meta: Meta;
  sentences?: Sentences;
  rulerWidth?: number;
}) {
  const card = useMemo(() => buildCard(calendar, meta, sentences), [calendar, meta, sentences]);

  if (card.kind === "not_loaded") {
    return (
      <section className="reading" aria-label="This month so far">
        <p className="kicker">{card.monthLabel}</p>
        <p className="notloaded">{card.text}</p>
      </section>
    );
  }

  return (
    <section className="reading" aria-label="This month so far">
      <p className="kicker">{card.monthLabel}, to date</p>
      {card.headline !== null ? (
        <h1 className="sentence">{card.headline}</h1>
      ) : (
        <h1 className="sentence figurehead">
          <span className="n">{card.count}</span> hotspots
        </h1>
      )}
      {card.noTypical ? <p className="notypical">{card.noTypical}</p> : null}
      {card.usual !== null || card.flagged !== null ? (
        <p className="dek">
          {[card.usual, card.flagged].filter((s) => s !== null).join(" ")}
        </p>
      ) : null}
      {card.figures.length ? <Figures figures={card.figures} /> : null}
      <ul className="cardnotes">
        {card.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
        {card.noaa20 ? (
          <li>
            {card.noaa20.sentence}
            {card.noaa20.figures.length ? <Figures figures={card.noaa20.figures} small /> : null}
          </li>
        ) : null}
      </ul>
      {card.rulerCaption ? <p className="rulercap">{card.rulerCaption}</p> : null}
      <Ruler data={card.ruler} width={rulerWidth} />
      {card.recordHigh ? (
        <div className="second">
          {card.recordHigh.sentence !== null ? <p>{card.recordHigh.sentence}</p> : <Figures figures={card.recordHigh.figures} />}
        </div>
      ) : null}
    </section>
  );
}

function Figures({ figures, small = false }: { figures: Figure[]; small?: boolean }) {
  return (
    <dl className={small ? "figures small" : "figures"}>
      {figures.map((f) => (
        <div key={f.key} data-figure={f.key}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ruler({ data, width: fixedWidth }: { data: RulerData; width?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || fixedWidth !== undefined) return;
    setMeasured(el.clientWidth);
    const ro = new ResizeObserver(() => setMeasured(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedWidth]);

  const width = fixedWidth ?? measured;
  const l = width > 0 ? layoutRuler(data, width) : null;

  return (
    <div className="ruler" ref={wrapRef}>
      {l ? (
        <svg width={l.width} height={l.height} viewBox={`0 0 ${l.width} ${l.height}`} role="img" aria-label={data.name}>
          <line className="axis" x1={l.axis.x1} x2={l.axis.x2} y1={l.axis.y} y2={l.axis.y} />
          {l.past.map((p) => (
            <circle key={p.year} className="past" cx={p.x} cy={p.y} r={4} data-year={p.year}>
              <title>{p.label}</title>
            </circle>
          ))}
          {l.median ? (
            <g className="median">
              <line x1={l.median.x} x2={l.median.x} y1={30} y2={62} />
              <text x={l.median.x} y={80} textAnchor={l.median.anchor}>
                {l.median.label}
              </text>
            </g>
          ) : null}
          {l.current ? (
            // Motion: this year's mark slides along the ruler on load, the one
            // transition UI-CONCEPT.md allows (off under reduced motion).
            <g className="current" style={{ "--from": `${l.axis.x1 - l.current.x}px` } as CSSProperties}>
              <line x1={l.current.x} x2={l.current.x} y1={22} y2={35} />
              <circle className="ring" cx={l.current.x} cy={44} r={8} />
              <circle className="dot" cx={l.current.x} cy={44} r={3} />
              <text x={l.current.x} y={16} textAnchor={l.current.anchor}>
                {l.current.label}
              </text>
            </g>
          ) : null}
        </svg>
      ) : null}
      <details className="rulertable">
        <summary>Same days in each year, as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Hotspots</th>
            </tr>
          </thead>
          <tbody>
            {data.past.map((p) => (
              <tr key={p.year}>
                <td>{p.year}</td>
                <td>{p.value}</td>
              </tr>
            ))}
            {data.current ? (
              <tr className="thisyear">
                <td>{data.current.year}</td>
                <td>{data.current.value}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {data.median ? <p>{data.median.label}</p> : null}
      </details>
    </div>
  );
}
