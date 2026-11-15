// The picker's dates tab (Story 3.4): a first and last day, checked against the
// served bounds and sent as typed. Every date and period shown here is served
// (/meta); the panel only formats them.
import { useState, type FormEvent } from "react";
import type { DateRange, Meta } from "../api/client";
import { messages } from "../api/messages";
import { formatDay } from "../format";
import { checkRange, earlierDay, laterDay, type DateField, type RangeProblem, type RangeResult } from "./dates";

/** The contract's sentence for each refused range (messages.yaml client, 0.4.0). */
export const REFUSAL = {
  unreadable: "date_unreadable",
  before_record: "date_before_record",
  after_data_through: "date_after_data_through",
  out_of_order: "dates_out_of_order",
} as const satisfies Record<RangeProblem, keyof typeof messages.client>;

/** What the dates tab needs, all served: the bounds and reference period from /meta, and the range on show. */
export interface DatesSetting {
  bounds: DateRange;
  referencePeriod: Meta["reference_period"];
  /** The range on show: the one asked for, or the bounds on first load. */
  current: DateRange;
}

interface Props {
  dates: DatesSetting | null;
  onSelectRange: (range: DateRange | null) => void;
  initialRefusal?: DateRange;
}

export function DatesPanel({ dates, onSelectRange, initialRefusal }: Props) {
  const [start, setStart] = useState(initialRefusal?.start ?? dates?.current.start ?? "");
  const [end, setEnd] = useState(initialRefusal?.end ?? dates?.current.end ?? "");
  const [refusal, setRefusal] = useState<RangeResult | null>(() =>
    initialRefusal && dates ? checkRange(initialRefusal.start, initialRefusal.end, dates.bounds) : null,
  );

  if (!dates) {
    return (
      <div role="tabpanel" id="picker-panel-dates" aria-labelledby="picker-tab-dates">
        <p className="loading">Loading…</p>
      </div>
    );
  }

  const { bounds, referencePeriod } = dates;
  const bad = refusal && !refusal.ok ? refusal : null;
  const badField = (f: DateField) => (bad?.fields.includes(f) ? true : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = checkRange(start, end, bounds);
    setRefusal(result);
    if (result.ok) onSelectRange(result.range);
  };

  // The browser's own date checks (required, min, max) stop a refused range
  // before submit and say why in the browser's words. checkRange marks the
  // fields if one gets through (a browser without date inputs).
  // Each refusal has its contract sentence (0.4.0).
  const fields = [
    { field: "start" as const, label: "From", value: start, set: setStart, min: bounds.start, max: earlierDay(end, bounds.end) },
    { field: "end" as const, label: "To", value: end, set: setEnd, min: laterDay(start, bounds.start), max: bounds.end },
  ];

  return (
    <form
      role="tabpanel"
      id="picker-panel-dates"
      aria-labelledby="picker-tab-dates"
      className="typed dates"
      onSubmit={submit}
      data-problem={bad?.problem}
    >
      <div className="corners">
        {fields.map(({ field, label, value, set, min, max }) => (
          <label key={field} className={badField(field) ? "bad" : undefined}>
            <span>{label}</span>
            <input
              type="date"
              name={field}
              required
              min={min}
              max={max}
              value={value}
              aria-invalid={badField(field)}
              onChange={(ev) => {
                set(ev.target.value);
                setRefusal(null);
              }}
            />
          </label>
        ))}
      </div>
      {bad && (
        <p className="refusal" role="alert">
          {messages.client[REFUSAL[bad.problem]]}
        </p>
      )}
      <dl className="bounds">
        <dt>Record</dt>
        <dd data-field="meta.data_through">
          {formatDay(bounds.start)} to {formatDay(bounds.end)}
        </dd>
        <dt>Reference period</dt>
        <dd data-field="meta.reference_period">
          {referencePeriod.start_year} to {referencePeriod.end_year}
        </dd>
      </dl>
      <p className="note">{messages.notes.range_and_reference}</p>
      <div className="picker-actions">
        <button type="submit" className="primary">
          Show these dates
        </button>
        <button type="button" onClick={() => onSelectRange(null)}>
          Whole record
        </button>
      </div>
    </form>
  );
}
