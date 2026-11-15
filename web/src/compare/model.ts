// Story 8.7: what makes two calendars comparable. The colour classes are served (the service pools both
// areas' months when each request names the other); the browser only checks they came back identical.
import type { Calendar } from "../api/client";
import { featuredAreas, type AoiInput, type FeaturedArea } from "../area/featured";

/** True when both calendars use the same count classes, so one count has one colour in both (AC). */
export function sharesScale(a: Calendar, b: Calendar): boolean {
  const x = a.statistics.colour_breaks;
  const y = b.statistics.colour_breaks;
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** The area a comparison starts with: the first featured area that is not the one on show. The picker changes it. */
export function otherThan(selected: AoiInput, areas: FeaturedArea[] = featuredAreas()): AoiInput {
  return (areas.find((a) => a.name !== selected.name) ?? areas[0]!).aoi;
}
