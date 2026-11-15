import { messages } from "../api/messages";
import type { Series } from "./model";
import { SPLICE_LOADING, TOGGLE_LABEL, TOGGLE_RAW, TOGGLE_RECORD } from "./words";
import "./splice.css";

export function SpliceToggle({ series, onChange, loading, failed }: {
  series: Series; onChange: (s: Series) => void; loading: boolean; failed: boolean;
}) {
  return (
    <div className="splicetoggle">
      <div role="group" aria-label={TOGGLE_LABEL} className="splicebuttons">
        <span>{TOGGLE_LABEL}</span>
        <button type="button" aria-pressed={series === "record"} onClick={() => onChange("record")}>{TOGGLE_RECORD}</button>
        <button type="button" aria-pressed={series === "raw"} onClick={() => onChange("raw")}>{TOGGLE_RAW}</button>
      </div>
      <p className="splicenote" role="status">
        {failed ? messages.client.service_unreachable : loading ? SPLICE_LOADING : series === "raw"
          ? `${messages.notes.raw_splice_toggle} ${messages.notes.raw_splice_jump}` : messages.notes.raw_splice_toggle}
      </p>
    </div>
  );
}
