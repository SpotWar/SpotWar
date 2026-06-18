/**
 * Integration test against a LIVE local Supabase stack (`npx supabase start`).
 *
 * It is gated behind a reachability probe: if the local Auth endpoint isn't up,
 * every test is skipped (not failed) so the unit suite stays green on a machine
 * without Docker. To actually exercise it, start the stack first, then run
 * `npm test`.
 *
 * What it proves end to end, written to be correct under both auth configs
 * (enable_confirmations on OR off — subtask 01 turns it on):
 *  - signUp succeeds and, when confirmation is required, does NOT yield a usable
 *    session and leaves the user unverified (the gate's verify-before-login
 *    contract: email_confirmed_at unset → route to verify screen);
 *  - after an admin confirm + password sign-in, a real verified session is
 *    issued and persists then restores from the store (the "session survives
 *    restart" acceptance criterion);
 *  - signOut clears the session.
 */
import { createClient } from '@supabase/supabase-js';

import { persistedStore } from '../lib/storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  // Standard local-dev demo anon key (same as app/.env.example).
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
// Service-role key, used only to admin-confirm the test user so the suite is
// correct under enable_confirmations=true (subtask 01's config): without
// confirmation, signUp does not yield a usable session. This is the standard
// local-dev demo service-role key (safe for the local stack only).
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// jest-expo mocks the global `fetch`, so the reachability probe goes through
// node's http module directly. supabase-js itself ships its own fetch
// (@supabase/node-fetch), so the auth calls below still hit the network.
function stackReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const http = require('node:http');
      const url = new URL(`${SUPABASE_URL}/auth/v1/health`);
      const req = http.get(
        { hostname: url.hostname, port: url.port, path: url.pathname },
        (res: { statusCode?: number; resume: () => void }) => {
          res.resume();
          resolve((res.statusCode ?? 500) < 400);
        },
      );
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

let reachable = false;
beforeAll(async () => {
  reachable = await stackReachable();
  if (!reachable) {
    console.warn(
      'Local Supabase stack unreachable — skipping auth integration tests. ' +
        'Run `npx supabase start` to enable them.',
    );
  }
});

const STORAGE_KEY = 'spotwar.integration.session';

/**
 * jest-expo replaces the global `fetch` with a stub that returns an empty body,
 * which makes supabase-js throw `"undefined" is not valid JSON`. Supply a real
 * fetch built on node's http module so the client actually talks to the stack.
 */
const nodeFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('node:http');
  const url = new URL(typeof input === 'string' ? input : String(input));
  // supabase-js passes Headers; normalize to a plain object node understands.
  const headers: Record<string, string> = {};
  const h = init?.headers;
  if (h instanceof Headers) h.forEach((v, k) => (headers[k] = v));
  else if (Array.isArray(h)) h.forEach(([k, v]) => (headers[k] = v));
  else if (h) Object.assign(headers, h);

  return new Promise<Response>((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: init?.method ?? 'GET',
        headers,
      },
      (res: NodeJS.ReadableStream & { statusCode?: number }) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const status = res.statusCode ?? 200;
          const text = Buffer.concat(chunks).toString('utf8');
          // 204/304 are null-body statuses — the Response constructor rejects a
          // body for them, so pass null in that case.
          const nullBody = status === 204 || status === 304 || status === 205;
          resolve(new Response(nullBody ? null : text, { status }));
        });
      },
    );
    req.on('error', reject);
    if (init?.body) req.write(init.body);
    req.end();
  });
}) as typeof fetch;

function makeClient() {
  const storage = {
    getItem: (k: string) => persistedStore.getItem(k),
    setItem: (k: string, v: string) => persistedStore.setItem(k, v),
    removeItem: (k: string) => persistedStore.removeItem(k),
  };
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      storage,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: nodeFetch },
  });
}

/**
 * A service-role client used only to admin-confirm the test user. It must not
 * persist a session (it isn't a real login) — in-memory only.
 */
function makeAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: nodeFetch },
  });
}

// `reachable` is only known after beforeAll runs, which is *after* the describe
// body is built — so we can't pick it/it.skip up front. Instead every test
// bails out early when the stack is down, leaving a passing (no-op) test rather
// than a failure on a machine without the local stack.
const skipIfDown = () => {
  if (!reachable) {
    // eslint-disable-next-line jest/no-conditional-expect
    return true;
  }
  return false;
};

describe('auth integration (live local Supabase)', () => {
  const email = `it-${Date.now()}@example.com`;
  const password = 'Sw-test-123!';
  let userId: string | null = null;

  it('signUp leaves the user pending verification when confirmation is required', async () => {
    if (skipIfDown()) return;
    const client = makeClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nametag: `it_${Date.now()}`, preferred_language: 'fr' } },
    });
    expect(error).toBeNull();
    userId = data.user?.id ?? null;
    expect(userId).toBeTruthy();

    // Config-agnostic: with enable_confirmations=true (subtask 01), signUp
    // returns no usable session and the user is unverified; with it off, a
    // verified session is issued immediately. Assert whichever holds, but never
    // assert the email is confirmed when no session came back.
    const verified = Boolean(data.user?.email_confirmed_at);
    if (data.session) {
      expect(verified).toBe(true);
    } else {
      expect(verified).toBe(false);
    }
    await client.auth.signOut();
  }, 30000);

  it('after admin-confirm + sign-in, a verified session persists and restores', async () => {
    if (skipIfDown()) return;
    if (!userId) throw new Error('previous test did not capture a user id');

    // Confirm the user via the service role, mirroring what clicking the
    // verification email does — so password sign-in yields a usable session
    // regardless of the enable_confirmations setting.
    const admin = makeAdminClient();
    const { error: confirmError } = await admin.auth.admin.updateUserById(
      userId,
      { email_confirm: true },
    );
    expect(confirmError).toBeNull();

    const client = makeClient();
    const { data: signIn, error: signInError } =
      await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    expect(signIn.session).not.toBeNull();
    expect(signIn.user?.email_confirmed_at).toBeTruthy();

    // Simulate a restart: a brand-new client reading the same persisted store
    // must restore the session for the same, now-verified, user.
    const restored = makeClient();
    await new Promise((r) => setTimeout(r, 100));
    const { data: restoredData } = await restored.auth.getSession();
    expect(restoredData.session).not.toBeNull();
    expect(restoredData.session?.user.email).toBe(email);

    await client.auth.signOut();
    const { data: cleared } = await makeClient().auth.getSession();
    expect(cleared.session).toBeNull();
  }, 30000);
});
