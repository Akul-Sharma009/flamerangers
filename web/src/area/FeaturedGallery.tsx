// The featured-area gallery (Story 8.8): the six evaluated regions as cards, so a
// judge reaches each in one click. A card shows the region's outline (drawn from
// contract/regions.geojson, unchanged; drawing is display, not a number), the
// contract's evidence-class sentence, and, for the southern African savanna, the
// Story 3.6 caveat sentence before the area is opened.
import { messages } from "../api/messages";
import type { AoiInput, FeaturedArea } from "./featured";

/** Featured areas that carry a region caveat, keyed by region_id; the sentence is the contract's. */
const CARD_CAVEAT: Record<string, keyof typeof messages.labels.region_caveat> = {
  southern_africa: "southern_africa",
};

type Pt = [number, number];

function rings(g: AoiInput["geometry"]): Pt[][] {
  const coords = g.coordinates as unknown as number[][][] | number[][][][];
  return (g.type === "Polygon" ? [coords as number[][][]] : (coords as number[][][][])).flatMap(
    (poly) => poly.map((r) => r.map((p) => [p[0]!, p[1]!] as Pt)),
  );
}

/** SVG path data for the outline, scaled to fit a box. Display only. */
export function outlinePath(g: AoiInput["geometry"], w: number, h: number, pad = 4): string {
  const rs = rings(g);
  const pts = rs.flat();
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const w0 = Math.min(...lons), e0 = Math.max(...lons), s0 = Math.min(...lats), n0 = Math.max(...lats);
  const k = Math.cos((((s0 + n0) / 2) * Math.PI) / 180); // equirectangular, shape only
  const spanX = Math.max((e0 - w0) * k, 1e-6);
  const spanY = Math.max(n0 - s0, 1e-6);
  const scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (h - spanY * scale) / 2;
  return rs
    .map((r) => "M" + r.map(([x, y]) => `${(ox + (x - w0) * k * scale).toFixed(1)},${(oy + (n0 - y) * scale).toFixed(1)}`).join("L") + "Z")
    .join("");
}

export interface GalleryProps {
  areas: FeaturedArea[];
  currentName: string | null;
  onSelect: (aoi: AoiInput) => void;
}

export function FeaturedGallery({ areas, currentName, onSelect }: GalleryProps) {
  return (
    <ul className="featured gallery">
      {areas.map((a) => {
        const caveatKey = CARD_CAVEAT[a.id];
        const label = messages.labels.evidence_class[a.evidenceClass];
        return (
          <li key={a.id} className="card" data-region={a.id} data-class={a.evidenceClass}>
            <svg className="outline" viewBox="0 0 64 48" width="64" height="48" aria-hidden="true">
              <path d={outlinePath(a.aoi.geometry, 64, 48)} />
            </svg>
            <div className="card-text">
              <button
                type="button"
                aria-current={a.name === currentName ? "true" : undefined}
                aria-describedby={`card-label-${a.id}`}
                onClick={() => onSelect(a.aoi)}
              >
                {a.name}
              </button>
              <p className="card-label" id={`card-label-${a.id}`}>{label}</p>
              {caveatKey ? <p className="caution card-caveat" data-caveat={caveatKey}>{messages.labels.region_caveat[caveatKey]}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
