import type { BuiltActivity } from "./activities.js";

/**
 * Strava stream-set JSON (the `keys=time,distance,latlng,altitude` &
 * `key_by_type=true` form) for GET /api/v3/activities/{id}/streams.
 *
 * Per-km pace validation (SPOTWAR, Sprint 2) reads `time` + `distance` to
 * compute the pace of each whole-km segment, and `latlng` to attribute the run
 * to a neighborhood. These streams are derived from the same densified track as
 * the activity, so distance/time/latlng are mutually consistent.
 */
export function buildStreamSet(a: BuiltActivity) {
  const time = a.timeStream.map((t) => Math.round(t));
  const distance = a.cumDist.map((d) => Number(d.toFixed(1)));
  const latlng = a.track.map(([lat, lng]) => [lat, lng]);
  // Gentle synthetic elevation so the field is present and plausible.
  const altitude = a.track.map((_, i) => Number((28 + Math.sin(i / 25) * 6).toFixed(1)));
  const n = a.track.length;

  return {
    time: { data: time, series_type: "distance", original_size: n, resolution: "high" },
    distance: { data: distance, series_type: "distance", original_size: n, resolution: "high" },
    latlng: { data: latlng, series_type: "distance", original_size: n, resolution: "high" },
    altitude: { data: altitude, series_type: "distance", original_size: n, resolution: "high" },
  };
}
