/**
 * Hardcoded Strava `DetailedAthlete` (subset) returned by GET /api/v3/athlete
 * and embedded in the OAuth token response. A Montréal-based fake runner.
 */
export const ATHLETE = {
  id: 134_815,
  username: "spotwar_dev",
  resource_state: 3,
  firstname: "Maxime",
  lastname: "Tremblay",
  bio: "SPOTWAR mock athlete",
  city: "Montréal",
  state: "Quebec",
  country: "Canada",
  sex: "M",
  premium: true,
  summit: true,
  created_at: "2024-01-15T09:00:00Z",
  updated_at: "2026-06-01T09:00:00Z",
  badge_type_id: 1,
  weight: 72.5,
  profile_medium: "https://dgalywyr863hv.cloudfront.net/pictures/athletes/134815/medium.jpg",
  profile: "https://dgalywyr863hv.cloudfront.net/pictures/athletes/134815/large.jpg",
  friend: null,
  follower: null,
} as const;
