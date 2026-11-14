// A MapLibre map with no tiles and no key: Natural Earth land outlines
// (world-atlas, public domain) drawn from GeoJSON on the paper ground, the chosen
// area on top, and terra-draw for polygons and rectangles when drawing.
// MapLibre, terra-draw and the land data load on demand, so tests and the first
// paint don't wait for them.
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap, GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import type { TerraDraw } from "terra-draw";
import { unwrapCollection } from "./basemap";
import type { AoiGeometry } from "./featured";
import type { Polygon } from "./typed";

export type DrawMode = "polygon" | "rectangle";

interface Props {
  geometry: AoiGeometry | null;
  /** Locator: a still picture at 1:110m. Drawing: pan, zoom and draw at 1:50m. */
  variant: "locator" | "draw";
  drawMode?: DrawMode;
  onDrawn?: (geometry: Polygon) => void;
  label: string;
}

type Hex = `#${string}`;

function token(name: string, fallback: Hex): Hex {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (v.startsWith("#") ? v : fallback) as Hex;
}

function asFeatureCollection(geometry: AoiGeometry | null) {
  return {
    type: "FeatureCollection" as const,
    features: geometry ? [{ type: "Feature" as const, properties: {}, geometry: geometry as GeoJSON.Geometry }] : [],
  };
}

/** The box that frames the area, for the camera only; never shown. */
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

export function MapView({ geometry, variant, drawMode, onDrawn, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  /** True once the map's style has loaded and the area layer exists. */
  const readyRef = useRef(false);
  const geometryRef = useRef(geometry);
  const onDrawnRef = useRef(onDrawn);
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  geometryRef.current = geometry;
  onDrawnRef.current = onDrawn;

  const showArea = (map: MlMap, g: AoiGeometry | null, animate: boolean) => {
    (map.getSource("aoi") as GeoJSONSource | undefined)?.setData(asFeatureCollection(g));
    // The locator frames the area; the drawing map keeps the user's own view.
    const box = g && variant === "locator" ? frame(g) : null;
    if (box) map.fitBounds(box, { padding: 14, maxZoom: 5, animate });
  };

  useEffect(() => {
    let disposed = false;
    const interactive = variant === "draw";
    (async () => {
      const [maplibregl, worker, topo, land] = await Promise.all([
        import("maplibre-gl"),
        // MapLibre finds its worker beside its own file, which Vite's bundling
        // moves; point it at the worker file explicitly (dev and build).
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        import("topojson-client"),
        interactive ? import("world-atlas/land-50m.json") : import("world-atlas/land-110m.json"),
      ]);
      if (disposed || !container.current) return;
      maplibregl.setWorkerUrl(worker.default);
      const atlas = land.default as unknown as Parameters<typeof topo.feature>[0];
      const landGeo = unwrapCollection(
        topo.feature(atlas, atlas.objects.land!) as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] },
      );
      const ink = token("--ink", "#1d1a16");
      const map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          sources: {
            land: { type: "geojson", data: landGeo as GeoJSON.GeoJSON },
            aoi: { type: "geojson", data: asFeatureCollection(geometryRef.current) },
          },
          layers: [
            { id: "paper", type: "background", paint: { "background-color": token("--paper", "#f6f0e4") } },
            { id: "land", type: "fill", source: "land", paint: { "fill-color": token("--faint", "#e9e0cf") } },
            { id: "coast", type: "line", source: "land", paint: { "line-color": token("--rule", "#c9bfae"), "line-width": 0.6 } },
            { id: "aoi-fill", type: "fill", source: "aoi", paint: { "fill-color": token("--c3", "#bd8246"), "fill-opacity": 0.18 } },
            { id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": ink, "line-width": 1.5 } },
          ],
        },
        interactive,
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        center: [100, 0],
        zoom: 2,
      });
      if (interactive) map.touchZoomRotate.disableRotation();
      mapRef.current = map;
      map.on("error", (e) => console.error("map", e.error));
      map.on("load", async () => {
        if (disposed) return;
        readyRef.current = true;
        showArea(map, geometryRef.current, false);
        if (!interactive) return;
        const td = await import("terra-draw");
        const { TerraDrawMapLibreGLAdapter } = await import("terra-draw-maplibre-gl-adapter");
        if (disposed) return;
        const styles = { fillColor: token("--c3", "#bd8246"), fillOpacity: 0.25, outlineColor: ink, outlineWidth: 2 };
        const draw = new td.TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map }),
          modes: [
            new td.TerraDrawPolygonMode({
              styles: { ...styles, closingPointColor: ink, closingPointOutlineColor: ink },
              validation: (feature, { updateType }) =>
                String(updateType) === "finish" ? td.ValidateNotSelfIntersecting(feature) : { valid: true },
            }),
            new td.TerraDrawRectangleMode({ styles }),
          ],
        });
        draw.start();
        draw.on("finish", (id) => {
          const feature = draw.getSnapshotFeature(id);
          draw.clear();
          if (feature?.geometry.type === "Polygon") {
            onDrawnRef.current?.({ type: "Polygon", coordinates: feature.geometry.coordinates as number[][][] });
          }
        });
        drawRef.current = draw;
        draw.setMode(drawModeRef.current ?? "polygon");
      });
    })();
    return () => {
      disposed = true;
      drawRef.current?.stop();
      drawRef.current = null;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is built once per variant; the area and mode update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    if (drawRef.current && drawMode) drawRef.current.setMode(drawMode);
  }, [drawMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) showArea(map, geometry, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  return (
    <div
      ref={container}
      className={variant === "locator" ? "areamap areamap-locator" : "areamap areamap-draw"}
      role={variant === "locator" ? "img" : "application"}
      aria-label={label}
    />
  );
}
