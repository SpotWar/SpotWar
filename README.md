# SpotWar

SpotWar is a geo-territory running game. This repo is multi-package, one directory per
component — see [ARCHITECTURE.md](ARCHITECTURE.md) for the component map.

- `mock-strava/` — local mock of the Strava API, so the dev → test pipeline runs at $0.
- `supabase/` — Supabase project: Postgres + the `ping-strava` Edge Function.
- `app/` — the Expo (React Native + web) client.

## Local development

One command brings up the full "hello world" slice (Expo ↔ Supabase ↔ mock Strava):

```bash
make dev
```

### Prerequisites

- **Node** (with `npm`) — installs the `mock-strava` and `app` packages.
- **Docker running** — `npx supabase start` needs it; start Docker/OrbStack first or
  `make dev` will fail at the Supabase step.
- **`npx supabase`** — the Supabase CLI, run via `npx` (no global install needed).

First checkout only, install the npm dependencies:

```bash
make install     # = npm --prefix mock-strava install && npm --prefix app install
```

### What `make dev` starts

| Service | Command | Port |
|---|---|---|
| Supabase (API/DB/Studio, applies migrations) | `npx supabase start` | API `54321`, DB `54322`, Studio `54323` |
| Mock Strava server | `npm --prefix mock-strava run mock` | `3000` |
| `ping-strava` Edge Function | `npx supabase functions serve ping-strava` | served on `54321/functions/v1/` |
| Expo app (web) | `npm --prefix app run web` | `8081` |

`make dev` starts Supabase first (slowest, needed by the rest), then the mock, the Edge
Function, and finally the Expo app in the foreground. **Ctrl-C** stops `make dev` and tears
down the mock + Edge Function (a non-zero exit on Ctrl-C is normal). Supabase keeps running
in Docker so restarts are fast — run `make down` (`npx supabase stop`) to stop it too.

> `make dev` seeds the local env files on first run — no manual setup:
> - `app/.env` from `app/.env.example` (the app's Supabase config), and
> - `supabase/functions/.env` with `STRAVA_BASE_URL=http://host.docker.internal:3000`,
>   the override the Dockerized Edge Function needs to reach the host's mock Strava.
>
> Both are gitignored. Existing files are left untouched, so local edits survive.

### Smoke test (proves the slice end-to-end)

With `make dev` up, confirm each leg of the vertical slice:

1. **App loads on web.** Open <http://localhost:8081> — the screen shows
   **"Supabase: configured"** (the env from `app/.env` resolved).

2. **Ping round-trip renders.** Below that, the app shows **`last ping: <id> @ <timestamp>`**
   — proof it wrote a row to the `ping` table and read the latest back through Supabase.
   You can reproduce the same round-trip against the REST API directly:

   ```bash
   ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
   # write one ping
   curl -s -X POST "http://localhost:54321/rest/v1/ping" \
     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
     -H "content-type: application/json" -H "Prefer: return=representation" \
     -d '{"note":"smoke test"}'
   # read the latest back
   curl -s "http://localhost:54321/rest/v1/ping?select=id,note,created_at&order=created_at.desc&limit=1" \
     -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
   ```

3. **Edge Function returns the mock athlete.** Call `ping-strava`; it proxies the mock
   Strava `GET /api/v3/athlete` and returns the Montréal athlete (id `134815`):

   ```bash
   curl -s -X POST "http://localhost:54321/functions/v1/ping-strava" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
   # → {"athlete":{"id":134815,"username":"spotwar_dev", … }}
   ```

All three green means the Expo ↔ Supabase ↔ mock Strava wiring is proven — the story DoD.

Per-component details are in each package's README: [`mock-strava/`](mock-strava/README.md)
and [`app/`](app/README.md).
