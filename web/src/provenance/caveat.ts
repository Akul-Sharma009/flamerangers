// The region caveat beside the map and the calendar (Story 3.6, AD-4).
//
// Where it appears follows the served `aoi.region_caveat` only, which the
// service sets from each 1° cell's evidence_class and the evaluated-region
// boundaries. No land-cover dataset is read here or anywhere in the web.
//
// Its words: the opening sentence is the contract's (messages.labels.region_caveat),
// and every result is a fixed claim from evidence/claims.yaml, taken from
// evidence.json by id and quoted whole. Nothing here holds a number (AD-8).
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import type { Claim, Evidence } from "../evidence/types";

type S = components["schemas"];
type Aoi = S["Aoi"];
export type EvidenceClass = S["EvidenceClass"];
export type CaveatKind = Exclude<S["RegionCaveat"], "none">;

/** Reading order of the evidence classes, from best to least supported. */
export const EVIDENCE_CLASSES: EvidenceClass[] = ["tuned", "tested_unseen", "reported_only", "not_evaluated"];

/**
 * The fixed claim each caveat quotes, from evidence/claims.yaml (approved by
 * the lead on 15 Nov). If evidence.json lacks it, the caveat shows only the
 * contract's sentence: no other claim stands in for it.
 */
export const CAVEAT_CLAIM: Record<CaveatKind, string> = {
  untuned_region: "caveat-untuned-region",
  southern_africa: "caveat-southern-africa",
};

export interface CaveatModel {
  kind: CaveatKind;
  /** The contract's sentence: the area is outside the regions the method was tuned on. */
  lead: string;
  /** The caveat's fixed claim, quoted word for word. null until evidence.json has loaded, or if it lacks the claim. */
  claim: Claim | null;
  /** The evidence classes the area's 1° cells fall in, in reading order. */
  classes: EvidenceClass[];
}

/** Which caveat the area carries, read from the served field and nothing else. */
export function caveatKind(aoi: Aoi): CaveatKind | null {
  return aoi.region_caveat === "none" ? null : aoi.region_caveat;
}

/** Classes with at least one of the area's cells (a served count, compared with 0 only). */
export function presentClasses(aoi: Aoi): EvidenceClass[] {
  return EVIDENCE_CLASSES.filter((k) => aoi.evidence_class_counts[k] !== 0);
}

export function buildCaveat(aoi: Aoi, evidence: Evidence | null): CaveatModel | null {
  const kind = caveatKind(aoi);
  if (!kind) return null;
  const claim = evidence?.claims.find((c) => c.id === CAVEAT_CLAIM[kind]) ?? null;
  return { kind, lead: messages.labels.region_caveat[kind], claim, classes: presentClasses(aoi) };
}
