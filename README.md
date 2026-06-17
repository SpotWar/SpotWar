# SpotWar

SpotWar is a geo-territory running game. This repo is multi-package, one directory per
component — see [ARCHITECTURE.md](ARCHITECTURE.md) for the component map.

- `mock-strava/` — local mock of the Strava API, so the dev → test pipeline runs at $0.
- `supabase/` — Supabase project: Postgres + the `ping-strava` Edge Function.
- `app/` — the Expo (React Native + web) client.

## Local development

One command brings up the full "hello world" slice (Expo ↔ Supabase ↔ mock Strava). Pick
the platform you want the app on:

```bash
make dev        # = make web — app on web at http://localhost:8081
make web        # same as make dev
make ios        # app in the iOS Simulator
make android    # app in the Android emulator
```

All four launch the same backend (Supabase + mock Strava + the `ping-strava` Edge Function);
they differ only in where the app runs.

### Prerequisites

- **Node** (with `npm`) — installs the `mock-strava` and `app` packages.
- **Docker running** — `npx supabase start` needs it; start Docker/OrbStack first or
  the target will fail at the Supabase step.
- **`npx supabase`** — the Supabase CLI, run via `npx` (no global install needed).
- **iOS only:** **Xcode** (for the iOS Simulator).
- **Android only:** **Android Studio** with a **running AVD** (emulator) before `make android`.

First checkout only, install the npm dependencies:

```bash
make install     # = npm --prefix mock-strava install && npm --prefix app install
```

### What the targets start

| Service | Command | Port |
|---|---|---|
| Supabase (API/DB/Studio, applies migrations) | `npx supabase start` | API `54321`, DB `54322`, Studio `54323` |
| Mock Strava server | `npm --prefix mock-strava run mock` | `3000` |
| `ping-strava` Edge Function | `npx supabase functions serve ping-strava` | served on `54321/functions/v1/` |
| Expo app | `npm --prefix app run web` / `ios` / `android` | web on `8081` |

Each target starts Supabase first (slowest, needed by the rest), then the mock, the Edge
Function, and finally the Expo app in the foreground. **Ctrl-C** stops the run and tears
down the mock + Edge Function (a non-zero exit on Ctrl-C is normal). Supabase keeps running
in Docker so restarts are fast — run `make down` (`npx supabase stop`) to stop it too.

**Android host networking:** the Android emulator can't reach the host's `localhost`, so
`make android` runs the app with `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321`
(`10.0.2.2` is the emulator's alias for the host). It's passed as a shell env var that
overrides `app/.env` automatically — you don't edit `app/.env`. iOS and web use `localhost`
as-is (the Simulator shares the host loopback).

> **Verification status:** only the **web** target is verified end-to-end so far (see the
> smoke test below). `make ios` / `make android` are wired the same way but have not yet
> been run against a real simulator/emulator.

> Every target seeds the local env files on first run — no manual setup:
> - `app/.env` from `app/.env.example` (the app's Supabase config), and
> - `supabase/functions/.env` with `STRAVA_BASE_URL=http://host.docker.internal:3000`,
>   the override the Dockerized Edge Function needs to reach the host's mock Strava.
>
> Both are gitignored. Existing files are left untouched, so local edits survive.

### Smoke test (proves the slice end-to-end)

With `make dev` (web) up, confirm each leg of the vertical slice:

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
