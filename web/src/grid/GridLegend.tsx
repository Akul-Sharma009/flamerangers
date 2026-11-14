import { useMemo } from "react";
import { messages } from "../api/messages";
import { buildClasses, type Calendar } from "./model";
import "./grid.css";

const STROKE = { stroke: "var(--ink)", strokeWidth: 1.2 } as const;

export function GridLegend({ calendar }: { calendar: Calendar }) {
  // Only the classes are needed; meta is not read by that part of the model.
  const classes = useMemo(
    () => buildClasses(calendar),
    [calendar],
  );
  return (
    <div className="gridlegend">
      <span className="ramp" aria-label="Colour classes, lower bound of each">
        {classes.map((c) => (
          <span className="step" key={c.index}>
            <i style={{ background: `var(--c${c.index})` }} />
            <span>{c.label}</span>
          </span>
        ))}
      </span>
      <span className="item">
        <svg width="12" height="12" aria-hidden="true"><path d="M1,1 L11,1 L1,11 Z" fill="var(--ink)" /></svg>
        {messages.labels.flag_state.strong}
      </span>
      <span className="item">
        <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" {...STROKE} /></svg>
        {messages.labels.flag_state.marginal}
      </span>
      <span className="item">
        <svg width="16" height="12" aria-hidden="true">
          <rect x="1" y="1" width="14" height="10" fill="none" {...STROKE} strokeWidth={2} strokeDasharray="3 2" />
        </svg>
        {messages.labels.partial_reason.data_through}
      </span>
      <span className="item">
        <svg width="16" height="12" aria-hidden="true">
          <defs>
            <pattern id="lg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--rule)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0.5" y="0.5" width="15" height="11" fill="url(#lg-hatch)" stroke="var(--rule)" />
        </svg>
        {messages.labels.null_reason.outside_record}
      </span>
      <span className="item">
        <svg width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" {...STROKE} />
          <text x="8" y="11.3" textAnchor="middle" fontSize="9.5" fill="var(--ink)" fontFamily="var(--num)">1</text>
        </svg>
        Year total rank
      </span>
      {/* TODO(label): the hollow bar marks an incomplete year; it gets a legend entry once
          messages.yaml has a label for it (raised with the lead). */}
    </div>
  );
}
