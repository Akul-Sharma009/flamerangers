// Layout of the ruler (Story 3.7, UI-CONCEPT.md "The Reading"): one axis, a
// mark per past year's count for the same days, the median tick and this
// year's mark. Positions are drawing, not numbers: no position, extent or tick
// value is ever shown. Every label is a served value formatted in ./model.ts.
import { extent, scaleSymlog } from "d3";
import type { RulerData } from "./model";

export const RULER_HEIGHT = 88;
const PAD = 14;
const AXIS_Y = 54;
const MARK_Y = 44;

type Anchor = "start" | "middle" | "end";

export interface RulerLayout {
  width: number;
  height: number;
  axis: { x1: number; x2: number; y: number };
  past: { year: number; label: string; x: number; y: number }[];
  median: { x: number; label: string; anchor: Anchor } | null;
  current: { x: number; label: string; anchor: Anchor } | null;
}

/** Labels near an end are anchored inwards so they stay inside the drawing. */
function anchorAt(x: number, width: number): Anchor {
  if (x < 48) return "start";
  if (x > width - 48) return "end";
  return "middle";
}

/**
 * A symmetric-log axis from the smallest to the largest mark, so one record
 * year does not crowd the rest into a corner, and a 0 count still has a place
 * (a plain log axis has none for 0). The extent is a drawing range only: no
 * axis value is labelled, every label is a served value.
 */
export function layoutRuler(r: RulerData, width: number): RulerLayout {
  const all = [...r.past.map((p) => p.count)];
  if (r.median) all.push(r.median.count);
  if (r.current) all.push(r.current.count);
  const [lo = 0, hi = 1] = extent(all);
  const x = scaleSymlog()
    .domain(lo === hi ? [lo, lo + 1] : [lo, hi])
    .range([PAD, width - PAD]);
  const pos = (v: number) => x(v);
  const median = r.median ? pos(r.median.count) : null;
  const current = r.current ? pos(r.current.count) : null;
  return {
    width,
    height: RULER_HEIGHT,
    axis: { x1: PAD, x2: width - PAD, y: AXIS_Y },
    past: r.past.map((p) => ({ year: p.year, label: p.label, x: pos(p.count), y: MARK_Y })),
    median: median === null || !r.median ? null : { x: median, label: r.median.label, anchor: anchorAt(median, width) },
    current: current === null || !r.current ? null : { x: current, label: r.current.label, anchor: anchorAt(current, width) },
  };
}
