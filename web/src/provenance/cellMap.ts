// Pixel geometry for the evidence-class map: one square per served 1° cell,
// placed by its served south-west corner. Pure, no DOM. These are drawing
// positions, not data (AD-8): no served number is changed or shown.
import type { components } from "../api/schema";

type Cell = components["schemas"]["Cell"];

export interface CellBox {
  key: string;
  x: number;
  y: number;
  size: number;
  cell: Cell;
}

export interface CellMapLayout {
  width: number;
  height: number;
  boxes: CellBox[];
}

/** Largest and smallest square drawn for one cell, in px. */
const MAX_PX = 28;
const MIN_PX = 3;

export function layoutCellMap(cells: Cell[], maxW: number, maxH: number): CellMapLayout | null {
  if (cells.length === 0) return null;
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const c of cells) {
    west = Math.min(west, c.sw_lon);
    east = Math.max(east, c.sw_lon + c.size_deg);
    south = Math.min(south, c.sw_lat);
    north = Math.max(north, c.sw_lat + c.size_deg);
  }
  const px = Math.max(MIN_PX, Math.min(MAX_PX, maxW / (east - west), maxH / (north - south)));
  const boxes = cells.map((c) => ({
    key: `${c.sw_lon},${c.sw_lat}`,
    x: (c.sw_lon - west) * px,
    // North is up: the row of the northernmost cells is at the top.
    y: (north - c.sw_lat - c.size_deg) * px,
    size: c.size_deg * px,
    cell: c,
  }));
  return { width: (east - west) * px, height: (north - south) * px, boxes };
}
