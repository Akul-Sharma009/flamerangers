import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "../api/messages";
import { EvidenceOutcome } from "../pages/EvidencePage";
import { routeFromHash, ROUTES } from "../route";
import evidenceJson from "./evidence.json";
import { COPY, OUTCOME_CLAIM, RECORD_CLAIM, RECORD_FILES, SCORE_CLAIMS, outcomeView, repoLink } from "./outcome";
import type { Evidence } from "./types";

const evidence = evidenceJson as unknown as Evidence;
const view = outcomeView(evidence);
const REPO = "https://example.org/owner/repo";

/** Rendered page as plain text: tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function claimText(id: string): string {
  const c = evidence.claims.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c.text;
}

describe("Story 5.3: the outcome in plain words", () => {
  const html = renderToStaticMarkup(<EvidenceOutcome view={view} repoUrl={REPO} />);
  const page = text(html);

  it("AC1: the evidence view is in the top navigation", () => {
    const evidenceRoute = ROUTES.find((r) => r.id === "evidence");
    expect(evidenceRoute?.label).toBe("Evidence");
    expect(routeFromHash(evidenceRoute!.hash)).toBe("evidence");
  });

  it("AC1: the top states the outcome row and the recorded deviation, from claims.yaml word for word", () => {
    const lead = claimText(OUTCOME_CLAIM);
    expect(lead).toContain('the outcome was "nothing beat one global factor"');
    expect(lead).toContain("kept C1 as a recorded deviation");
    // The lead sentence is the first thing after the page title.
    const afterTitle = page.slice(page.indexOf(COPY.title) + COPY.title.length).trimStart();
    expect(afterTitle.startsWith(lead)).toBe(true);
  });

  it("AC1: it says what the outcome means for the record", () => {
    expect(page).toContain(claimText(RECORD_CLAIM));
    expect(page).toContain(COPY.recordAfter);
    expect(page).toContain(messages.notes.record_switch);
  });

  it("every claim on the page is printed word for word, in the planned order", () => {
    const ids = [...html.matchAll(/data-claim="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual([OUTCOME_CLAIM, RECORD_CLAIM, ...SCORE_CLAIMS]);
    for (const id of ids) expect(page).toContain(claimText(id));
  });

  it("AC2: the method is explained in plain words and changes only months from January 2022", () => {
    expect(page).toContain("transfer table");
    expect(page).toContain("per-footprint detection model");
    expect(page).toContain("fire season");
    expect(messages.notes.record_switch).toContain("from January 2022");
    expect(page).toContain(`${messages.notes.record_switch} ${COPY.methodScope}`);
  });

  it("AC3: it links to the guardrails, the test plan and the selection record in the public repo", () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      `${REPO}/blob/master/docs/planning/GUARDRAILS.md`,
      `${REPO}/blob/master/docs/planning/test-plan.md`,
      `${REPO}/blob/master/docs/planning/DECISIONS.md`,
    ]);
    expect(page).not.toContain(COPY.filesPending);
  });

  it("AC3: with no repository address the files are named, not linked", () => {
    const bare = renderToStaticMarkup(<EvidenceOutcome view={view} repoUrl={null} />);
    expect(bare).not.toContain("href=");
    for (const f of RECORD_FILES) expect(bare).toContain(f.path);
    expect(text(bare)).toContain(COPY.filesPending);
    expect(repoLink(null, "x")).toBeNull();
  });

  // Banned wording in the typed words is caught by evidence/wording.py, which scans web/src.
  it("the typed words hold no number (AD-8)", () => {
    const typed = JSON.stringify(COPY).replace(/\b(C1|4A|1A)\b/g, "");
    expect(typed).not.toMatch(/\d/);
  });

  it('says "hotspots", never "fires"', () => {
    expect(page).not.toMatch(/\bfires\b/i);
    expect(page).toContain("hotspots");
  });

  it("a missing claim fails instead of leaving a gap", () => {
    const without = { ...evidence, claims: evidence.claims.filter((c) => c.id !== OUTCOME_CLAIM) };
    expect(() => outcomeView(without)).toThrow(OUTCOME_CLAIM);
  });
});
