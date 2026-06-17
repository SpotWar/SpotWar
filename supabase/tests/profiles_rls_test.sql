-- pgTAP tests for the profiles RLS policies and the handle_new_user trigger,
-- exercised through role switching. Run with: supabase test db
--
-- Strategy: seed two auth.users (which fires the trigger and creates their
-- profiles), then impersonate user A via the `authenticated` role with
-- request.jwt.claims set to A's id, and assert A sees/edits only its own row.

begin;
select plan(8);

create extension if not exists pgtap with schema extensions;

-- Two users. Inserting into auth.users fires on_auth_user_created, so the
-- matching profiles rows are created by the trigger, not by us.
insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-00000000000a',
  'alice@example.com',
  '{"nametag":"alice","preferred_language":"en"}'::jsonb
);
insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-00000000000b',
  'bob@example.com',
  '{"nametag":"bob"}'::jsonb  -- no language → trigger falls back to default 'fr'
);

-- ── Trigger created both profiles from raw_user_meta_data ──────────────────────
select is(
  (select nametag from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'alice',
  'trigger copied nametag from raw_user_meta_data'
);
select is(
  (select preferred_language from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'en',
  'trigger copied preferred_language from raw_user_meta_data'
);
select is(
  (select preferred_language from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'fr',
  'trigger falls back to fr when metadata omits preferred_language'
);
select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'alice@example.com',
  'trigger copied email from the new auth.users row'
);

-- ── Impersonate Alice (authenticated role + her JWT claims) ────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*)::int from public.profiles),
  1,
  'RLS: Alice sees exactly her own profile row'
);
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  0,
  'RLS: Alice cannot select Bob''s profile'
);

-- Updating own row succeeds and is visible.
update public.profiles set preferred_language = 'fr'
where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select preferred_language from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'fr',
  'RLS: Alice can update her own profile'
);

-- Updating Bob's row affects zero rows (RLS filters it out before the update).
with updated as (
  update public.profiles set preferred_language = 'en'
  where id = '00000000-0000-0000-0000-00000000000b'
  returning 1
)
select is(
  (select count(*)::int from updated),
  0,
  'RLS: Alice cannot update Bob''s profile (0 rows affected)'
);

reset role;
select * from finish();
rollback;
