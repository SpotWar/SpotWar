import type { LatLng } from "./polyline.js";

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two `[lat, lng]` points. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Densify a coarse anchor route into a fine track by linearly interpolating
 * points roughly every `stepMeters` along each leg. Real Strava streams have a
 * GPS sample every ~1s; this gives streams dense enough that per-km pace
 * validation has segments to chew on, while keeping the fixture source compact.
 */
export function densify(anchors: LatLng[], stepMeters = 15): LatLng[] {
  if (anchors.length < 2) return [...anchors];
  const out: LatLng[] = [anchors[0]!];
  for (let i = 1; i < anchors.length; i++) {
    const from = anchors[i - 1]!;
    const to = anchors[i]!;
    const legDist = haversine(from, to);
    const steps = Math.max(1, Math.ceil(legDist / stepMeters));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ]);
    }
  }
  return out;
}

/** Cumulative distance (metres) at each point of a track; first element is 0. */
export function cumulativeDistance(track: LatLng[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < track.length; i++) {
    cum.push(cum[i - 1]! + haversine(track[i - 1]!, track[i]!));
  }
  return cum;
}
