// A date as three selects (Day, Month, Year), used for the dates tab's From and
// To. Builds YYYY-MM-DD; options outside min / max are disabled. Day counts are
// calendar logic, not a shown data number.
import { MONTH_NAMES } from "../format";

interface Props {
  name: string;
  value: string;
  min: string;
  max: string;
  /** The served bounds: the years offered, and the fallback when the value is unreadable. */
  bounds: { start: string; end: string };
  invalid?: boolean;
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function DateSelects({ name, value, min, max, bounds, invalid, onChange }: Props) {
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const y = ok ? Number(value.slice(0, 4)) : 0;
  const m = ok ? Number(value.slice(5, 7)) : 0;
  const d = ok ? Number(value.slice(8, 10)) : 0;
  const y0 = Number(bounds.start.slice(0, 4));
  const y1 = Number(bounds.end.slice(0, 4));
  const years: number[] = [];
  for (let k = y0; k <= y1; k++) years.push(k);

  const build = (ny: number, nm: number, nd: number) => {
    const day = Math.min(nd, daysIn(ny, nm));
    onChange(`${ny}-${pad(nm)}-${pad(day)}`);
  };
  const fy = y || y0;
  const fm = m || 1;
  const fd = d || 1;
  const outside = (iso: string) => (min && iso < min) || (max && iso > max);
  const dayCount = daysIn(fy, fm);
  const days: number[] = [];
  for (let k = 1; k <= dayCount; k++) days.push(k);

  return (
    <span className="date-selects" role="group" data-name={name} data-value={value} data-min={min || undefined} data-max={max || undefined}>
      <select name={`${name}-day`} aria-label="Day" required aria-invalid={invalid ? true : undefined}
        value={ok ? String(d) : ""} onChange={(e) => build(fy, fm, Number(e.target.value))}>
        {ok ? null : <option value="" disabled>Day</option>}
        {days.map((k) => (
          <option key={k} value={k} disabled={outside(`${fy}-${pad(fm)}-${pad(k)}`) ? true : undefined}>{k}</option>
        ))}
      </select>
      <select name={`${name}-month`} aria-label="Month" required aria-invalid={invalid ? true : undefined}
        value={ok ? String(m) : ""} onChange={(e) => build(fy, Number(e.target.value), fd)}>
        {ok ? null : <option value="" disabled>Month</option>}
        {MONTH_NAMES.map((label, i) => {
          const last = `${fy}-${pad(i + 1)}-${pad(daysIn(fy, i + 1))}`;
          const first = `${fy}-${pad(i + 1)}-01`;
          const out = (min && last < min) || (max && first > max);
          return <option key={label} value={i + 1} disabled={out ? true : undefined}>{label}</option>;
        })}
      </select>
      <select name={`${name}-year`} aria-label="Year" required aria-invalid={invalid ? true : undefined}
        value={ok ? String(y) : ""} onChange={(e) => build(Number(e.target.value), fm, fd)}>
        {ok ? null : <option value="" disabled>Year</option>}
        {years.map((k) => {
          const out = (min && `${k}-12-31` < min) || (max && `${k}-01-01` > max);
          return <option key={k} value={k} disabled={out ? true : undefined}>{k}</option>;
        })}
      </select>
    </span>
  );
}
