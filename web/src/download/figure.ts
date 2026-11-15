// Composes a downloadable picture: title, area, dates, unit, the chart itself,
// legend, data-through date, record version and source line, as one SVG string.
// Every value is a served value passed in already formatted (AD-8): nothing is
// computed here, so the picture and the screen show the same numbers.
import { wrap } from "../grid/layout";

export interface LegendEntry { color: string; label: string }

export interface FigureSpec {
  title: string;
  /** Lines under the title: area, date range, unit. */
  details: string[];
  /** The chart, already styled (see capture.ts). */
  chart: { markup: string; width: number; height: number };
  legendHeading?: string;
  legend?: LegendEntry[];
  /** Standing notes, in contract words. */
  notes: string[];
  /** Data-through, record version and the source line. */
  footer: string[];
  colors: { paper: string; ink: string; muted: string; rule: string };
  fonts: { serif: string; sans: string };
}

export interface Figure { svg: string; width: number; height: number }

const PAD = 24;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function composeFigure(spec: FigureSpec): Figure {
  const { chart, colors: c, fonts: f } = spec;
  const width = Math.max(chart.width, 560) + PAD * 2;
  const inner = width - PAD * 2;
  const chars = Math.max(30, Math.floor(inner / 6.2));
  const out: string[] = [];
  let y = PAD + 16;

  const text = (t: string, size: number, fill: string, family: string, weight = 400) => {
    out.push(`<text x="${PAD}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="${esc(family)}">${esc(t)}</text>`);
  };
  const para = (t: string, size: number, fill: string, family: string, lh: number) => {
    for (const line of wrap(t, chars)) { text(line, size, fill, family); y += lh; }
  };

  text(spec.title, 18, c.ink, f.serif, 600);
  y += 20;
  for (const d of spec.details) para(d, 12, c.muted, f.sans, 16);
  y += 8;
  const chartY = y;
  out.push(`<g class="chart" transform="translate(${PAD},${chartY})">${chart.markup}</g>`);
  y += chart.height + 18;

  if (spec.legend?.length) {
    if (spec.legendHeading) { text(spec.legendHeading, 11, c.muted, f.sans); y += 6; }
    let x = PAD;
    for (const e of spec.legend) {
      const w = 18 + Math.max(24, e.label.length * 6.4) + 12;
      if (x + w > width - PAD) { x = PAD; y += 20; }
      out.push(`<rect x="${x}" y="${y}" width="14" height="12" fill="${esc(e.color)}" stroke="${c.rule}" stroke-width="0.6"/>`);
      out.push(`<text x="${x + 18}" y="${y + 10}" font-size="10.5" fill="${c.ink}" font-family="monospace">${esc(e.label)}</text>`);
      x += w;
    }
    y += 26;
  }
  for (const n of spec.notes) para(n, 11, c.muted, f.sans, 14);
  y += 6;
  out.push(`<line x1="${PAD}" x2="${width - PAD}" y1="${y - 6}" y2="${y - 6}" stroke="${c.rule}" stroke-width="1"/>`);
  y += 8;
  for (const l of spec.footer) para(l, 11, c.ink, f.sans, 14);
  const height = y + PAD - 8;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${c.paper}"/>${out.join("")}</svg>`;
  return { svg, width, height };
}
