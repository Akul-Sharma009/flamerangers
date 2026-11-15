import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CandidatesSection } from "../components/Candidates";
import evidenceJson from "./evidence.json";
import { CANDIDATE_REASONS, candidatesView } from "./candidates";
import type { Evidence } from "./types";

// Story 7.8 acceptance criteria.
const evidence = evidenceJson as unknown as Evidence;
const view = candidatesView(evidence);
const open = renderToStaticMarkup(<CandidatesSection view={view} open />);
const closed = renderToStaticMarkup(<CandidatesSection view={view} open={false} />);
const SINGLES = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "M1", "M2", "M3", "M4", "M5"];
const COMBINED = ["C1", "C2", "C3"];

describe("Story 7.8: all-candidates table", () => {
  it("AC1: one row for each of the 13 candidates and 3 combinations, none omitted, each with a reason", () => {
    expect(view.rows.map((r) => r.key)).toEqual([...SINGLES, ...COMBINED]);
    for (const r of view.rows) {
      expect(r.reason.length).toBeGreaterThan(10);
      expect(open).toContain(`data-candidate="${r.key}"`);
      expect(open).toContain(r.reason.replace(/'/g, "&#x27;"));
    }
    expect(Object.keys(CANDIDATE_REASONS).sort()).toEqual([...SINGLES, ...COMBINED].sort());
  });

  it("AC1: collapsed by default, with a keyboard-operable expand control", () => {
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain("<button");
    expect(closed).not.toContain("data-candidate=");
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('aria-controls="candidates-body"');
  });

  it("AC1: the table scrolls inside its own focusable region", () => {
    expect(open).toMatch(/class="h2h-scroll" role="region"[^>]*tabindex="0"/);
  });

  it("AC2: every shown number is a figure from evidence.json, printed as its display", () => {
    for (const r of view.rows) {
      for (const f of Object.values(r.cells)) {
        expect(f).not.toBeNull();
        expect(f!.source.file).toMatch(/^selection_/);
        expect(open).toContain(f!.display);
      }
    }
  });

  it("the reasons agree with the noise marks in the table", () => {
    const err = (k: string) => view.rows.find((r) => r.key === k)!.cells.error_vs_b!;
    for (const k of ["1B", "3B", "M3", "M4"]) expect(err(k).beyond_noise && Number(err(k).value) < 0).toBe(true);
    for (const k of ["2A", "3A", "4B", "M2"]) expect(err(k).beyond_noise).toBe(false);
    for (const k of ["2B", "M1", "M5"]) expect(err(k).beyond_noise && Number(err(k).value) > 0).toBe(true);
  });

  it("wording: hotspots, never fires; no sweeping claim for C1", () => {
    const all = Object.values(CANDIDATE_REASONS).join(" ").toLowerCase();
    expect(all).not.toMatch(/\bfires?\b/);
    expect(all).not.toMatch(/every|all (the )?base/);
    expect(all).not.toMatch(/\d+(\.\d+)?%/);
  });
});
