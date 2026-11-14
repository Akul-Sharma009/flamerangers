// The basemap's land outlines. world-atlas rings that cross 180 degrees (Fiji,
// Chukotka, Antarctica) jump from +180 to -180, and MapLibre draws that jump as
// a line across the whole map. Unwrapping each ring (continuing past 180 instead
// of jumping) removes the line. Map geometry only: no number from it is shown.

type Ring = number[][];

export function unwrapRing(ring: Ring): Ring {
  let offset = 0;
  return ring.map((p, i) => {
    if (i > 0) {
      const step = p[0]! - ring[i - 1]![0]!;
      if (step > 180) offset -= 360;
      else if (step < -180) offset += 360;
    }
    return [p[0]! + offset, p[1]!];
  });
}

type Geometry = { type: string; coordinates: unknown };

export function unwrapGeometry<G extends Geometry>(g: G): G {
  if (g.type === "Polygon") return { ...g, coordinates: (g.coordinates as Ring[]).map(unwrapRing) };
  if (g.type === "MultiPolygon") {
    return { ...g, coordinates: (g.coordinates as Ring[][]).map((poly) => poly.map(unwrapRing)) };
  }
  return g;
}

export function unwrapCollection<C extends { features: { geometry: Geometry }[] }>(c: C): C {
  return { ...c, features: c.features.map((f) => ({ ...f, geometry: unwrapGeometry(f.geometry) })) };
}
