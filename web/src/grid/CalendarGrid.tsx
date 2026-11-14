import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3";
import { messages } from "../api/messages";
import { MONTH_INITIALS, formatCount } from "../format";
import { buildGridModel, type Calendar, type Meta } from "./model";
import "./grid.css";

const NARROW = 700;
// Below this cell width a 7-character count ("2,619.6") no longer fits, so cells show tint only.
const MIN_NUM_CELL_W = 46;
const GAP = 2;
const YEAR_W = 40;
const HEAD_H = 18;
const FOOT_H = 22;

function wrap(text: string, maxChars: number): string[] {
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

export function CalendarGrid({ calendar, meta }: { calendar: Calendar; meta: Meta }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const model = useMemo(() => buildGridModel(calendar, meta), [calendar, meta]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || width <= 0) return;
    const narrow = width < NARROW;
    const rowH = narrow ? 17 : 22;
    const totalW = narrow ? 26 : 140;
    const cellW = (width - YEAR_W - totalW) / 12;
    const showNums = !narrow && cellW >= MIN_NUM_CELL_W;
    const barMax = 54;
    const noteLines = wrap(messages.notes.record_switch, Math.max(20, Math.floor((width - 8) / 5.6)));
    const noteH = noteLines.length * 13 + 12;

    const svg = select(svgEl);
    svg.selectAll("*").remove();

    // y of each row
    const ys: number[] = [];
    let y = HEAD_H;
    let ruleY: number | null = null;
    let noteY = 0;
    model.rows.forEach((r, i) => {
      ys.push(y);
      y += rowH + GAP;
      if (r.year === model.switchYear && i < model.rows.length - 1) {
        ruleY = y - GAP / 2 + 1;
        noteY = y + 2;
        y += noteH;
      }
    });
    const footY = y + 4;
    const height = footY + FOOT_H;
    svg.attr("width", width).attr("height", height);

    const defs = svg.append("defs");
    const hatch = defs.append("pattern").attr("id", "hatch-record").attr("width", 5).attr("height", 5)
      .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
    hatch.append("line").attr("class", "hatch-line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 5);
    const dots = defs.append("pattern").attr("id", "hatch-coverage").attr("width", 5).attr("height", 5)
      .attr("patternUnits", "userSpaceOnUse");
    dots.append("circle").attr("class", "dot").attr("cx", 2.5).attr("cy", 2.5).attr("r", 1);

    // header
    const head = svg.append("g").attr("class", "head");
    MONTH_INITIALS.forEach((m, i) => {
      head.append("text").attr("class", "colhead").attr("x", YEAR_W + i * cellW + cellW / 2).attr("y", 12).text(m);
    });
    if (!narrow) {
      head.append("text").attr("class", "colhead").attr("x", YEAR_W + 12 * cellW + 8).attr("y", 12)
        .style("text-anchor", "start").text("Year total");
    }

    model.rows.forEach((row, ri) => {
      const ry = ys[ri];
      const g = svg.append("g").attr("class", "row").attr("data-year", row.year);
      g.append("text").attr("class", "yr").attr("x", YEAR_W - 8).attr("y", ry + rowH / 2 + 4).text(row.year);

      row.cells.forEach((c, ci) => {
        const x = YEAR_W + ci * cellW;
        const w = Math.max(1, cellW - GAP);
        const h = rowH;
        const isNull = c.count === null;
        const state = !isNull ? "count" : (c.nullReason ?? "outside_record");
        const cg = g.append("g")
          .attr("class", `cell ${isNull ? "nullcell" : `k${c.colourClass ?? 0}`}`)
          .attr("transform", `translate(${x},${ry})`)
          .attr("data-month", c.month)
          .attr("data-state", state);
        if (c.flag) cg.attr("data-flag", c.flag);
        if (c.monthToDate) cg.attr("data-mtd", "true");
        cg.append("title").text(c.title);
        if (isNull) {
          const pat = c.nullReason === "outside_coverage" ? "hatch-coverage" : "hatch-record";
          cg.append("rect").attr("width", w).attr("height", h).style("fill", "var(--paper)");
          cg.append("rect").attr("width", w).attr("height", h).attr("fill", `url(#${pat})`)
            .style("stroke", "var(--rule)").style("stroke-width", 0.5);
          if (showNums) cg.append("text").attr("class", "dash").attr("x", w / 2).attr("y", h / 2 + 4).text("–");
        } else {
          cg.append("rect").attr("class", "bg").attr("width", w).attr("height", h);
          if (showNums && c.count !== null) {
            cg.append("text").attr("class", "num").attr("x", w - 3).attr("y", h / 2 + 4.5)
              .text(formatCount(c.count));
          }
        }
        if (c.monthToDate) {
          cg.append("rect").attr("class", "mtd").attr("x", 1).attr("y", 1).attr("width", w - 2).attr("height", h - 2);
        }
        if (c.flag === "strong") {
          cg.append("path").attr("class", "flag-strong").attr("d", "M1.5,1.5 L7,1.5 L1.5,7 Z");
        } else if (c.flag === "marginal") {
          cg.append("circle").attr("class", "flag-marginal").attr("cx", 4.5).attr("cy", 4.5).attr("r", 2.4);
        }
      });

      // year total
      const tx = YEAR_W + 12 * cellW + 8;
      const tg = g.append("g").attr("class", "total").attr("transform", `translate(${tx},${ry})`);
      const t = row.total;
      if (t) {
        const title = tg.append("title");
        title.text(`${row.year}: ${t.total === null ? "–" : formatCount(t.total)}`);
        if (!narrow) {
          tg.append("rect").attr("class", `tot-bar${t.complete ? "" : " hollow"}`)
            .attr("x", 0).attr("y", 4).attr("height", rowH - 8)
            .attr("width", Math.max(0, (t.share_of_max ?? 0) * barMax));
          tg.append("text").attr("class", "tot-num").attr("x", barMax + 6).attr("y", rowH / 2 + 4)
            .text(t.total === null ? "–" : formatCount(t.total));
        }
      }
      if (row.topRank !== null) {
        const rg = tg.append("g").attr("class", "rank")
          .attr("transform", `translate(${narrow ? 8 : totalW - 14},${rowH / 2})`);
        rg.append("circle").attr("r", 7);
        rg.append("text").attr("y", 3.3).text(row.topRank);
      }
    });

    if (ruleY !== null) {
      svg.append("line").attr("class", "switch-rule").attr("x1", YEAR_W).attr("x2", width)
        .attr("y1", ruleY).attr("y2", ruleY);
      const nt = svg.append("text").attr("class", "switch-note").attr("x", YEAR_W).attr("y", noteY + 10);
      noteLines.forEach((l, i) => nt.append("tspan").attr("x", YEAR_W).attr("dy", i === 0 ? 0 : 13).text(l));
    }

    // medians foot
    svg.append("line").attr("class", "foot-rule").attr("x1", YEAR_W).attr("x2", width).attr("y1", footY).attr("y2", footY);
    svg.append("text").attr("class", "colhead foot-label").attr("x", YEAR_W - 8).attr("y", footY + 15)
      .style("text-anchor", "end").text("median");
    model.medians.forEach((m, i) => {
      const t = svg.append("text").attr("class", "median").attr("x", YEAR_W + i * cellW + cellW / 2).attr("y", footY + 15);
      t.text(showNums ? m.label : "");
      t.append("title").text(m.title ? `${m.label}\n${m.title}` : m.label);
    });
  }, [model, width]);

  return (
    <div className="calgrid" ref={wrapRef}>
      <svg ref={svgRef} role="img" aria-label="Hotspots per month by year" />
    </div>
  );
}
