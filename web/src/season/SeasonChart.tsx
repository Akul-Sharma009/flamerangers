import { scaleLinear } from "d3";
import { MONTH_INITIALS, MONTH_NAMES, formatCount } from "../format";
import type { Season } from "./model";

const W = 640, H = 300, L = 54, R = 12, T = 18, B = 40;

/**
 * Median and range per calendar month, the peak and the season marked, and one year overlaid.
 * Drawing positions only: every plotted value is served. A month the record lacks is a gap, never zero.
 */
export function SeasonChart({ season, year, label }: { season: Season; year: number | null; label: string }) {
  const months = season.typical.months;
  const sel = year === null ? null : season.years.find((y) => y.year === year) ?? null;
  const top = Math.max(1, ...months.map((m) => m.high ?? 0), ...(sel?.counts.map((c) => c ?? 0) ?? []));
  const y = scaleLinear().domain([0, top]).nice().range([H - B, T]);
  const band = (W - L - R) / 12;
  const cx = (i: number) => L + band * (i + 0.5);
  const run = (pts: (number | null)[]) => {
    // one path piece per run of present months, so a missing month breaks the line
    const pieces: string[] = [];
    let cur = "";
    pts.forEach((v, i) => {
      if (v === null) { if (cur) pieces.push(cur); cur = ""; return; }
      cur += `${cur ? "L" : "M"}${cx(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    if (cur) pieces.push(cur);
    return pieces.join(" ");
  };
  const med = months.map((m) => m.median);
  const polyTop = months.map((m, i) => (m.high === null ? null : [cx(i), y(m.high)] as const));
  const polyBot = months.map((m, i) => (m.low === null ? null : [cx(i), y(m.low)] as const));
  const bandPath = months.length && polyTop.every(Boolean) && polyBot.every(Boolean)
    ? `M${polyTop.map((p) => `${p![0].toFixed(1)},${p![1].toFixed(1)}`).join("L")}L${[...polyBot].reverse().map((p) => `${p![0].toFixed(1)},${p![1].toFixed(1)}`).join("L")}Z`
    : "";
  const peak = season.typical.peak_month;
  return (
    <svg role="img" aria-label={label} className="seasonchart" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <title>{label}</title>
      {/* season months: a shaded column and a bar on the baseline */}
      {months.map((m, i) => season.typical.season_months.includes(m.calendar_month) ? (
        <rect key={`s${i}`} className="season" x={L + band * i} y={T} width={band} height={H - B - T} fill="var(--faint)" />
      ) : null)}
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={0.6} />
          <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{formatCount(t)}</text>
        </g>
      ))}
      {bandPath ? <path className="range" d={bandPath} fill="var(--c2)" opacity={0.35} stroke="none" /> : null}
      {months.map((m, i) => m.low !== null && m.high !== null ? (
        <line key={`r${i}`} x1={cx(i)} x2={cx(i)} y1={y(m.low)} y2={y(m.high)} stroke="var(--c3)" strokeWidth={1} />
      ) : null)}
      <path className="median" d={run(med)} fill="none" stroke="var(--c5)" strokeWidth={2} />
      {sel ? <path className="yearline" d={run(sel.counts)} fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="5 3" /> : null}
      {sel ? sel.counts.map((c, i) => c === null ? null : <circle key={`y${i}`} cx={cx(i)} cy={y(c)} r={2.6} fill="var(--ink)" />) : null}
      {months.map((m, i) => m.median === null ? null : <circle key={`m${i}`} cx={cx(i)} cy={y(m.median)} r={2.6} fill="var(--c5)" />)}
      {peak !== null && months[peak - 1]?.median != null ? (
        <g className="peak">
          <circle cx={cx(peak - 1)} cy={y(months[peak - 1]!.median!)} r={7} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
          <text x={cx(peak - 1)} y={y(months[peak - 1]!.median!) - 11} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)" stroke="var(--paper)" strokeWidth={3} paintOrder="stroke">
            Peak: {MONTH_NAMES[peak - 1]}
          </text>
        </g>
      ) : null}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--ink)" strokeWidth={1} />
      {months.map((m, i) => <text key={`l${i}`} x={cx(i)} y={H - B + 14} textAnchor="middle" fontSize={11} fill="var(--ink)">{MONTH_INITIALS[i]}</text>)}
      {season.typical.season_months.length ? (
        <text x={L} y={H - B + 30} fontSize={10.5} fill="var(--muted)">
          Shaded: season months ({season.typical.season_length}). Line: median. Band: lowest to highest{sel ? `. Dashed: ${sel.year}` : ""}.
        </text>
      ) : (
        <text x={L} y={H - B + 30} fontSize={10.5} fill="var(--muted)">Line: median. Band: lowest to highest{sel ? `. Dashed: ${sel.year}` : ""}.</text>
      )}
    </svg>
  );
}
