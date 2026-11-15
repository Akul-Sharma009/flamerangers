// Story 8.10: the globe itself. MapLibre GL 6's globe projection, Natural Earth
// land (world-atlas) hatched where nothing is loaded, each served 1° cell as a
// square tinted by flag state, and a shape mark on flagged cells: a filled dot
// for strong, a ring for marginal (not colour alone). Selecting a cell opens
// its calendar. Map geometry only: no number from it is shown.
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import { unwrapCollection } from "../area/basemap";
import { cellFeatures, cellLink, markFeatures, type WorldCells } from "./world";

function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** A small diagonal hatch as raw pixels, for land that is not loaded. */
function hatch(rgb: [number, number, number], bg: [number, number, number]) {
  const n = 8;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const on = (x + y) % n === 0 || (x + y) % n === 1;
      const c = on ? rgb : bg;
      data.set([c[0], c[1], c[2], 255], (y * n + x) * 4);
    }
  }
  return { width: n, height: n, data };
}

function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function GlobeMap({ cells, label, onSelect }: { cells: WorldCells | null; label: string; onSelect?: (href: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const show = (map: MlMap, w: WorldCells | null) => {
    const empty = { type: "FeatureCollection" as const, features: [] };
    (map.getSource("cells") as GeoJSONSource | undefined)?.setData((w ? cellFeatures(w) : empty) as GeoJSON.GeoJSON);
    (map.getSource("marks") as GeoJSONSource | undefined)?.setData((w ? markFeatures(w) : empty) as GeoJSON.GeoJSON);
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const [maplibregl, worker, topo, land] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        import("topojson-client"),
        import("world-atlas/land-110m.json"),
      ]);
      if (disposed || !container.current) return;
      maplibregl.setWorkerUrl(worker.default);
      const atlas = land.default as unknown as Parameters<typeof topo.feature>[0];
      const landGeo = unwrapCollection(
        topo.feature(atlas, atlas.objects.land!) as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] },
      );
      const ink = token("--ink", "#1d1a16");
      const paper = token("--paper", "#f6f0e4");
      const map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          projection: { type: "globe" },
          sources: {
            land: { type: "geojson", data: landGeo as GeoJSON.GeoJSON },
            cells: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
            marks: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
          },
          layers: [
            { id: "paper", type: "background", paint: { "background-color": token("--faint", "#e9e0cf") } },
            { id: "land", type: "fill", source: "land", paint: { "fill-pattern": "hatch" } },
            { id: "coast", type: "line", source: "land", paint: { "line-color": token("--muted", "#6b6257"), "line-width": 0.5 } },
            {
              id: "cell-fill", type: "fill", source: "cells",
              paint: {
                "fill-color": ["match", ["get", "flag_state"],
                  "strong", token("--c4", "#9a5f2e"), "marginal", token("--c2", "#d3a866"),
                  "none", paper, "not_flaggable", paper, token("--faint", "#e9e0cf")],
              },
            },
            {
              id: "cell-line", type: "line", source: "cells",
              paint: { "line-color": ink, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.2, 5, 0.8], "line-opacity": 0.6 },
            },
            {
              id: "mark-strong", type: "circle", source: "marks", filter: ["==", ["get", "flag_state"], "strong"],
              paint: { "circle-color": ink, "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 1, 1.2, 6, 24] },
            },
            {
              id: "mark-marginal", type: "circle", source: "marks", filter: ["==", ["get", "flag_state"], "marginal"],
              paint: {
                "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ink,
                "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 2],
                "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 1, 1.2, 6, 24],
              },
            },
          ],
        },
        attributionControl: false,
        center: [100, 0],
        zoom: 1.6,
      });
      mapRef.current = map;
      map.on("styleimagemissing", (e) => {
        if (e.id === "hatch" && !map.hasImage("hatch")) map.addImage("hatch", hatch(rgbOf(token("--rule", "#c9bfae")), rgbOf(token("--faint", "#e9e0cf"))));
      });
      map.on("error", (e) => console.error("globe", e.error));
      map.on("click", "cell-fill", (e) => {
        const p = e.features?.[0]?.properties as { sw_lon: number; sw_lat: number } | undefined;
        if (!p) return;
        const href = cellLink({ sw_lon: Number(p.sw_lon), sw_lat: Number(p.sw_lat) });
        if (selectRef.current) selectRef.current(href);
        else window.location.hash = href;
      });
      map.on("mouseenter", "cell-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "cell-fill", () => { map.getCanvas().style.cursor = ""; });
      map.on("load", () => {
        if (disposed) return;
        readyRef.current = true;
        show(map, cellsRef.current);
      });
    })().catch((err) => console.error("globe", err));
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && readyRef.current) show(mapRef.current, cells);
  }, [cells]);

  // The map is a picture for pointer users; the table below is its keyboard and screen-reader equivalent.
  return <div ref={container} className="globe-map" role="img" aria-label={label} />;
}
