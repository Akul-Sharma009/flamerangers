import { useEffect, useState } from "react";
import { aboutClaims, type ClaimTexts } from "../about/about";
import { AboutView } from "../about/AboutView";
import { client, type Meta } from "../api/client";
import { messages } from "../api/messages";
import { REPO_URL } from "../config";
import type { Evidence } from "../evidence/types";

// The same lazy chunk as the evidence view: the claims this page quotes live in
// evidence.json, which stays out of the calendar's bundle.
const loadEvidence = () => import("../evidence/evidence.json").then((m) => m.default as unknown as Evidence);

type State =
  | { kind: "loading" }
  | { kind: "ready"; meta: Meta; claims: ClaimTexts }
  | { kind: "problem"; text: string };

export function AboutPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    Promise.all([
      client.getMeta().catch(() => Promise.reject(messages.client.service_unreachable)),
      loadEvidence().catch(() => Promise.reject(messages.client.evidence_unavailable)),
    ]).then(
      ([meta, evidence]) => live && setState({ kind: "ready", meta, claims: aboutClaims(evidence) }),
      (text: string) => live && setState({ kind: "problem", text }),
    );
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === "loading") {
    return <main className="page"><p className="loading">Loading…</p></main>;
  }
  if (state.kind === "problem") {
    return <main className="page"><p className="problem" role="alert">{state.text}</p></main>;
  }
  return <AboutView meta={state.meta} claims={state.claims} repoUrl={REPO_URL} />;
}
