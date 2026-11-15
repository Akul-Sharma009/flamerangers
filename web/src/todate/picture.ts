// What the season chart's picture says besides the chart (Story 7.6): served values and contract words only.
import { messages } from "../api/messages";
import { cssVar } from "../download/capture";
import type { PictureContent } from "../download/PictureDownload";
import { dataThroughLine, recordLine, sourceLine } from "../download/words";
import { formatDay } from "../format";
import type { SeasonToDate } from "./load";
import { seasonWords } from "./model";

export function seasonPicture(s: SeasonToDate, area: string): PictureContent {
  const w = seasonWords(s);
  return {
    title: w.title ?? `Running total of hotspots in ${s.year}`,
    details: [`Area: ${area}`, `Year: ${s.year}, data through ${formatDay(s.data_through)}`, `Unit: ${s.unit_label}`],
    legendHeading: w.usual ?? undefined,
    legend: [
      { color: cssVar("--c5", "#6a3414"), label: `${s.year}, running total` },
      { color: cssVar("--ink", "#1d1a16"), label: "median of past years" },
      { color: cssVar("--c2", "#d3a866"), label: `${s.band.lower_percentile}th to ${s.band.upper_percentile}th percentile` },
    ],
    notes: [
      ...(w.toDate ? [w.toDate] : []),
      ...(w.start ? [w.start] : []),
      messages.notes.hotspot_definition, messages.notes.record_switch,
    ],
    footer: [`${dataThroughLine(s.data_through)} · ${recordLine(s.record_version)}`, sourceLine()],
  };
}
