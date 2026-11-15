import { useEffect, useRef, useState } from "react";
import type { Meta, ServiceClient } from "../api/client";
import { ProblemError } from "../api/client";
import { messages } from "../api/messages";
import type { AoiInput } from "../area/featured";
import { PictureDownload } from "../download/PictureDownload";
import { areaLabel, dataThroughLine, recordLine, slug, sourceLine } from "../download/words";
import { seasonSentence, tableRows, yearHasGaps, yearsOf, type Season } from "./model";
import { SeasonChart } from "./SeasonChart";
import "./season.css";

type State = { status: "loading" } | { status: "ready"; season: Season } | { status: "none" } | { status: "failed" };

/** Story 7.4: the seasonal profile of the chosen area, with a table equivalent and a PNG / SVG download. */
export function SeasonPanel({ service, meta, aoi, initialYear = null }: {
  service: ServiceClient; meta: Meta; aoi: AoiInput; initialYear?: number | null;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [year, setYear] = useState<number | null>(initialYear);
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    const ask = service.postSeason;
    if (!ask) { setState({ status: "none" }); return; }
    ask.call(service, { record_version: meta.record_version, aoi: aoi as never })
      .then((season) => live && setState({ status: "ready", season }))
      .catch((e) => live && setState(e instanceof ProblemError ? { status: "none" } : { status: "failed" }));
    return () => { live = false; };
  }, [service, meta.record_version, aoi]);

  if (state.status === "none") return null;
  if (state.status === "loading") return <section className="seasonpanel" aria-label="Seasonal profile"><p className="loading">Loading…</p></section>;
  if (state.status === "failed") return <section className="seasonpanel" aria-label="Seasonal profile"><p role="status">{messages.client.service_unreachable}</p></section>;
  return <SeasonReady season={state.season} aoi={aoi} year={year} onYear={setYear} />;
}

/** The profile once it has loaded. Exported so tests can render it. */
export function SeasonReady({ season, aoi, year, onYear }: {
  season: Season; aoi: AoiInput; year: number | null; onYear: (y: number | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const ref = season.reference_period;
  const title = `Typical year, ${ref.start_year} to ${ref.end_year}`;
  const rows = tableRows(season, year);
  const area = areaLabel(season.aoi.name, aoi.geometry);
  const label = `${title}: median and range of hotspots per calendar month. ${seasonSentence(season)}`;
  return (
    <section className="seasonpanel" aria-labelledby="season-heading">
      <h2 id="season-heading">Seasonal profile</h2>
      <p className="kicker">{title}</p>
      <p className="seasonsentence">{seasonSentence(season)}</p>
      <label className="yearpick">
        Overlay a year{" "}
        <select value={year ?? ""} onChange={(e) => onYear(e.target.value === "" ? null : Number(e.target.value))}>
          <option value="">None</option>
          {yearsOf(season).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <div ref={box} className="seasonfig">
        <SeasonChart season={season} year={year} label={label} />
      </div>
      {yearHasGaps(season, year) ? <p className="seasonnote">{messages.notes.season_year_partial}</p> : null}
      <p className="seasonnote">{messages.notes.season_definition}</p>
      <table className="seasontable">
        <caption>{title}, {season.unit_label}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th><th scope="col">Median</th><th scope="col">Lowest</th><th scope="col">Highest</th>
            {year !== null ? <th scope="col">{year}</th> : null}
            <th scope="col">Marked</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.calendarMonth}>
              <th scope="row">{r.month}</th><td>{r.median}</td><td>{r.low}</td><td>{r.high}</td>
              {year !== null ? <td>{r.year}</td> : null}
              <td>{r.flags}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PictureDownload
        label="seasonal profile"
        filename={`hotspots-${slug(area)}-season`}
        find={() => box.current?.querySelector<SVGSVGElement>("svg.seasonchart") ?? null}
        content={{
          title,
          details: [`Area: ${area}`, `Reference years: ${ref.start_year} to ${ref.end_year}`, `Unit: ${season.unit_label}`,
            seasonSentence(season), ...(year !== null ? [`Overlaid year: ${year}`] : [])],
          notes: [messages.notes.hotspot_definition, messages.notes.record_switch, messages.notes.season_definition],
          footer: [`${dataThroughLine(season.data_through)} · ${recordLine(season.record_version)}`, sourceLine()],
        }}
      />
    </section>
  );
}
