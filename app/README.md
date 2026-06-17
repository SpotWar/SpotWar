# SpotWar app

The SpotWar client — one Expo (React Native + react-native-web) codebase targeting
**iOS, Android, and web** (incl. the public web landing page). See
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) for where `app/` sits in the system.

This is a standalone npm package (its own `package.json` / `tsconfig.json`); the repo
stays multi-package, so run scripts with `npm --prefix app …` from the repo root or
`cd app && npm …`.

## Run

```bash
npm --prefix app install
npm --prefix app run web        # web build at http://localhost:8081
npm --prefix app run ios        # iOS simulator (needs Xcode) via Expo Go
npm --prefix app run android    # Android emulator via Expo Go
npm --prefix app start          # dev server, pick a target interactively / Expo Go on device
```

## Scripts

| Script | What it does |
|---|---|
| `web` | `expo start --web` — serve the web build. |
| `start` | `expo start` — dev server; press `i`/`a`/`w` or scan the QR with Expo Go. |
| `ios` / `android` | Launch the respective simulator/emulator. |
| `typecheck` | `tsc --noEmit` — type-check only, no emit. |

## Structure

- `App.tsx` — Expo entry; mounts the single root screen.
- `src/RootScreen.tsx` — the one top-level screen. Later work (Supabase client wiring,
  the ping round-trip) mounts a status panel here. Keep this the stable seam the app
  tree hangs off of.
