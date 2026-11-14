import { useMemo } from "react";
import { messages } from "../api/messages";
import { anomalyScaleText, buildAnomalyClasses, type GridSentences } from "./anomaly";
import { MARKS, buildClasses, type Calendar, type Measure } from "./model";
import "./grid.css";

const STROKE = { stroke: "var(--ink)", strokeWidth: 1.2 } as const;

function Mark({ glyph }: { glyph: string }) {
  return <b className="markglyph" aria-hidden="true">{glyph}</b>;
}

/** The key to the grid and the table: class breaks, the unit, and every mark. */
export function GridLegend({ calendar, measure = "count", sentences }: { calendar: Calendar; measure?: Measure; sentences?: GridSentences }) {
  const classes = useMemo(() => buildClasses(calendar), [calendar]);
  const anomalyClasses = useMemo(() => buildAnomalyClasses(calendar), [calendar]);
  const p = messages.labels.partial_reason;
  return (
    <div className="gridlegend" data-measure={measure}>
      {measure === "anomaly" ? (
        <div className="scale">
          {/* sentences.anomaly_scale once contract 0.4.0 merges; until then a label naming the served period. */}
          <span className="unit">{anomalyScaleText(calendar.reference_period, sentences)}</span>
          <span className="ramp" role="list" aria-label="Anomaly classes, lower bound of each">
            {anomalyClasses.map((c) => (
              <span className="step" role="listitem" key={c.index} data-tone={c.tone}>
                <i style={{ background: `var(--a-${c.tone})` }} />
                <span>{c.label}</span>
              </span>
            ))}
          </span>
        </div>
      ) : (
        <div className="scale">
          <span className="unit">{calendar.unit_label}, lower bound of each class</span>
          <span className="ramp" role="list" aria-label="Colour classes, lower bound of each">
            {classes.map((c) => (
              <span className="step" role="listitem" key={c.index}>
                <i style={{ background: `var(--c${c.index})` }} />
                <span>{c.label}</span>
              </span>
            ))}
          </span>
        </div>
      )}
      <ul className="symbols">
        {measure === "anomaly" ? (
          <li className="item" data-legend="no-anomaly">
            <svg width="16" height="12" aria-hidden="true"><rect x="0.5" y="0.5" width="15" height="11" fill="var(--paper)" stroke="var(--rule)" /></svg>
            {messages.notes.no_typical_activity}
          </li>
        ) : null}
        <li className="item">
          <svg width="22" height="12" aria-hidden="true"><line x1="0" y1="6" x2="22" y2="6" stroke="var(--ink)" strokeWidth="2" /></svg>
          {messages.notes.record_switch}
        </li>
        <li className="item" data-legend="satellite-switch">
          <svg width="16" height="14" aria-hidden="true">
            <rect x="5" y="1" width="10" height="12" fill="var(--c2)" />
            <line x1="4" y1="0" x2="4" y2="14" stroke="var(--ink)" strokeWidth="2" />
          </svg>
          {messages.notes.satellite_switch}
        </li>
        <li className="item">
          <svg width="16" height="12" aria-hidden="true">
            <defs>
              <pattern id="lg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--rule)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0.5" y="0.5" width="15" height="11" fill="url(#lg-hatch)" stroke="var(--rule)" />
          </svg>
          {messages.labels.null_reason.outside_record}
        </li>
        <li className="item">
          <svg width="16" height="12" aria-hidden="true">
            <defs>
              <pattern id="lg-dots" width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1" fill="var(--rule)" />
              </pattern>
            </defs>
            <rect x="0.5" y="0.5" width="15" height="11" fill="url(#lg-dots)" stroke="var(--rule)" />
          </svg>
          {messages.labels.null_reason.outside_coverage}
        </li>
        <li className="item">
          <svg width="16" height="12" aria-hidden="true">
            <rect x="1" y="1" width="14" height="10" fill="none" {...STROKE} strokeWidth={2} strokeDasharray="3 2" />
          </svg>
          {p.data_through}
        </li>
        <li className="item"><Mark glyph={MARKS.nrt} />{messages.labels.quality.NRT}</li>
        <li className="item"><Mark glyph={MARKS.incomplete} />{p.record_start} {p.missing_days}</li>
        <li className="item"><Mark glyph={MARKS.cut} />{p.range_cut}</li>
        <li className="item" data-legend="flag-strong">
          <svg width="12" height="12" aria-hidden="true"><path d="M1,1 L11,1 L1,11 Z" fill="var(--ink)" /></svg>
          <span>{messages.labels.flag_state.strong} {messages.notes.strong_tier}</span>
        </li>
        <li className="item" data-legend="flag-marginal">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" {...STROKE} /></svg>
          {messages.labels.flag_state.marginal}
        </li>
        <li className="item" data-legend="flag-scale">
          <svg width="12" height="12" aria-hidden="true"><rect x="0.6" y="0.6" width="10.8" height="10.8" fill="none" {...STROKE} /></svg>
          {messages.notes.flag_scale}
        </li>
        <li className="item">
          <svg width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" {...STROKE} />
            <text x="8" y="11.3" textAnchor="middle" fontSize="9.5" fill="var(--ink)" fontFamily="var(--num)">1</text>
          </svg>
          Year total rank
        </li>
        <li className="item">
          <svg width="22" height="12" aria-hidden="true">
            <rect x="0.6" y="2" width="20" height="8" fill="none" stroke="var(--muted)" strokeWidth="1.2" />
          </svg>
          {messages.notes.year_incomplete}
        </li>
      </ul>
    </div>
  );
}
