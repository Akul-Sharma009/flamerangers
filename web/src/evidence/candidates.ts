import type { Evidence, EvidenceTable, Figure } from "./types";

// Story 7.8: every candidate scored on the selection set. The figures come from
// evidence.json and are printed as they stand (AD-8). The reasons are words from the
// selection record; they carry no numbers, so every number on the page is a figure.

export const CANDIDATES_COPY = {
  heading: "Every candidate, not only the pick",
  intro:
    "The method was chosen from 13 single approaches and 3 combinations, all scored on the same selection set. Each one is below, with why it was not the pick.",
  open: "Show all 16 candidates",
  close: "Hide all 16 candidates",
  approachHeader: "Candidate",
  reasonHeader: "Why it was not the pick",
  singlesGroup: "Single approaches",
  combinedGroup: "Combinations",
  scope: "Scores are on the selection set, pooled over its three regions at 1°. The final set scored only 4A, 1A and C1.",
} as const;

export type Reason = { text: string };

// Wording approved by the lead on 15 Nov (DECISIONS.md, Story 7.8).
export const CANDIDATE_REASONS: Record<string, string> = {
  "1A": "Within noise of 4A on each measure. Replaced by C1, a blend of the two, which beat it on count error beyond noise on both the selection and the final set.",
  "1B": "Count error was higher than the one global factor (b), beyond noise.",
  "2A": "Within noise of (b) on count error: no gain over the simple factor.",
  "2B": "Beat (b) on count error, but by less than half of what 4A gained.",
  "3A": "Within noise of (b) on count error: no gain over the simple factor.",
  "3B": "Count error far higher than (b), beyond noise.",
  "4A": "Best single approach. Replaced by C1, which beat it on count error beyond noise on both the selection and the final set.",
  "4B": "Within noise of (b) on count error: no gain over the simple factor.",
  M1: "Beat (b) on count error, but by less than half of what 4A gained.",
  M2: "Within noise of (b) on count error: no gain over the simple factor.",
  M3: "Count error was higher than (b), beyond noise.",
  M4: "Count error was far higher than (b), beyond noise, and it missed more than half of the true anomalies.",
  M5: "Beat (b) on count error, but by less than half of what 4A gained.",
  C1: "The pick. Its season-dependent blend of 4A and 1A beat 4A, 1A and C2 on count error beyond noise.",
  C2: "A single flat blend weight. C1 beat it on count error beyond noise.",
  C3: "The same design as C1 with no difference in score, so C1 was taken forward.",
};

export interface CandidateRow {
  key: string;
  label: string;
  group: "singles" | "combined";
  reason: string;
  cells: Record<string, Figure | null>;
}

export interface CandidatesView {
  title: string;
  note: string | null | undefined;
  columns: EvidenceTable["columns"];
  rows: CandidateRow[];
}

export function candidatesView(evidence: Evidence): CandidatesView {
  const table = evidence.tables.find((t) => t.id === "selection.candidates");
  if (!table) throw new Error("evidence.json has no selection.candidates table");
  return {
    title: table.title,
    note: table.note,
    columns: table.columns,
    rows: table.rows.map((r) => {
      const reason = CANDIDATE_REASONS[r.key];
      if (!reason) throw new Error(`no reason for candidate ${r.key}`);
      return { key: r.key, label: r.label, group: r.key.startsWith("C") ? "combined" : "singles", reason, cells: r.cells };
    }),
  };
}
