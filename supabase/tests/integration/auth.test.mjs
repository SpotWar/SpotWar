// Integration tests for the SpotWar auth + profiles schema, run against the live
// local Supabase stack (supabase-js + service-role key). Exercises the full signup
// contract end to end: the handle_new_user trigger, verify-before-login, admin
// confirmation, sign-in, and password-reset mail landing in Inbucket/Mailpit.
//
//   cd supabase/tests/integration && npm install && npm test
//
// The keys below are the well-known, non-secret Supabase *local dev* demo keys
// (committed in every Supabase project). Override with env vars to point elsewhere.
// If the stack is unreachable the whole suite SKIPS rather than fails, so CI-less
// machines without Docker don't go red — but it MUST be run once with the stack up.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const INBUCKET_URL = process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Public client = what the app uses; no session persistence in a test process.
const anon = createClient(API_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// A password that satisfies the configured policy: min 8, upper+lower+digit+symbol.
const PASSWORD = 'Spotwar1!';
const unique = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const EMAIL = `signup-${unique}@example.com`;
const NAMETAG = `runner_${unique}`;

let stackUp = false;
let createdUserId = null;

before(async () => {
  try {
    const res = await fetch(`${API_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
    });
    stackUp = res.ok;
  } catch {
    stackUp = false;
  }
  if (!stackUp) {
    console.warn(
      `\n[skip] Local Supabase unreachable at ${API_URL} — skipping integration suite. ` +
        `Start it with \`supabase start\` and re-run.\n`,
    );
  }
});

after(async () => {
  // Keep the shared DB clean: remove the user we created (cascades to profiles).
  if (createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId).catch(() => {});
  }
});

test('signUp with nametag + preferred_language metadata creates a profile via the trigger', async (t) => {
  if (!stackUp) return t.skip('stack down');

  const { data, error } = await anon.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
    options: { data: { nametag: NAMETAG, preferred_language: 'en' } },
  });
  assert.equal(error, null, `signUp should succeed: ${error?.message}`);
  assert.ok(data.user, 'signUp returns a user');
  createdUserId = data.user.id;

  // The trigger runs in the same transaction as the auth.users insert, so the
  // profile is queryable immediately via the service role (which bypasses RLS).
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, nametag, email, preferred_language')
    .eq('id', createdUserId)
    .single();
  assert.equal(pErr, null, `profile lookup should succeed: ${pErr?.message}`);
  assert.equal(profile.nametag, NAMETAG, 'trigger copied nametag');
  assert.equal(profile.preferred_language, 'en', 'trigger copied preferred_language');
  assert.equal(profile.email, EMAIL, 'trigger copied email');
});

test('no usable session exists before email confirmation', async (t) => {
  if (!stackUp) return t.skip('stack down');

  // With enable_confirmations = true, sign-in is refused until the user confirms.
  const fresh = createClient(API_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await fresh.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  assert.ok(error, 'sign-in before confirmation must error');
  assert.equal(data.session, null, 'no session granted before confirmation');
  assert.match(
    error.message,
    /confirm|not confirmed/i,
    `error should be about email confirmation, got: ${error.message}`,
  );
});

test('admin-confirming the user then signing in yields a session', async (t) => {
  if (!stackUp) return t.skip('stack down');

  const { error: confirmErr } = await admin.auth.admin.updateUserById(createdUserId, {
    email_confirm: true,
  });
  assert.equal(confirmErr, null, `admin confirm should succeed: ${confirmErr?.message}`);

  const fresh = createClient(API_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await fresh.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  assert.equal(error, null, `sign-in after confirmation should succeed: ${error?.message}`);
  assert.ok(data.session?.access_token, 'a usable session is returned after confirmation');
});

test('the confirmed user can read its own profile under RLS', async (t) => {
  if (!stackUp) return t.skip('stack down');

  const fresh = createClient(API_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn } = await fresh.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  assert.ok(signIn.session, 'precondition: signed in');

  const { data: rows, error } = await fresh.from('profiles').select('id, nametag');
  assert.equal(error, null, `own-row select should succeed: ${error?.message}`);
  assert.equal(rows.length, 1, 'RLS returns exactly the caller’s own profile');
  assert.equal(rows[0].id, createdUserId, 'and it is the right row');
});

test('resetPasswordForEmail lands a recovery message in Inbucket', async (t) => {
  if (!stackUp) return t.skip('stack down');

  const mailbox = EMAIL.split('@')[0];
  const before = await mailpitCount(mailbox);

  const { error } = await anon.auth.resetPasswordForEmail(EMAIL, {
    redirectTo: 'http://127.0.0.1:3000/reset-password',
  });
  assert.equal(error, null, `resetPasswordForEmail should succeed: ${error?.message}`);

  // Inbucket/Mailpit delivery is async; poll briefly for the new message.
  let after = before;
  for (let i = 0; i < 20 && after <= before; i++) {
    await new Promise((r) => setTimeout(r, 250));
    after = await mailpitCount(mailbox);
  }
  assert.ok(after > before, `a reset email should arrive in the ${mailbox} mailbox`);
});

// The current local stack ships Mailpit (config.toml [inbucket]); INBUCKET_URL
// points at its web/API port. Count messages addressed to this signup's mailbox
// via Mailpit's search API — `messages_count` is the number matching the query.
async function mailpitCount(mailbox) {
  const query = encodeURIComponent(`to:${mailbox}@example.com`);
  const res = await fetch(`${INBUCKET_URL}/api/v1/search?query=${query}`);
  if (!res.ok) return 0;
  const body = await res.json();
  return body.messages_count ?? 0;
}
