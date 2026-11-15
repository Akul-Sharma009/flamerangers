// What each picture says, built from served values and contract words only.
import { messages } from "../api/messages";
import type { AoiInput } from "../area/featured";
import { anomalyScaleText, buildAnomalyClasses, type Measure } from "../grid/anomaly";
import { buildClasses, type Calendar, type Meta } from "../grid/model";
import { cssVar } from "./capture";
import type { PictureContent } from "./PictureDownload";
import { areaLabel, calendarTitle, dataThroughLine, placeholderNote, rangeLine, recordLine, slug, sourceLine } from "./words";

const common = (calendar: Calendar, meta: Meta) => ({
  notes: [messages.notes.hotspot_definition, messages.notes.record_switch, ...(meta.placeholder ? [placeholderNote()] : [])],
  footer: [
    `${dataThroughLine(calendar.data_through)} · ${recordLine(calendar.record_version)}`,
    sourceLine(),
  ],
});

export function calendarPicture(
  calendar: Calendar, meta: Meta, measure: Measure, geometry?: AoiInput["geometry"],
): { content: PictureContent; filename: string } {
  const area = areaLabel(calendar.aoi.name, geometry);
  const anomaly = measure === "anomaly";
  const legend = anomaly
    ? buildAnomalyClasses(calendar).map((c) => ({ color: cssVar(`--a-${c.tone}`, "#999"), label: c.label }))
    : buildClasses(calendar).map((c) => ({ color: cssVar(`--c${c.index}`, "#999"), label: c.label }));
  return {
    filename: `hotspots-${slug(area)}-${anomaly ? "anomaly" : "calendar"}`,
    content: {
      title: calendarTitle(calendar.range),
      details: [`Area: ${area}`, `Dates: ${rangeLine(calendar.range)}`, `Unit: ${calendar.unit_label}`],
      legendHeading: anomaly ? anomalyScaleText(calendar.reference_period) : `${calendar.unit_label}, lower bound of each class`,
      legend,
      ...common(calendar, meta),
    },
  };
}

export function rulerPicture(
  calendar: Calendar, meta: Meta, heading: string, geometry?: AoiInput["geometry"],
): { content: PictureContent; filename: string } {
  const area = areaLabel(calendar.aoi.name, geometry);
  return {
    filename: `hotspots-${slug(area)}-same-days`,
    content: {
      title: heading,
      details: [`Area: ${area}`, `Dates: ${rangeLine(calendar.range)}`, `Unit: ${calendar.unit_label}`],
      ...common(calendar, meta),
    },
  };
}
