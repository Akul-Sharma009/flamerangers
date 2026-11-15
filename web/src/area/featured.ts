// Featured areas come from contract/regions.geojson, the one list both sides read.
import regionsRaw from "../../../contract/regions.geojson?raw";
import type { CalendarRequest } from "../api/client";

export type AoiInput = CalendarRequest["aoi"];
export type AoiGeometry = AoiInput["geometry"];

export interface FeaturedArea {
  id: string;
  name: string;
  isDefault: boolean;
  /** How the conversion was evaluated here (contract/regions.geojson). */
  evidenceClass: "tuned" | "tested_unseen" | "reported_only";
  aoi: AoiInput;
}

interface RegionFeature {
  properties: { region_id: string; name: string; evidence_class: FeaturedArea["evidenceClass"]; featured?: boolean; default?: boolean };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown[] };
}

export function featuredAreas(raw: string = regionsRaw): FeaturedArea[] {
  const collection = JSON.parse(raw) as { features: RegionFeature[] };
  return collection.features
    .filter((f) => f.properties.featured === true)
    .map((f) => ({
      id: f.properties.region_id,
      name: f.properties.name,
      isDefault: f.properties.default === true,
      evidenceClass: f.properties.evidence_class,
      aoi: {
        name: f.properties.name,
        geometry: { type: f.geometry.type, coordinates: f.geometry.coordinates },
      },
    }));
}

/** The area selected on first load (Sumatra in contract 0.2.0). */
export function defaultArea(areas: FeaturedArea[] = featuredAreas()): FeaturedArea {
  const found = areas.find((a) => a.isDefault);
  if (!found) throw new Error("no default region in regions.geojson");
  return found;
}
