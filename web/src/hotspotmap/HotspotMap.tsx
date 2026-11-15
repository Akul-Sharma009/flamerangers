// Story 7.7: the month's hotspots on a MapLibre map (no tiles, no key): land
// outlines, the area, the flagged 1° cells outlined by tier, and one dot per
// hotspot. Counted hotspots are filled; excluded ones are open circles.
// MapLibre loads on demand. This draws served rows; it computes nothing.
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, LngLatBoundsLike, Map as MlMap } from "maplibre-gl";
import { unwrapCollection } from "../area/basemap";
import type { AoiGeometry } from "../area/featured";
import type { components } from "../api/schema";
import type { MapHotspot } from "./hotspots";

type Cell = components["schemas"]["Cell"];
type Hex = `#${string}`;

function token(name: string, fallback: Hex): Hex {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (v.startsWith("#") ? v : fallback) as Hex;
}

export function pointsGeoJson(points: MapHotspot[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      properties: { excluded: p.excluded !== "none", satellite: p.satellite, time: p.time },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    })),
  };
}

/** The flagged cells (strong and marginal) as squares from their served corners. */
export function cellsGeoJson(cells: Cell[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells
      .filter((c) => c.flag_state === "strong" || c.flag_state === "marginal")
      .map((c) => ({
        type: "Feature",
        properties: { tier: c.flag_state },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [c.sw_lon, c.sw_lat], [c.sw_lon + c.size_deg, c.sw_lat], [c.sw_lon + c.size_deg, c.sw_lat + c.size_deg],
            [c.sw_lon, c.sw_lat + c.size_deg], [c.sw_lon, c.sw_lat],
          ]],
        },
      })),
  };
}

function frame(geometry: AoiGeometry): LngLatBoundsLike | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      w = Math.min(w, x!); e = Math.max(e, x!); s = Math.min(s, y!); n = Math.max(n, y!);
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  visit(geometry.coordinates);
  return Number.isFinite(w) ? [[w, s], [e, n]] : null;
}

export interface HotspotMapProps {
  geometry: AoiGeometry;
  points: MapHotspot[];
  cells: Cell[];
  label: string;
}

export default function HotspotMap({ geometry, points, cells, label }: HotspotMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const latest = useRef({ points, cells });
  latest.current = { points, cells };

  const push = (map: MlMap) => {
    (map.getSource("points") as GeoJSONSource | undefined)?.setData(pointsGeoJson(latest.current.points));
    (map.getSource("cells") as GeoJSONSource | undefined)?.setData(cellsGeoJson(latest.current.cells));
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const [maplibregl, worker, topo, land] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        import("topojson-client"),
        import("world-atlas/land-50m.json"),
      ]);
      if (disposed || !container.current) return;
      maplibregl.setWorkerUrl(worker.default);
      const atlas = land.default as unknown as Parameters<typeof topo.feature>[0];
      const landGeo = unwrapCollection(
        topo.feature(atlas, atlas.objects.land!) as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] },
      );
      const ink = token("--ink", "#1d1a16");
      const muted = token("--muted", "#6b6355");
      const map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          sources: {
            land: { type: "geojson", data: landGeo as GeoJSON.GeoJSON },
            aoi: { type: "geojson", data: { type: "Feature", properties: {}, geometry: geometry as GeoJSON.Geometry } },
            cells: { type: "geojson", data: cellsGeoJson([]) },
            points: { type: "geojson", data: pointsGeoJson([]) },
          },
          layers: [
            { id: "paper", type: "background", paint: { "background-color": token("--paper", "#f6f0e4") } },
            { id: "land", type: "fill", source: "land", paint: { "fill-color": token("--faint", "#e9e0cf") } },
            { id: "coast", type: "line", source: "land", paint: { "line-color": token("--rule", "#c9bfae"), "line-width": 0.6 } },
            { id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": ink, "line-width": 1.2 } },
            { id: "cells-marginal", type: "line", source: "cells", filter: ["==", ["get", "tier"], "marginal"],
              paint: { "line-color": ink, "line-width": 1.5, "line-dasharray": [2, 2] } },
            { id: "cells-strong", type: "line", source: "cells", filter: ["==", ["get", "tier"], "strong"],
              paint: { "line-color": ink, "line-width": 3 } },
            { id: "points-excluded", type: "circle", source: "points", filter: ["==", ["get", "excluded"], true],
              paint: { "circle-radius": 3.5, "circle-color": "#ffffff", "circle-opacity": 0, "circle-stroke-color": muted, "circle-stroke-width": 1.2 } },
            { id: "points-counted", type: "circle", source: "points", filter: ["==", ["get", "excluded"], false],
              paint: { "circle-radius": 3, "circle-color": token("--c3", "#bd8246"), "circle-stroke-color": ink, "circle-stroke-width": 0.6, "circle-opacity": 0.9 } },
          ],
        },
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        center: [100, 0],
        zoom: 2,
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("error", (e) => console.error("map", e.error));
      map.on("load", () => {
        if (disposed) return;
        ready.current = true;
        push(map);
        const box = frame(geometry);
        if (box) map.fitBounds(box, { padding: 24, animate: false });
      });
    })();
    return () => {
      disposed = true;
      ready.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is built once per area; points and cells update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && ready.current) push(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, cells]);

  return <div ref={container} className="hotspotmap-canvas" role="application" aria-label={label} />;
}
