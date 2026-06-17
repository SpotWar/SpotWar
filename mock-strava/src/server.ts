import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { ATHLETE } from "./data/athlete.js";
import {
  getBuiltActivity,
  listBuiltActivities,
  toDetailedActivity,
  toSummaryActivity,
} from "./data/activities.js";
import { buildStreamSet } from "./data/streams.js";
import {
  buildWebhookEvent,
  dispatchWebhook,
  type SimulateOptions,
} from "./lib/webhook.js";

const PORT = Number(process.env.PORT ?? 3000);
const WEBHOOK_TARGET_URL =
  process.env.WEBHOOK_TARGET_URL ??
  "http://localhost:54321/functions/v1/strava-webhook";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const app = new Hono();
app.use("*", logger());

app.get("/", (c) =>
  c.json({
    name: "SPOTWAR mock Strava API",
    base_url: `http://localhost:${PORT}`,
    note: "Set STRAVA_MOCK=true so Edge Functions point STRAVA_BASE_URL here.",
    routes: [
      "POST /oauth/token",
      "GET  /api/v3/athlete",
      "GET  /api/v3/athlete/activities",
      "GET  /api/v3/activities/:id",
      "GET  /api/v3/activities/:id/streams",
      "POST /push_subscriptions",
      "POST /simulate-webhook",
    ],
  }),
);

// --- OAuth: fake token exchange (auth-code grant AND refresh_token grant) ----
app.post("/oauth/token", async (c) => {
  // Strava accepts form-encoded or JSON; we don't validate client_id/secret.
  let grantType = "authorization_code";
  try {
    const body = c.req.header("content-type")?.includes("application/json")
      ? await c.req.json()
      : await c.req.parseBody();
    if (body && typeof body.grant_type === "string") grantType = body.grant_type;
  } catch {
    /* empty/curl-without-body — fall back to default grant */
  }

  const nowSec = Math.floor(Date.now() / 1000);
  return c.json({
    token_type: "Bearer",
    expires_at: nowSec + 21_600,
    expires_in: 21_600,
    refresh_token: "mock_refresh_token_spotwar",
    access_token: "mock_access_token_spotwar",
    // Strava omits the athlete on refresh-token grants; mirror that.
    athlete: grantType === "refresh_token" ? undefined : ATHLETE,
  });
});

// --- Athlete profile --------------------------------------------------------
app.get("/api/v3/athlete", (c) => c.json(ATHLETE));

// --- Activity list ----------------------------------------------------------
app.get("/api/v3/athlete/activities", (c) => {
  const perPage = Number(c.req.query("per_page") ?? 30);
  const page = Number(c.req.query("page") ?? 1);
  const all = listBuiltActivities().map(toSummaryActivity);
  const start = (Math.max(1, page) - 1) * perPage;
  return c.json(all.slice(start, start + perPage));
});

// --- Single activity --------------------------------------------------------
app.get("/api/v3/activities/:id", (c) => {
  const built = getBuiltActivity(Number(c.req.param("id")));
  if (!built) return c.json({ message: "Record Not Found", errors: [] }, 404);
  return c.json(toDetailedActivity(built));
});

// --- Activity streams (for per-km pace validation) --------------------------
app.get("/api/v3/activities/:id/streams", (c) => {
  const built = getBuiltActivity(Number(c.req.param("id")));
  if (!built) return c.json({ message: "Record Not Found", errors: [] }, 404);
  return c.json(buildStreamSet(built));
});

// --- Webhook subscription registration (always succeeds) --------------------
app.post("/push_subscriptions", (c) => c.json({ id: 120_475 }, 200));

// --- Dev-only: trigger a fake Strava webhook toward the local Edge Function --
app.post("/simulate-webhook", async (c) => {
  let opts: SimulateOptions = {};
  try {
    opts = (await c.req.json()) as SimulateOptions;
  } catch {
    /* no body — use defaults (first seeded activity) */
  }
  const event = buildWebhookEvent(opts);
  const result = await dispatchWebhook(event, WEBHOOK_TARGET_URL, SUPABASE_ANON_KEY);
  return c.json({ event, dispatch: result }, result.delivered ? 200 : 502);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  const acts = listBuiltActivities();
  console.log(`\n🟢 SPOTWAR mock Strava API → http://localhost:${info.port}`);
  console.log(`   webhook target: ${WEBHOOK_TARGET_URL}`);
  console.log(`   seeded activities:`);
  for (const a of acts) {
    const km = (a.distance / 1000).toFixed(2);
    const min = Math.floor(a.movingTime / 60);
    console.log(
      `     • ${a.raw.id} "${a.raw.name}" — ${km}km / ${min}min — ${a.raw.neighborhood}`,
    );
  }
  console.log();
});
