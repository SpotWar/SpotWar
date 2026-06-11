import { cumulativeDistance, densify } from "../lib/geo.js";
import { encode, type LatLng } from "../lib/polyline.js";
import { ATHLETE } from "./athlete.js";

/**
 * Raw fixture: a coarse route of real Montréal anchor points plus a per-km pace
 * plan. Everything Strava exposes (distance, moving_time, streams, polyline) is
 * derived from these so the numbers stay internally consistent — the encoded
 * polyline and the latlng stream trace the exact same ground, and moving_time
 * matches the pace plan.
 */
interface RawActivity {
  id: number;
  name: string;
  /** Montréal neighborhood the route sits inside — drives PostGIS attribution. */
  neighborhood: string;
  /** ISO-8601 UTC start (also used, offset, for start_date_local). */
  startDate: string;
  /** Coarse route; densified to a full GPS track at build time. */
  anchors: LatLng[];
  /**
   * Pace per whole-km bucket, in seconds/km. Index 0 = first km, etc. Buckets
   * beyond the array fall back to `defaultPaceSecPerKm`. Valid SPOTWAR window is
   * 150s (2:30) – 720s (12:00) per km.
   */
  pacePlanSecPerKm?: number[];
  defaultPaceSecPerKm: number;
}

const MONTREAL_TZ = "(GMT-05:00) America/Montreal" as const;

const RAW_ACTIVITIES: RawActivity[] = [
  {
    id: 9_001,
    name: "Morning loop around Parc La Fontaine",
    neighborhood: "Le Plateau-Mont-Royal",
    startDate: "2026-06-08T11:02:00Z",
    // Loop hugging Parc La Fontaine — well inside the Plateau polygon.
    anchors: [
      [45.5232, -73.569],
      [45.525, -73.566],
      [45.527, -73.5635],
      [45.5288, -73.5662],
      [45.5275, -73.57],
      [45.5255, -73.572],
      [45.5238, -73.5705],
      [45.5232, -73.569],
    ],
    defaultPaceSecPerKm: 330, // 5:30/km — comfortably valid
  },
  {
    id: 9_002,
    name: "Rosemont tempo run",
    neighborhood: "Rosemont–La Petite-Patrie",
    startDate: "2026-06-09T22:35:00Z",
    anchors: [
      [45.5375, -73.603],
      [45.5395, -73.6],
      [45.5415, -73.597],
      [45.5435, -73.5995],
      [45.5418, -73.6025],
      [45.5398, -73.6045],
      [45.5375, -73.603],
    ],
    defaultPaceSecPerKm: 375, // 6:15/km — valid throughout
  },
  {
    id: 9_003,
    name: "Lachine Canal mixed run (with a walk break)",
    neighborhood: "Le Sud-Ouest",
    startDate: "2026-06-10T12:10:00Z",
    anchors: [
      [45.4775, -73.586],
      [45.4762, -73.5825],
      [45.475, -73.579],
      [45.4742, -73.5755],
      [45.4758, -73.574],
      [45.4772, -73.577],
      [45.4785, -73.5805],
      [45.4775, -73.586],
    ],
    // km 0 fast/valid, km 1 a 14:00 walk break (invalid — too slow),
    // remaining kms valid. Exercises the validator's mixed-run path.
    pacePlanSecPerKm: [300, 840, 330],
    defaultPaceSecPerKm: 330,
  },
  {
    id: 9_004,
    name: "Longueuil riverside run",
    // A perfectly valid run that simply happens off-island, across the river —
    // inside NO SPOTWAR neighborhood. Exercises the attribution no-match path
    // (ST_Contains returns nothing → auto-assign / "unterritoried run" handling).
    neighborhood: "Longueuil, South Shore (outside any SPOTWAR neighborhood)",
    startDate: "2026-06-07T13:20:00Z",
    anchors: [
      [45.534, -73.51],
      [45.5355, -73.5075],
      [45.537, -73.505],
      [45.5358, -73.503],
      [45.5342, -73.506],
      [45.534, -73.51],
    ],
    defaultPaceSecPerKm: 345, // 5:45/km — fully valid, just unterritoried
  },
];

export interface BuiltActivity {
  raw: RawActivity;
  track: LatLng[];
  /** Cumulative metres at each track point (first = 0). */
  cumDist: number[];
  /** Elapsed seconds at each track point (first = 0). */
  timeStream: number[];
  distance: number; // metres, rounded
  movingTime: number; // seconds, rounded
  polyline: string;
}

function buildTimeStream(
  cumDist: number[],
  pacePlan: number[],
  defaultPace: number,
): number[] {
  const time: number[] = [0];
  for (let i = 1; i < cumDist.length; i++) {
    const segDist = cumDist[i]! - cumDist[i - 1]!;
    const kmBucket = Math.floor(cumDist[i - 1]! / 1000);
    const paceSecPerKm = pacePlan[kmBucket] ?? defaultPace;
    time.push(time[i - 1]! + (segDist / 1000) * paceSecPerKm);
  }
  return time;
}

function build(raw: RawActivity): BuiltActivity {
  const track = densify(raw.anchors);
  const cumDist = cumulativeDistance(track);
  const timeStream = buildTimeStream(
    cumDist,
    raw.pacePlanSecPerKm ?? [],
    raw.defaultPaceSecPerKm,
  );
  return {
    raw,
    track,
    cumDist,
    timeStream,
    distance: Math.round(cumDist[cumDist.length - 1]!),
    movingTime: Math.round(timeStream[timeStream.length - 1]!),
    polyline: encode(track),
  };
}

const BUILT: BuiltActivity[] = RAW_ACTIVITIES.map(build);
const BY_ID = new Map<number, BuiltActivity>(BUILT.map((a) => [a.raw.id, a]));

export function getBuiltActivity(id: number): BuiltActivity | undefined {
  return BY_ID.get(id);
}

export function listBuiltActivities(): BuiltActivity[] {
  return BUILT;
}

/** Strava `SummaryActivity` shape (subset used by SPOTWAR). */
export function toSummaryActivity(a: BuiltActivity) {
  const { raw, track, distance, movingTime, polyline } = a;
  const avgSpeed = movingTime > 0 ? distance / movingTime : 0;
  return {
    id: raw.id,
    name: raw.name,
    distance,
    moving_time: movingTime,
    elapsed_time: movingTime + 45, // small fake pause
    total_elevation_gain: 12,
    type: "Run",
    sport_type: "Run",
    start_date: raw.startDate,
    start_date_local: raw.startDate.replace("Z", "-05:00"),
    timezone: MONTREAL_TZ,
    utc_offset: -18000,
    start_latlng: track[0]!,
    end_latlng: track[track.length - 1]!,
    average_speed: Number(avgSpeed.toFixed(3)),
    max_speed: Number((avgSpeed * 1.4).toFixed(3)),
    athlete: { id: ATHLETE.id, resource_state: 1 },
    map: {
      id: `a${raw.id}`,
      summary_polyline: polyline,
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: "everyone",
    resource_state: 2,
  };
}

/** Strava `DetailedActivity` shape (subset) — adds full polyline + description. */
export function toDetailedActivity(a: BuiltActivity) {
  const summary = toSummaryActivity(a);
  return {
    ...summary,
    resource_state: 3,
    description: `Mock activity — ${a.raw.neighborhood}.`,
    calories: Math.round((a.distance / 1000) * 65),
    map: {
      id: `a${a.raw.id}`,
      polyline: a.polyline,
      summary_polyline: a.polyline,
      resource_state: 3,
    },
  };
}
