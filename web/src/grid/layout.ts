// Pixel geometry for the calendar grid. Pure: no DOM. These are drawing
// positions, not data; no served number is computed here (AD-8).
import { messages } from "../api/messages";
import type { GridModel, Pos } from "./model";

/** Below this container width the grid drops in-cell numerals and the total bars. */
export const NARROW = 700;
/** Below this cell width a 7-character count ("2,619.6") no longer fits. */
const MIN_NUM_CELL_W = 46;
export const GAP = 2;

export interface Layout {
  width: number;
  height: number;
  narrow: boolean;
  showNums: boolean;
  yearW: number;
  rowH: number;
  cellW: number;
  totalX: number;
  totalW: number;
  barMax: number;
  headH: number;
  rowYs: number[];
  rule: { y: number; noteY: number; lines: string[] } | null;
  footY: number;
  footH: number;
}

export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (cur && cur.length + 1 + w.length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function layoutGrid(model: GridModel, width: number, raw = false): Layout {
  const narrow = width < NARROW;
  const yearW = narrow ? 34 : 40;
  const rowH = narrow ? 18 : 22;
  const totalW = raw ? 0 : narrow ? 66 : 140;
  const cellW = (width - yearW - totalW) / 12;
  const showNums = !narrow && cellW >= MIN_NUM_CELL_W;
  const headH = 18;
  const noteLines = wrap(messages.notes.record_switch, Math.max(20, Math.floor((width - yearW) / 5.8)));
  const noteH = noteLines.length * 13 + 10;

  const rowYs: number[] = [];
  let y = headH;
  let rule: Layout["rule"] = null;
  model.rows.forEach((r, i) => {
    rowYs.push(y);
    y += rowH + GAP;
    // Rows run newest first, so the switch year's row sits just above the last
    // Aqua year; the rule goes between them.
    if (r.year === model.switchYear && i < model.rows.length - 1) {
      rule = { y: y + 1, noteY: y + 4, lines: noteLines };
      y += noteH;
    }
  });
  // The raw view has no medians row: no foot space.
  const footY = raw ? y : y + 4;
  const footH = raw ? 0 : narrow ? 46 : 22;
  return {
    width,
    height: footY + footH,
    narrow,
    showNums,
    yearW,
    rowH,
    cellW,
    totalX: yearW + 12 * cellW + 6,
    totalW,
    barMax: 54,
    headH,
    rowYs,
    rule,
    footY,
    footH,
  };
}


/** Arrow keys, Home and End move between months, totals and medians. */
export function move(pos: Pos, key: string, nRows: number, raw = false): Pos | null {
  const lastRow = raw ? nRows - 1 : nRows; // the medians row, none in the raw view
  const maxC = (r: number) => (raw ? 11 : r === lastRow ? 11 : 12);
  let { r, c } = pos;
  switch (key) {
    case "ArrowLeft": c = Math.max(0, c - 1); break;
    case "ArrowRight": c = Math.min(maxC(r), c + 1); break;
    case "ArrowUp": r = Math.max(0, r - 1); break;
    case "ArrowDown": r = Math.min(lastRow, r + 1); break;
    case "Home": c = 0; break;
    case "End": c = maxC(r); break;
    default: return null;
  }
  return { r, c: Math.min(c, maxC(r)) };
}
