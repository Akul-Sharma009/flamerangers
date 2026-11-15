// Story 8.4: the reference period control. It sits under the current-month card, whose "usual" it
// changes, and says that the flags keep their own years. Every word is a contract sentence.
import { useEffect, useState } from "react";
import type { Calendar, Meta } from "../api/client";
import { messages } from "../api/messages";
import { fill } from "../card/words";
import { choosableYears, isDefault, usable, type YearRange } from "./period";
import "./reference.css";

const S = () => messages.sentences ?? {};

export function ReferencePeriodControl({
  calendar, meta, onChange, busy = false,
}: {
  /** The served answer: its reference_period is the one in use, its flag_reference_years the flags'. */
  calendar: Calendar;
  meta: Meta;
  /** null asks for the served default. */
  onChange: (p: YearRange | null) => void;
  busy?: boolean;
}) {
  const used = calendar.reference_period;
  const [draft, setDraft] = useState<YearRange>(used);
  useEffect(() => setDraft(calendar.reference_period), [calendar]);
  const years = choosableYears(meta);
  const ok = usable(draft, meta);
  const changed = draft.start_year !== used.start_year || draft.end_year !== used.end_year;
  const def = meta.reference_period;
  const s = S();
  const label = s.reference_period_label ?? null;
  const flags = fill(s.reference_period_flags, {
    flag_start: String(calendar.flag_reference_years.start_year), flag_end: String(calendar.flag_reference_years.end_year),
  });
  const limits = fill(s.reference_period_limits, {
    first: String(def.start_year), last: String(def.end_year),
    min_years: meta.reference_period_min_years === undefined ? null : String(meta.reference_period_min_years),
  });
  const reset = fill(s.reference_period_reset, { reference_start: String(def.start_year), reference_end: String(def.end_year) });

  return (
    <form
      className="refperiod"
      aria-label={label ?? undefined}
      onSubmit={(e) => {
        e.preventDefault();
        if (ok && changed) onChange(isDefault(draft, meta) ? null : draft);
      }}
    >
      <fieldset disabled={busy}>
        {label ? <legend>{label}</legend> : null}
        <div className="refperiod-row">
          <label>
            <span className="vh">First year</span>
            <select
              value={draft.start_year}
              onChange={(e) => setDraft({ ...draft, start_year: Number(e.target.value) })}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span className="vh">Last year</span>
            <select
              value={draft.end_year}
              onChange={(e) => setDraft({ ...draft, end_year: Number(e.target.value) })}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <button type="submit" className="primary" disabled={!ok || !changed}>Compare</button>
          {!isDefault(used, meta) && reset ? (
            <button type="button" onClick={() => onChange(null)}>{reset}</button>
          ) : null}
        </div>
        {limits ? <p className={`refperiod-limits${ok ? "" : " bad"}`} role={ok ? undefined : "alert"}>{limits}</p> : null}
        {flags ? <p className="refperiod-flags" data-field="calendar.flag_reference_years">{flags}</p> : null}
      </fieldset>
    </form>
  );
}
