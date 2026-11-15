import { useState } from "react";
import { CANDIDATES_COPY as T, candidatesView, type CandidatesView } from "../evidence/candidates";
import type { Evidence } from "../evidence/types";
import { Fig, Noise } from "./HeadToHead";
import "./HeadToHead.css";
import "./Candidates.css";

// Story 7.8. Prints each figure's `display` as evidence.json holds it; no number is
// computed here (AD-8). Collapsed until the reader opens it.

export function Candidates({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  return <CandidatesSection view={candidatesView(evidence)} open={open} onToggle={() => setOpen(!open)} />;
}

/** Pure, so the tests can render it open or closed. */
export function CandidatesSection({ view, open, onToggle }: { view: CandidatesView; open: boolean; onToggle?: () => void }) {
  const groups = [
    { key: "singles", label: T.singlesGroup },
    { key: "combined", label: T.combinedGroup },
  ] as const;
  return (
    <section className="h2h candidates" aria-labelledby="candidates-title" data-open={String(open)}>
      <h2 id="candidates-title">{T.heading}</h2>
      <p className="intro">{T.intro}</p>
      <button type="button" className="candidates-toggle" aria-expanded={open} aria-controls="candidates-body" onClick={onToggle}>
        {open ? T.close : T.open}
      </button>
      <div id="candidates-body" hidden={!open}>
        {open && (
          <>
            <p className="aside">{T.scope}</p>
            <div className="h2h-scroll" role="region" aria-label={view.title} tabIndex={0}>
              <table className="h2h-table candidates-table" aria-label={view.title}>
                <thead>
                  <tr>
                    <th scope="col">{T.approachHeader}</th>
                    {view.columns.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
                    <th scope="col" className="reason">{T.reasonHeader}</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key} data-group={g.key}>
                    <tr className="group"><th colSpan={view.columns.length + 2} scope="rowgroup">{g.label}</th></tr>
                    {view.rows.filter((r) => r.group === g.key).map((r) => (
                      <tr key={r.key} data-candidate={r.key} className={r.key === "C1" ? "pick" : undefined}>
                        <th scope="row">{r.label}</th>
                        {view.columns.map((c) => {
                          const f = r.cells[c.key];
                          return (
                            <td key={c.key} data-col={c.key}>
                              <Fig f={f} />
                              {f?.interval && <> <Noise f={f} /><span className="sub">{f.interval.display}</span></>}
                            </td>
                          );
                        })}
                        <td className="reason">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            {view.note && <p className="aside">{view.note}</p>}
          </>
        )}
      </div>
    </section>
  );
}
