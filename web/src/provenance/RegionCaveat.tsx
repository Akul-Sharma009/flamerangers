// The region caveat beside the map (left column) and its one-line echo beside
// the calendar (Story 3.6). Shown only when the served aoi.region_caveat is not
// "none"; Sumatra, inside a tuning region, carries none.
import { useEffect, useMemo, useState } from "react";
import { messages } from "../api/messages";
import type { components } from "../api/schema";
import type { Evidence } from "../evidence/types";
import { buildCaveat, caveatKind, type EvidenceClass } from "./caveat";
import { layoutCellMap } from "./cellMap";
import { loadCells as defaultLoadCells, type Cells, type CellsLoader } from "./cells";
import "./caveat.css";

type S = components["schemas"];

// evidence.json (about 2.3 MB) is loaded only for an area that needs the
// caveat; the evidence view shares the same chunk.
const defaultLoadEvidence = () => import("../evidence/evidence.json").then((m) => m.default as unknown as Evidence);

/** Map box for the cell map, in px; it fits the left column at 375 px too. */
const MAP_W = 300;
const MAP_H = 150;

/**
 * Fill of each evidence class on the cell map: a pattern, so the class never
 * rests on colour. Tuned is left plain; the others get lines that differ in
 * direction, which reads in print and in grey. The grid's own patterns (45°
 * hatching, dots) are not reused, so no mark means two things on one page.
 */
export const CLASS_FILL: Record<EvidenceClass, string> = {
  tuned: "none",
  tested_unseen: "url(#ev-tested_unseen)",
  reported_only: "url(#ev-reported_only)",
  not_evaluated: "url(#ev-not_evaluated)",
};

function Patterns({ prefix }: { prefix: string }) {
  return (
    <defs>
      <pattern id={`${prefix}tested_unseen`} width="4" height="4" patternUnits="userSpaceOnUse">
        <line className="ev-line" x1="0" y1="2" x2="4" y2="2" />
      </pattern>
      <pattern id={`${prefix}reported_only`} width="4" height="4" patternUnits="userSpaceOnUse">
        <line className="ev-line" x1="2" y1="0" x2="2" y2="4" />
      </pattern>
      <pattern id={`${prefix}not_evaluated`} width="4" height="4" patternUnits="userSpaceOnUse">
        <line className="ev-line" x1="0" y1="2" x2="4" y2="2" />
        <line className="ev-line" x1="2" y1="0" x2="2" y2="4" />
      </pattern>
    </defs>
  );
}

/** Each of the area's 1° cells, marked by its served evidence_class, with a key. */
export function EvidenceCellMap({ cells, classes }: { cells: Cells; classes: EvidenceClass[] }) {
  const L = useMemo(() => layoutCellMap(cells.cells, MAP_W, MAP_H), [cells]);
  if (!L) return null;
  const labels = messages.labels.evidence_class;
  return (
    <figure className="evmap">
      <svg
        width={L.width}
        height={L.height}
        viewBox={`0 0 ${L.width} ${L.height}`}
        role="img"
        aria-label={classes.map((k) => labels[k]).join(" ")}
      >
        <Patterns prefix="ev-" />
        {L.boxes.map((b) => (
          <rect
            key={b.key}
            className={`evcell ${b.cell.evidence_class}`}
            data-class={b.cell.evidence_class}
            x={b.x + 0.5}
            y={b.y + 0.5}
            width={Math.max(1, b.size - 1)}
            height={Math.max(1, b.size - 1)}
            fill={CLASS_FILL[b.cell.evidence_class]}
          >
            <title>{labels[b.cell.evidence_class]}</title>
          </rect>
        ))}
      </svg>
      <figcaption>
        <ul className="evkey">
          {classes.map((k) => (
            <li key={k} data-class={k}>
              <svg width="14" height="14" aria-hidden="true">
                <Patterns prefix={`evk-${k}-`} />
                <rect
                  className="evcell"
                  x="0.5" y="0.5" width="13" height="13"
                  fill={k === "tuned" ? "none" : `url(#evk-${k}-${k})`}
                />
              </svg>
              {labels[k]}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export interface RegionCaveatProps {
  calendar: S["Calendar"];
  meta: S["Meta"];
  /** The area as sent, for the /cells request. */
  aoi: S["CellsRequest"]["aoi"];
  /** Given values skip the loaders (tests, server rendering). */
  evidence?: Evidence | null;
  cells?: Cells | null;
  loadEvidence?: () => Promise<Evidence>;
  loadCells?: CellsLoader;
}

/** The caveat beside the map: the contract's sentence, its fixed claim, and the cell map. */
export function RegionCaveat({
  calendar, meta, aoi, evidence: givenEvidence, cells: givenCells,
  loadEvidence = defaultLoadEvidence, loadCells = defaultLoadCells,
}: RegionCaveatProps) {
  const kind = caveatKind(calendar.aoi);
  const [evidence, setEvidence] = useState<Evidence | null | "failed">(givenEvidence ?? null);
  const [cells, setCells] = useState<Cells | null>(givenCells ?? null);

  useEffect(() => {
    if (!kind || givenEvidence !== undefined) return;
    let live = true;
    loadEvidence().then(
      (e) => live && setEvidence(e),
      () => live && setEvidence("failed"),
    );
    return () => { live = false; };
  }, [kind, givenEvidence, loadEvidence]);

  useEffect(() => {
    if (!kind || givenCells !== undefined) return;
    let live = true;
    setCells(null);
    loadCells(meta, aoi).then((c) => live && setCells(c));
    return () => { live = false; };
    // One request per area and record version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, calendar.aoi.aoi_id, meta.record_version, givenCells]);

  const model = buildCaveat(calendar.aoi, evidence === "failed" ? null : evidence);
  if (!model) return null;
  return (
    <aside className="caveat" data-caveat={model.kind} aria-label={model.lead}>
      <p className="caveat-lead">{model.lead}</p>
      {model.claim ? <p className="caveat-claim" data-claim={model.claim.id}>{model.claim.text}</p> : null}
      {evidence === "failed" ? <p className="caveat-claim">{messages.client.evidence_unavailable}</p> : null}
      {cells ? <EvidenceCellMap cells={cells} classes={model.classes} /> : null}
    </aside>
  );
}

/** The same caveat as one line beside the calendar, so it is in view on a phone too. */
export function CaveatLine({ calendar }: { calendar: S["Calendar"] }) {
  const kind = caveatKind(calendar.aoi);
  if (!kind) return null;
  return <p className="caveat-line" data-caveat={kind}>{messages.labels.region_caveat[kind]}</p>;
}
