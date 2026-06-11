# SpotWar — Architecture & component map

SpotWar is a geo-territory running game: athletes log runs on Strava, the runs
are validated and projected onto a PostGIS map of city neighborhoods, and players
attack/defend territory over a monthly cycle. This file is the map the planning
skills (`clickup-epic-planner`, `clickup-story-planner`) read first to decide which
component a piece of work touches. Keep it current as components land.

## Repo shape

This is a **single git repo** (`github.com/SpotWar/SpotWar`) with one directory per
component. There is no meta-repo / `repos/` layout — when a skill says "repo" it
means a component subdirectory here.

| Component dir | Status | Stack | Role |
|---|---|---|---|
| `mock-strava/` | **exists** | Hono + TypeScript on Node (tsx) | Local mock of the Strava API so the dev→test loop runs at $0 before touching the paid prod API. Seeds 4 Montréal runs that exercise the validation + territory edge cases. |
| `supabase/` | planned | Deno/TS Edge Functions, Postgres + PostGIS, Realtime | Backend: Strava OAuth + webhook ingestion, run/pace validation, territory attribution (`ST_Contains`/`ST_Intersects`), attack/defense, monthly cycle, Realtime broadcast. |
| `app/` | planned | Expo (React Native + react-native-web), FR/EN i18n | The client, **all three targets from one codebase**: iOS, Android, **and web**. Map, territory view, leaderboards, notifications, account creation. On web it also serves the public **landing page** (concept explainer + sign-up CTA) as the unauthenticated entry point; sign-up feeds the same account-creation flow as mobile. |

When a component doesn't exist yet, a story that needs it starts with a **discovery
spike** (see the epic planner's hard rules), not speculative implementation.

**Web is an MVP target, not a separate component.** The browser experience is the
same `app/` built for web (Expo Web), plus a landing page that lives inside `app/` as
the public unauthenticated route. A standalone static `web/` is only worth splitting
out post-MVP if the landing needs dedicated SEO / first-paint tuning — until then,
treat web work as `[app]`.

## Subtask component prefix convention

Every subtask title is prefixed with the component it touches, in brackets:

- `[mock-strava]` → `mock-strava/`
- `[edge-functions]` or `[supabase]` → `supabase/` (Edge Functions + migrations)
- `[db]` → `supabase/migrations/` (Postgres/PostGIS schema only)
- `[app]` → `app/` (Expo client)
- `[shared]` → cross-component types/contracts

One component per subtask. A change spanning two components becomes two subtasks
with a dependency note (producer before consumer; schema before code that reads it).

## ClickUp backlog (the "epic" backend)

The backlog lives in ClickUp, not Jira. Hierarchy mapping:

| Concept | ClickUp object |
|---|---|
| Epic | **List** (under the `🗺️ SPOTWAR MVP Backlog` folder) |
| Story | **Task** in an epic list |
| Subtask | **Subtask** of a story task (`parent: <story-id>`) |

IDs (so skills can resolve names→IDs without re-walking the hierarchy — re-verify
with `clickup_get_workspace_hierarchy` if these go stale):

- Workspace: `90141314583` (auto-detected by the ClickUp MCP; only pass to override)
- Space: `Team Space` `90145928977`
- Folder: `🗺️ SPOTWAR MVP Backlog` `90149860414`

| Epic (List) | List ID | Primary component(s) |
|---|---|---|
| EPIC 1 — User & Team Management | `901417020182` | supabase (auth, teams), app |
| EPIC 2 — Strava Integration & Run Validation | `901417020186` | mock-strava, supabase (OAuth, webhook, pace validation) |
| EPIC 3 — Territory & Map Engine | `901417020190` | supabase (PostGIS), app (map) |
| EPIC 4 — Attack and Defense Mechanics | `901417020195` | supabase, app |
| EPIC 5 — Monthly Cycle and City Conquest | `901417020198` | supabase (scheduled jobs) |
| EPIC 6 — Notifications and Engagement | `901417020200` | supabase (Realtime/push), app |
| EPIC 7 — Internationalisation FR/EN | `901417020204` | app (i18n) |
| EPIC 8 — Platform and Infrastructure | `901417020205` | supabase, infra, CI |

## Cross-cutting facts the planners should assume

- **Strava is a paid third-party API.** Any work consuming new Strava endpoints
  starts against `mock-strava/` and a discovery spike — never code against the real
  API from vendor docs alone. Lift fixtures from `mock-strava/src/data/`.
- **Valid SPOTWAR pace window: 2:30/km – 12:00/km**, analysed per whole-km segment
  (see `mock-strava/src/data/activities.ts`). Territory logic is PostGIS
  `ST_Contains` / `ST_Intersects` against neighborhood polygons.
- **The env switch is a single var**: Edge Functions pick the Strava base URL from
  `STRAVA_MOCK` — no code change between mock and prod.
- **i18n is FR/EN** — user-facing strings are never hardcoded once EPIC 7 lands.
