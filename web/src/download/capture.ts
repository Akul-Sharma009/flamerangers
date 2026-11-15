// Turns a live chart <svg> into a standalone one: the page's CSS does not travel
// with a downloaded file, so each element's resolved paint and type are written
// onto it. Interaction marks (focus ring, hit areas, tooltips) are dropped.
const PROPS = [
  "fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight", "text-anchor",
] as const;
const DROP = ["ring", "hit", "highlight", "hl", "hl-halo"];

export interface Captured { markup: string; width: number; height: number }

function style(from: Element, to: Element): void {
  const cs = getComputedStyle(from);
  for (const p of PROPS) {
    const v = cs.getPropertyValue(p);
    if (v) (to as SVGElement).style.setProperty(p, v);
  }
}

function walk(from: Element, to: Element): void {
  for (let i = to.children.length - 1; i >= 0; i--) {
    const f = from.children[i]!;
    const t = to.children[i]!;
    if (DROP.some((d) => t.classList.contains(d)) || t.tagName === "title") { t.remove(); continue; }
    style(f, t);
    walk(f, t);
  }
}

export function captureSvg(svg: SVGSVGElement): Captured {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const width = Number(svg.getAttribute("width")) || svg.getBoundingClientRect().width;
  const height = Number(svg.getAttribute("height")) || svg.getBoundingClientRect().height;
  clone.removeAttribute("class");
  for (const a of ["role", "aria-label", "tabindex"]) clone.removeAttribute(a);
  style(svg, clone);
  walk(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("overflow", "visible");
  return { markup: new XMLSerializer().serializeToString(clone), width, height };
}

/** A CSS custom property from the page root (the colour ramps). */
export function cssVar(name: string, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
