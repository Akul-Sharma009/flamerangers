// The shape of evidence.json, as contract/evidence.schema.json describes it.
// The file is written by evidence/build.py; the web prints each figure's
// `display` and never reads `value` to round, compare or recompute it (AD-8).

export type EvidenceSet = "selection" | "final" | "reported_only" | "noaa20_check";

export interface Figure {
  name?: string;
  value: number | boolean | string;
  display: string;
  interval?: { lo: number; hi: number; display: string } | null;
  beyond_noise?: boolean | null;
  source: { file: string; pointer: string };
}

export interface Claim {
  id: string;
  text: string;
  used_for_pick: boolean;
  figures: Figure[];
}

export interface EvidenceTable {
  id: string;
  title: string;
  set: EvidenceSet;
  note?: string | null;
  columns: { key: string; label: string; unit?: string | null }[];
  rows: { key: string; label: string; cells: Record<string, Figure | null> }[];
}

export interface Evidence {
  schema_version: string;
  sources: { file: string; sha256: string; set: EvidenceSet; label: string; run_id?: string | null }[];
  claims: Claim[];
  tables: EvidenceTable[];
}
