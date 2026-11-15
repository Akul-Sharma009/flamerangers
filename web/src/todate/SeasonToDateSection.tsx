import { useEffect, useRef, useState } from "react";
import type { Meta } from "../api/client";
import type { AoiInput } from "../area/featured";
import { PictureDownload } from "../download/PictureDownload";
import { areaLabel, slug } from "../download/words";
import { seasonPicture } from "./picture";
import { loadSeasonToDate as defaultLoader, type SeasonToDate, type SeasonToDateLoader } from "./load";
import { FAILED, HEIGHT, layoutSeason, NO_CURVE, NO_PAST, seasonRows, seasonWords, WIDTH } from "./model";
import "./todate.css";

type Loaded = { key: string; season: SeasonToDate | null };

/**
 * Season to date (Story 7.6): the selected year's running total against the median and a stated percentile
 * band of the complete past years' running totals, with a table equivalent and PNG / SVG downloads.
 * Everything drawn and written is a served value (AD-8). `loadSeason` is for tests.
 */
export function SeasonToDateSection({
  meta, aoi, areaName, loadSeason = defaultLoader,
}: {
  meta: Meta;
  aoi: AoiInput;
  /** The name the service echoed for the area, or null. */
  areaName: string | null;
  loadSeason?: SeasonToDateLoader;
}) {
  const first = Number(meta.record_start.slice(0, 4));
  const last = Number(meta.data_through.slice(0, 4));
  const [year, setYear] = useState(last);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const key = `${meta.record_version}|${JSON.stringify(aoi.geometry)}|${year}`;

  useEffect(() => {
    let live = true;
    loadSeason(meta, aoi, year).then((season) => { if (live) setLoaded({ key, season }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const years = Array.from({ length: last - first + 1 }, (_, i) => last - i);
  const season = loaded?.key === key ? loaded.season : undefined; // undefined: loading
  const words = season ? seasonWords(season) : null;
  const layout = season ? layoutSeason(season) : null;
  const area = areaLabel(areaName, aoi.geometry);

  return (
    <section className="std" aria-label="Season to date">
      <div className="stdhead">
        <h2>{words?.title ?? "Season to date"}</h2>
        <label>
          Year
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>
      {season === undefined ? <p className="loading">Loading…</p> : null}
      {season === null ? <p role="alert">{FAILED}</p> : null}
      {season && layout && words ? (
        <>
          {words.usual ? <p className="stdusual">{words.usual}</p> : null}
          <svg ref={svgRef} className="stdchart" role="img" width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`${words.title ?? "Running total"}. The table below gives the same figures.`}>
            {layout.band ? <path className="band" d={layout.band} /> : null}
            <line className="axis" x1={layout.baseline.x1} x2={layout.baseline.x2} y1={layout.baseline.y} y2={layout.baseline.y} />
            {layout.median ? <path className="medline" d={layout.median} /> : null}
            {layout.solid ? <path className="yearline" d={layout.solid} /> : null}
            {layout.dashed ? <path className="yearline todate" d={layout.dashed} /> : null}
            {layout.toDate ? <circle className="todatept" cx={layout.toDate.x} cy={layout.toDate.y} r={5} /> : null}
            {layout.months.map((m) => <text key={m.label} className="tick" x={m.x} y={HEIGHT - 12} textAnchor="middle">{m.label}</text>)}
            <text className="tick" x={layout.baseline.x1} y={layout.baseline.y + 14} textAnchor="middle">0</text>
            <text className="key" x={34} y={14}>{layout.key}</text>
            {layout.labels.map((l, i) => <text key={i} className={`lab ${l.kind}`} x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text>)}
          </svg>
          {!layout.hasCurve ? <p className="stdnote">{NO_CURVE}</p> : null}
          {season.past_years.length === 0 ? <p className="stdnote">{NO_PAST}</p> : null}
          {words.toDate ? <p className="stdnote">{words.toDate}</p> : null}
          {words.start ? <p className="stdnote">{words.start}</p> : null}
          <details className="stdtable">
            <summary>Table of the same figures</summary>
            <div className="table-scroll" role="region" aria-label={`${words.title} (${season.unit_label})`} tabIndex={0}>
            <table>
              <caption>{words.title} ({season.unit_label})</caption>
              <thead>
                <tr>
                  <th scope="col">End of</th>
                  <th scope="col">{season.year}</th>
                  <th scope="col">Median</th>
                  <th scope="col">{season.band.lower_percentile}th percentile</th>
                  <th scope="col">{season.band.upper_percentile}th percentile</th>
                </tr>
              </thead>
              <tbody>
                {seasonRows(season).map((r) => (
                  <tr key={r.month}>
                    <th scope="row">{r.month}</th><td>{r.cumulative}</td><td>{r.median}</td><td>{r.low}</td><td>{r.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
          <PictureDownload
            key={key}
            label="season chart"
            filename={`hotspots-${slug(area)}-season-${season.year}`}
            find={() => svgRef.current}
            content={seasonPicture(season, area)}
          />
        </>
      ) : null}
    </section>
  );
}
