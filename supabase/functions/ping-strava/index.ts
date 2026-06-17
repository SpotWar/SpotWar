// ping-strava — smoke-test Edge Function for the EPIC 8 "hello world" slice.
//
// Calls Strava's `GET /api/v3/athlete` and returns the athlete profile, proving
// an Edge Function can reach the (mock) Strava server. The base URL is chosen
// from the STRAVA_MOCK env var so the same code runs against the local mock in
// dev and the real Strava API in prod — mirrors the switch documented in
// mock-strava/README.md.
//
// Deno runtime (supabase functions serve / deploy).

// STRAVA_MOCK=true → local mock (mock-strava on :3000); anything else → prod.
// STRAVA_BASE_URL, when set, wins over the switch — needed because the Edge
// Function runs inside Docker, where the host's mock is `host.docker.internal`
// rather than `localhost`. Plain `npx supabase functions serve` (host runtime)
// can use the localhost default.
const STRAVA_BASE_URL = Deno.env.get("STRAVA_BASE_URL") ??
  (Deno.env.get("STRAVA_MOCK") === "true"
    ? "http://localhost:3000" // mock (mock-strava server)
    : "https://www.strava.com"); // prod

Deno.serve(async () => {
  try {
    const res = await fetch(`${STRAVA_BASE_URL}/api/v3/athlete`);

    if (!res.ok) {
      return Response.json(
        { error: `Strava responded ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const athlete = await res.json();
    return Response.json({ athlete }, { status: 200 });
  } catch (err) {
    // Network/connection failure reaching Strava (e.g. mock not running).
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
});
