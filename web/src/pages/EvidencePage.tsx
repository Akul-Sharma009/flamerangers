import { useEffect, useState, type ReactNode } from "react";
import { messages } from "../api/messages";
import { HeadToHead } from "../components/HeadToHead";
import { REPO_URL } from "../config";
import { COPY, RECORD_FILES, outcomeView, repoLink, type OutcomeView } from "../evidence/outcome";
import type { Evidence } from "../evidence/types";

// evidence.json (about 2.3 MB) is loaded only when this view opens, so it stays
// out of the calendar's bundle.
const loadEvidence = () => import("../evidence/evidence.json").then((m) => m.default as unknown as Evidence);

type State = { kind: "loading" } | { kind: "ready"; view: OutcomeView; evidence: Evidence } | { kind: "problem" };

export function EvidencePage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    loadEvidence().then(
      (evidence) => live && setState({ kind: "ready", view: outcomeView(evidence), evidence }),
      () => live && setState({ kind: "problem" }),
    );
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === "loading") {
    return <main className="page"><p className="loading">Loading…</p></main>;
  }
  if (state.kind === "problem") {
    return <main className="page"><p className="problem" role="alert">{messages.client.evidence_unavailable}</p></main>;
  }
  return <EvidenceOutcome view={state.view} repoUrl={REPO_URL}><HeadToHead evidence={state.evidence} /></EvidenceOutcome>;
}

/** The first screen: the outcome, what it means for the record, the method, and the planning files.
 * The sections below it (Story 5.4 on) come in as children and span the full width. */
export function EvidenceOutcome({ view, repoUrl, children }: { view: OutcomeView; repoUrl: string | null; children?: ReactNode }) {
  return (
    <main className="page evidence">
      <section className="outcome" aria-labelledby="outcome-title">
        <p className="kicker">{COPY.kicker}</p>
        <h1 id="outcome-title">{COPY.title}</h1>
        <p className="lead" data-claim={view.outcome.id}>{view.outcome.text}</p>

        <h2>{COPY.recordHeading}</h2>
        <p className="claim" data-claim={view.record.id}>{view.record.text}</p>
        <p>{COPY.recordAfter}</p>

        <h2>{COPY.scoresHeading}</h2>
        <ol className="claims">
          {view.scores.map((c) => (
            <li key={c.id} data-claim={c.id}>{c.text}</li>
          ))}
        </ol>
        <p className="aside">{COPY.scoresNote}</p>
      </section>

      <aside className="method" aria-label="Method and record">
        <section aria-labelledby="method-title">
          <h2 id="method-title">{COPY.methodHeading}</h2>
          <p>{COPY.methodIntro}</p>
          <ul className="parts">
            {COPY.methodParts.map((p) => (
              <li key={p.name}><strong>{p.name}</strong> {p.text}</li>
            ))}
          </ul>
          <p>{COPY.methodBlend}</p>
          <p className="rule">{messages.notes.record_switch} {COPY.methodScope}</p>
        </section>

        <section aria-labelledby="files-title">
          <h2 id="files-title">{COPY.filesHeading}</h2>
          <p>{COPY.filesIntro}</p>
          <ul className="files">
            {RECORD_FILES.map((f) => {
              const href = repoLink(repoUrl, f.path);
              return (
                <li key={f.path}>
                  {href ? <a href={href}>{f.label}</a> : <span className="label">{f.label}</span>}{" "}
                  <code>{f.path}</code>: {f.what}
                </li>
              );
            })}
          </ul>
          {repoUrl === null && <p className="aside">{COPY.filesPending}</p>}
        </section>
      </aside>
      {children}
    </main>
  );
}
