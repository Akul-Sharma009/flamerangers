// The sentences the area selector shows. Every one comes from
// contract/messages.yaml; this file only picks which.
import type { ProblemCode } from "../api/client";
import { messages } from "../api/messages";
import type { TypedProblem } from "./typed";

/**
 * The sentence for refused typed coordinates.
 *
 * TODO(label): messages.yaml 0.2.0 has one invalid_aoi sentence and no separate
 * sentence for out of range, out of order and not closed; raised with the lead.
 * Until they exist, every case shows invalid_aoi (which names all three checks)
 * and the form marks the exact fields or lines at fault.
 */
export function typedProblemText(_problem: TypedProblem): string {
  return messages.problems.invalid_aoi;
}

/** The sentence for a problem the service returned for the area. */
export function areaProblemText(code: ProblemCode): string {
  return messages.problems[code];
}
