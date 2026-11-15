import { useState } from "react";
import { captureSvg, cssVar } from "./capture";
import { composeFigure, type FigureSpec } from "./figure";
import { downloadFigure, type PictureFormat } from "./save";
import "./download.css";

/** What the picture says besides the chart; every value is served and already formatted. */
export type PictureContent = Pick<FigureSpec, "title" | "details" | "legendHeading" | "legend" | "notes" | "footer">;

/**
 * Picture download for one chart (Story 4.3): a PNG or SVG choice and one
 * button. `find` returns the live chart's <svg>; the file is that chart plus
 * the title, area, dates, unit, legend, data-through, record version and source
 * line. Story 4.4 places the controls; this is the part that makes the file.
 */
export function PictureDownload({
  label, filename, find, content,
}: {
  /** What is downloaded, for the accessible names ("calendar", "ruler"). */
  label: string;
  filename: string;
  find: () => SVGSVGElement | null;
  content: PictureContent;
}) {
  const [format, setFormat] = useState<PictureFormat>("png");
  const [state, setState] = useState<"idle" | "busy" | "failed" | "missing">("idle");

  const go = async () => {
    const svg = find();
    if (!svg) return setState("missing");
    setState("busy");
    try {
      const fig = composeFigure({
        ...content,
        chart: captureSvg(svg),
        colors: { paper: cssVar("--paper", "#fff"), ink: cssVar("--ink", "#000"), muted: cssVar("--muted", "#666"), rule: cssVar("--rule", "#ccc") },
        fonts: { serif: cssVar("--serif", "serif"), sans: cssVar("--sans", "sans-serif") },
      });
      await downloadFigure(fig, format, filename);
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="picdl" role="group" aria-label={`Download the ${label} as a picture`}>
      <label>
        Picture
        <select value={format} onChange={(e) => setFormat(e.target.value as PictureFormat)} aria-label={`${label} picture format`}>
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
        </select>
      </label>
      <button type="button" onClick={go} disabled={state === "busy"}>
        Download {label}
      </button>
      {/* TODO(picture_errors): no contract sentences for these two states. */}
      {state === "failed" ? <span role="alert">The picture could not be made. Please try again.</span> : null}
      {state === "missing" ? <span role="alert">Show the grid view to download the calendar picture.</span> : null}
    </div>
  );
}
