import polyline from "@mapbox/polyline";

/** A single GPS point as Strava emits it in streams: [latitude, longitude]. */
export type LatLng = [number, number];

/**
 * Encode a `[lat, lng]` track into a Google/Strava encoded polyline string.
 * Strava uses precision 5 (the @mapbox/polyline default), which is what the
 * real `map.polyline` / `map.summary_polyline` fields contain.
 */
export function encode(track: LatLng[]): string {
  return polyline.encode(track);
}

/** Inverse of {@link encode}; handy for verification/debugging. */
export function decode(encoded: string): LatLng[] {
  return polyline.decode(encoded) as LatLng[];
}
