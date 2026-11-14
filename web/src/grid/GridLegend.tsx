import { useMemo } from "react";
import { messages } from "../api/messages";
import { MARKS, buildClasses, type Calendar } from "./model";
import "./grid.css";

const STROKE = { stroke: "var(--ink)", strokeWidth: 1.2 } as const;

function Mark({ glyph }: { glyph: string }) {
  return <b className="markglyph" aria-hidden="true">{glyph}</b>;
}

/** The key to the grid and the table: class breaks, the unit, and every mark. */
export function GridLegend({ calendar }: { calendar: Calendar }) {
  const classes = useMemo(() => buildClasses(calendar), [calendar]);
  const p = messages.labels.partial_reason;
  return (
    <div className="gridlegend">
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
      <ul className="symbols">
        <li className="item">
          <svg width="22" height="12" aria-hidden="true"><line x1="0" y1="6" x2="22" y2="6" stroke="var(--ink)" strokeWidth="2" /></svg>
          {messages.notes.record_switch}
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
        <li className="item">
          <svg width="12" height="12" aria-hidden="true"><path d="M1,1 L11,1 L1,11 Z" fill="var(--ink)" /></svg>
          {messages.labels.flag_state.strong}
        </li>
        <li className="item">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" {...STROKE} /></svg>
          {messages.labels.flag_state.marginal}
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
