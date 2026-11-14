// The sentences the area selector shows. Every one comes from
// contract/messages.yaml; this file only picks which.
import type { ProblemCode } from "../api/client";
import { messages } from "../api/messages";
import type { TypedProblem } from "./typed";

/**
 * The sentence for refused typed coordinates. Out of range, out of order (latitude)
 * and not closed have their own sentences (contract 0.3.0); the other cases
 * (unreadable, no width, too few vertices) show invalid_aoi, and the form marks
 * the exact fields or lines at fault in every case.
 */
export function typedProblemText(problem: TypedProblem): string {
  switch (problem) {
    case "out_of_range":
      return messages.client.coordinates_out_of_range;
    case "out_of_order":
      return messages.client.latitude_out_of_order;
    case "not_closed":
      return messages.client.polygon_not_closed;
    default:
      return messages.problems.invalid_aoi;
  }
}

/** The sentence for a problem the service returned for the area. */
export function areaProblemText(code: ProblemCode): string {
  return messages.problems[code];
}
