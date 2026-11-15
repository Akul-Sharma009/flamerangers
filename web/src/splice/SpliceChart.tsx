import { useRef } from "react";
import { scaleLinear } from "d3";
import type { Calendar, Meta, RawSplice } from "../api/client";
import { messages } from "../api/messages";
import { PictureDownload } from "../download/PictureDownload";
import { buildClasses } from "../grid/model";
import { formatCount, formatYearMonth } from "../format";
import { cssVar } from "../download/capture";
import { areaLabel, dataThroughLine, placeholderNote, rangeLine, recordLine, slug } from "../download/words";
import { axisTop, bars, type Series } from "./model";
import { chartTitle, sourceFor } from "./words";
import "./splice.css";

const W = 720, H = 220, L = 56, R = 12, T = 12, B = 28;

/** Layout only: where a served value sits on the axis. */
const yOf = (v: number, top: number) => T + (H - T - B) * (1 - v / top);

export function SpliceChart({ calendar, meta, splice, series, geometry }: {
  calendar: Calendar; meta: Meta; splice: RawSplice; series: Series; geometry?: Parameters<typeof areaLabel>[1];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const data = bars(calendar, splice, series);
  // Same axis approach as the seasonal profile (Story 7.4): a rounded linear axis from 0 to the
  // tallest bar of the shown series, with evenly spaced ticks. Layout only.
  const yScale = scaleLinear().domain([0, axisTop(calendar, splice, series)]).nice();
  const top = yScale.domain()[1];
  const bw = (W - L - R) / data.length;
  const ticks = yScale.ticks(5).filter((t) => t > 0);
  const area = areaLabel(calendar.aoi.name, geometry);
  const early = series === "raw" && data.some((b) => b.earlyBadScan);
  const title = chartTitle(series, calendar.range);
  const caption = series === "raw" ? [messages.notes.raw_splice_toggle, messages.notes.raw_splice_jump] : [messages.notes.record_switch];
  const marks = [
    { ym: splice.splice_from, text: formatYearMonth(splice.splice_from) },
    { ym: meta.record_switch.viirs_from, text: formatYearMonth(meta.record_switch.viirs_from) },
  ];
  const at = (ym: string) => data.findIndex((b) => b.month === ym);

  return (
    <figure className="splicechart">
      <figcaption>{title}</figcaption>
      <svg ref={ref} role="img" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label={`${title}, ${area}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={yOf(t, top)} y2={yOf(t, top)} stroke={cssVar("--rule", "#c9bfae")} strokeWidth={0.6} />
            <text x={L - 6} y={yOf(t, top) + 3} fontSize={10} textAnchor="end" fill={cssVar("--muted", "#6b6257")}>{formatCount(t)}</text>
          </g>
        ))}
        {data.map((b, i) => b.count === null ? null : (
          <rect key={b.month} x={L + i * bw} y={yOf(b.count, top)} width={Math.max(bw - 0.4, 0.5)} height={H - B - yOf(b.count, top)}
            fill={cssVar(`--c${b.colourClass ?? 0}`, "#999")} stroke={b.earlyBadScan ? cssVar("--ink", "#000") : "none"}
            strokeWidth={b.earlyBadScan ? 0.6 : 0} strokeDasharray={b.earlyBadScan ? "2 1" : undefined} />
        ))}
        {marks.map((m) => at(m.ym) < 0 ? null : (
          <g key={m.ym}>
            <line x1={L + at(m.ym) * bw} x2={L + at(m.ym) * bw} y1={T} y2={H - B} stroke={cssVar("--ink", "#000")} strokeWidth={0.8} strokeDasharray="3 2" />
            <text x={L + at(m.ym) * bw + 3} y={T + 9} fontSize={10} fill={cssVar("--ink", "#000")}>{m.text}</text>
          </g>
        ))}
        {data.map((b, i) => b.month.endsWith("-01") && Number(b.month.slice(0, 4)) % 4 === 2 ? (
          <text key={b.month} x={L + i * bw} y={H - 10} fontSize={10} textAnchor="middle" fill={cssVar("--muted", "#6b6257")}>{b.month.slice(0, 4)}</text>
        ) : null)}
      </svg>
      {early ? <p className="splicenote">{messages.notes.early_viirs_bad_scans} (dashed outline)</p> : null}
      <PictureDownload
        label={series === "raw" ? "raw splice chart" : "record chart"}
        filename={`hotspots-${slug(area)}-${series === "raw" ? "raw-splice" : "record"}-chart`}
        find={() => ref.current}
        content={{
          title,
          details: [`Area: ${area}`, `Dates: ${rangeLine(calendar.range)}`, `Unit: ${calendar.unit_label}`],
          legendHeading: `${calendar.unit_label}, lower bound of each colour class (the same classes in both views)`,
          legend: buildClasses(calendar).map((c) => ({ color: cssVar(`--c${c.index}`, "#999"), label: c.label })),
          notes: [...caption, ...(early ? [messages.notes.early_viirs_bad_scans] : []), messages.notes.hotspot_definition, ...(meta.placeholder ? [placeholderNote()] : [])],
          footer: [`${dataThroughLine(calendar.data_through)} · ${recordLine(calendar.record_version)}`, sourceFor(series)],
        }}
      />
    </figure>
  );
}
