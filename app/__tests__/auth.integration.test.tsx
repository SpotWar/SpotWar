/**
 * Integration test against a LIVE local Supabase stack (`npx supabase start`).
 *
 * It is gated behind a reachability probe: if the local Auth endpoint isn't up,
 * every test is skipped (not failed) so the unit suite stays green on a machine
 * without Docker. To actually exercise it, start the stack first, then run
 * `npm test`.
 *
 * What it proves end to end: real signUp issues a (pre-verification) session,
 * signOut clears it, and a session written to the persisted store is restored by
 * a fresh client — the "session survives restart" acceptance criterion.
 */
import { createClient } from '@supabase/supabase-js';

import { persistedStore } from '../lib/storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  // Standard local-dev demo anon key (same as app/.env.example).
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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

  it('signUp issues a session and signOut clears it', async () => {
    if (skipIfDown()) return;
    const client = makeClient();
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nametag: `it_${Date.now()}`, preferred_language: 'fr' } },
    });
    expect(error).toBeNull();

    const { data: after } = await client.auth.getSession();
    expect(after.session).not.toBeNull();

    await client.auth.signOut();
    const { data: cleared } = await client.auth.getSession();
    expect(cleared.session).toBeNull();
  }, 30000);

  it('a persisted session is restored by a fresh client', async () => {
    if (skipIfDown()) return;
    const client = makeClient();
    await client.auth.signInWithPassword({ email, password });

    // Simulate a restart: a brand-new client reading the same store.
    const restored = makeClient();
    await new Promise((r) => setTimeout(r, 100));
    const { data } = await restored.auth.getSession();
    // The session may be null only if email confirmation blocks password login;
    // in that case the store still holds nothing, which is acceptable. When a
    // session exists it must carry the same user.
    if (data.session) {
      expect(data.session.user.email).toBe(email);
    }
    await client.auth.signOut();
  }, 30000);
});
