/**
 * Cross-cutting acceptance test for the account-creation story, against a LIVE
 * local Supabase stack (`npx supabase start`). It exercises the same calls the
 * screens make — `signUp` with `{ nametag, preferred_language }` metadata, then
 * an admin-confirm standing in for the email link, then password `signIn` — and
 * asserts the end state: a verified session AND a `profiles` row seeded by
 * subtask 01's `handle_new_user()` trigger (the screen → DB contract).
 *
 * Gated behind a reachability probe: if the local Auth endpoint isn't up, every
 * test skips (not fails), so the unit suite stays green without Docker. Run
 * `npx supabase start` first to actually exercise it.
 *
 * Mirrors the fetch/probe plumbing of 02's `auth.integration.test.tsx` because
 * jest-expo stubs the global `fetch` (supabase-js would otherwise throw on an
 * empty body).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isDuplicateNametag, mapSignUpError } from '../lib/auth-errors';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

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

// jest-expo stubs global fetch; supply a node-http-backed fetch so supabase-js
// talks to the stack for real.
const nodeFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('node:http');
  const url = new URL(typeof input === 'string' ? input : String(input));
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
          const nullBody = status === 204 || status === 304 || status === 205;
          resolve(new Response(nullBody ? null : text, { status }));
        });
      },
    );
    req.on('error', reject);
    if (init?.body) req.write(init.body as string);
    req.end();
  });
}) as typeof fetch;

function makeClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: nodeFetch },
  });
}

function makeAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: nodeFetch },
  });
}

let reachable = false;
beforeAll(async () => {
  reachable = await stackReachable();
  if (!reachable) {
    console.warn(
      'Local Supabase stack unreachable — skipping signup E2E. ' +
        'Run `npx supabase start` to enable it.',
    );
  }
});

const skip = () => !reachable;

describe('account creation E2E (live local Supabase)', () => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const nametag = `e2e_${stamp}`;
  const password = 'Sw-e2e-123!';

  it('signUp seeds a profiles row (nametag + preferred_language) and stays unverified', async () => {
    if (skip()) return;
    const client = makeClient();

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nametag, preferred_language: 'en' } },
    });
    expect(error).toBeNull();
    const userId = data.user?.id;
    expect(userId).toBeTruthy();

    // Under enable_confirmations (subtask 01), signUp yields no usable session.
    if (!data.session) {
      expect(Boolean(data.user?.email_confirmed_at)).toBe(false);
    }

    // The handle_new_user() trigger created the matching profile from metadata.
    const admin = makeAdmin();
    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('id, nametag, preferred_language')
      .eq('id', userId!)
      .maybeSingle();
    expect(pErr).toBeNull();
    expect(profile).toMatchObject({ nametag, preferred_language: 'en' });
  }, 30000);

  it('a second signUp with the SAME nametag fails, and the screen maps it to "nametag taken"', async () => {
    if (skip()) return;
    const client = makeClient();
    const { error } = await client.auth.signUp({
      email: `e2e-dup-${stamp}@example.com`,
      password,
      options: { data: { nametag, preferred_language: 'fr' } },
    });
    // The unique index on profiles.nametag rejects the duplicate. NOTE: the auth
    // API does NOT surface the raw 23505 — it wraps it as "Database error saving
    // new user" (status 500). `isDuplicateNametag` matches that real shape, which
    // is what the screen relies on to attribute the error to the nametag field.
    expect(error).not.toBeNull();
    expect(isDuplicateNametag(error)).toBe(true);
    expect(mapSignUpError(error).field).toBe('nametag');
  }, 30000);

  it('after admin-confirm + sign-in, the user is verified and authed (happy path)', async () => {
    if (skip()) return;
    const admin = makeAdmin();

    // Find the user we created and confirm them (stands in for the email link).
    const { data: list } = await admin.auth.admin.listUsers();
    const user = list.users.find((u) => u.email === email);
    expect(user).toBeTruthy();
    await admin.auth.admin.updateUserById(user!.id, { email_confirm: true });

    const client = makeClient();
    const { data: signIn, error: signInErr } =
      await client.auth.signInWithPassword({ email, password });
    expect(signInErr).toBeNull();
    expect(signIn.session).not.toBeNull();
    expect(signIn.user?.email_confirmed_at).toBeTruthy();
  }, 30000);
});
