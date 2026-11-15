// Story 3.9: a ranked item marked on the calendar. Pure: which places of the
// grid a highlight covers, and the box the grid draws around them. No served
// number is used here; a month, year or calendar month is matched by name.
import type { Layout } from "./layout";
import type { GridModel } from "./model";

/** What a ranked item points at on the calendar. */
export type Highlight =
  | { kind: "month"; month: string }
  | { kind: "year"; year: number }
  | { kind: "calendar_month"; calendarMonth: number };

export function sameHighlight(a: Highlight | null, b: Highlight | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === "month" && b.kind === "month") return a.month === b.month;
  if (a.kind === "year" && b.kind === "year") return a.year === b.year;
  if (a.kind === "calendar_month" && b.kind === "calendar_month") return a.calendarMonth === b.calendarMonth;
  return false;
}

/** Whether a month ("2015-09") lies inside the highlight. String slicing only. */
export function coversMonth(h: Highlight | null, month: string): boolean {
  if (h === null) return false;
  if (h.kind === "month") return h.month === month;
  if (h.kind === "year") return month.slice(0, 4) === String(h.year);
  return Number(month.slice(5, 7)) === h.calendarMonth;
}

/** Whether a year's total lies inside the highlight (a highlighted year includes its total). */
export function coversYearTotal(h: Highlight | null, year: number): boolean {
  return h !== null && h.kind === "year" && h.year === year;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clearance between the highlight's frame and the cells it surrounds, in px. */
export const HL_PAD = 3;

/**
 * The frame the grid draws for a highlight: one month's cell, a year's whole row
 * with its total, or a calendar month's column down to its median. null when
 * the item is not on the grid (it never is for a served ranking, which is inside
 * the range; null keeps a stale highlight from drawing anywhere).
 */
export function highlightBox(model: GridModel, L: Layout, h: Highlight, gap: number): Box | null {
  const cellW = Math.max(1, L.cellW - gap);
  const colX = (c: number) => L.yearW + c * L.cellW;
  const pad = (b: Box): Box => ({ x: b.x - HL_PAD, y: b.y - HL_PAD, width: b.width + 2 * HL_PAD, height: b.height + 2 * HL_PAD });
  if (h.kind === "month") {
    for (let r = 0; r < model.rows.length; r++) {
      const c = model.rows[r].cells.findIndex((cell) => cell.month === h.month);
      if (c >= 0) return pad({ x: colX(c), y: L.rowYs[r], width: cellW, height: L.rowH });
    }
    return null;
  }
  if (h.kind === "year") {
    const r = model.rows.findIndex((row) => row.year === h.year);
    if (r < 0) return null;
    // The whole row, from the year label to the total, inside the drawing's edges.
    return { x: 1, y: L.rowYs[r] - HL_PAD, width: L.width - 2, height: L.rowH + 2 * HL_PAD };
  }
  const c = h.calendarMonth - 1;
  if (c < 0 || c > 11 || model.rows.length === 0) return null;
  // The whole column, down through its median in the foot row.
  const top = L.rowYs[0] - HL_PAD;
  return { x: colX(c) - HL_PAD, y: top, width: cellW + 2 * HL_PAD, height: L.height - 1 - top };
}
