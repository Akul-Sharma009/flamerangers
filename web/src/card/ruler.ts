// Layout of the ruler (Story 3.7, UI-CONCEPT.md "The Reading"): one axis, a
// mark per past year's count for the same days, the median tick and this
// year's mark. Positions are drawing, not numbers: no position, extent or tick
// value is ever shown. Every label is a served value formatted in ./model.ts.
import { extent, scaleSymlog } from "d3";
import type { RulerData } from "./model";

export const RULER_HEIGHT = 104;
const DOT = 8; // dot diameter: closer dots stack upward by one dot height
const PAD = 14;
const AXIS_Y = 54;
const MARK_Y = 44;

type Anchor = "start" | "middle" | "end";

export interface RulerLayout {
  width: number;
  height: number;
  /** Room added above the drawing for stacked dots (draw everything shifted down by this). */
  top: number;
  axis: { x1: number; x2: number; y: number };
  past: { year: number; label: string; x: number; y: number }[];
  /** The highest past year's served label, on its own line below the axis. */
  pastLabel: { year: number; x: number; label: string; anchor: Anchor } | null;
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
  // Dot-plot stack: a dot closer than one diameter to an earlier dot on the same level goes up a level.
  const placed: { x: number; level: number }[] = [];
  const levels = new Map<number, number>();
  [...r.past].sort((a, b) => pos(a.count) - pos(b.count) || a.year - b.year).forEach((p) => {
    const px = pos(p.count);
    let level = 0;
    while (placed.some((q) => q.level === level && Math.abs(q.x - px) < DOT)) level++;
    placed.push({ x: px, level });
    levels.set(p.year, level);
  });
  const top = Math.max(0, ...levels.values()) * DOT;
  const high = r.past.reduce<(typeof r.past)[number] | null>((m, p) => (m === null || p.count > m.count ? p : m), null);
  const median = r.median ? pos(r.median.count) : null;
  const current = r.current ? pos(r.current.count) : null;
  return {
    width,
    height: RULER_HEIGHT + top,
    top,
    axis: { x1: PAD, x2: width - PAD, y: AXIS_Y },
    past: r.past.map((p) => ({ year: p.year, label: p.label, x: pos(p.count), y: MARK_Y - (levels.get(p.year) ?? 0) * DOT })),
    pastLabel: high === null ? null : { year: high.year, x: pos(high.count), label: high.label, anchor: anchorAt(pos(high.count), width) },
    median: median === null || !r.median ? null : { x: median, label: r.median.label, anchor: anchorAt(median, width) },
    current: current === null || !r.current ? null : { x: current, label: r.current.label, anchor: anchorAt(current, width) },
  };
}
