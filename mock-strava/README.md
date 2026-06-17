# Mock Strava API server

A lightweight local mock of the Strava API endpoints SPOTWAR uses, so the full
**dev → test pipeline runs at $0** before connecting to the real (paid) Strava
API in production. Built with [Hono](https://hono.dev) + TypeScript on Node.

## Run

```bash
cd mock-strava
npm install
npm run mock          # tsx watch on http://localhost:3000  (auto-reload)
# or: npm start       # one-shot, no watch
```

Copy `.env.example` → `.env` and adjust if needed (the repo `.gitignore` keeps
`.env` out of git).

## Environment switch

Edge Functions choose the Strava base URL from a single env var — no code change
at deploy time:

```ts
const STRAVA_BASE_URL = process.env.STRAVA_MOCK === 'true'
  ? 'http://localhost:3000'   // mock (this server)
  : 'https://www.strava.com'  // prod
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/oauth/token` | Fake token exchange (auth-code **and** refresh-token grants). |
| GET | `/api/v3/athlete` | Hardcoded Montréal athlete profile. |
| GET | `/api/v3/athlete/activities` | List of seeded runs (`per_page`/`page` honoured). |
| GET | `/api/v3/activities/:id` | Single detailed activity with full `map.polyline`. |
| GET | `/api/v3/activities/:id/streams` | `time` / `distance` / `latlng` / `altitude` streams for per-km pace validation. |
| POST | `/push_subscriptions` | Fake webhook registration — always `200 { id }`. |
| POST | `/simulate-webhook` | Build a Strava webhook event and POST it to the local Edge Function. |

## Local dev flow

```
Mock Strava (:3000)
    → POST /simulate-webhook
    → Supabase local Edge Function (:54321)
    → Postgres + PostGIS (local Docker)
    → Realtime broadcast
    → Expo Go app
```

`/simulate-webhook` accepts an optional JSON body to override the event:

```bash
curl -X POST localhost:3000/simulate-webhook \
  -H 'content-type: application/json' \
  -d '{"objectId": 9003, "aspectType": "create"}'
```

It forwards the event to `WEBHOOK_TARGET_URL` and returns the downstream status,
so the whole loop is observable. Until the webhook Edge Function exists you'll
get a `502` with the connection error — that's expected and proves the target.

## Seeded data

Four runs covering the cases the attribution pipeline must handle. The first
three sit on **real Montréal routes inside distinct neighborhoods** so PostGIS
territory logic (`ST_Contains` / `ST_Intersects`) resolves to different
territories; the fourth is a valid run that falls **outside every neighborhood**:

| id | Location | Notes |
|---|---|---|
| 9001 | Le Plateau-Mont-Royal | Steady ~5:30/km — fully valid. |
| 9002 | Rosemont–La Petite-Patrie | Tempo ~6:15/km — fully valid. |
| 9003 | Le Sud-Ouest | Mixed: one ~14:00/km walk-break km (invalid) — exercises the pace validator's mixed-run path. |
| 9004 | Longueuil (South Shore, off-island) | Valid ~5:45/km but inside **no** neighborhood — exercises the `ST_Contains` no-match / auto-assign path. |

Polylines are generated from the route coordinates at startup, so the encoded
`map.polyline`, the `latlng` stream, and `distance`/`moving_time` all describe
the same ground. Edit routes/paces in `src/data/activities.ts`.

Valid SPOTWAR pace window: **2:30/km – 12:00/km**, analysed per whole-km segment.

## Layout

```
src/
  server.ts            Hono app + routes
  data/athlete.ts      Hardcoded athlete profile
  data/activities.ts   Route fixtures + Strava activity builders
  data/streams.ts      Stream-set builder
  lib/geo.ts           Haversine + route densify
  lib/polyline.ts      Polyline encode/decode wrapper
  lib/webhook.ts       Webhook event payload + dispatch
```
