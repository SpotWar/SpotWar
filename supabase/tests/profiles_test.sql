-- pgTAP unit tests for the profiles schema (migration 20260617222553_profiles.sql).
-- Run with: supabase test db
--
-- Each `supabase test db` invocation wraps the file in a rolled-back transaction,
-- so the rows we insert here never persist into the shared local database.

begin;
select plan(17);

create extension if not exists pgtap with schema extensions;

-- ── Structure ─────────────────────────────────────────────────────────────────
select has_table('public', 'profiles', 'profiles table exists');

select has_column('public', 'profiles', 'id', 'has id');
select col_is_pk('public', 'profiles', 'id', 'id is the primary key');
select col_type_is('public', 'profiles', 'id', 'uuid', 'id is uuid');

select has_column('public', 'profiles', 'nametag', 'has nametag');
select col_not_null('public', 'profiles', 'nametag', 'nametag is NOT NULL');

select has_column('public', 'profiles', 'email', 'has email');
select has_column('public', 'profiles', 'preferred_language', 'has preferred_language');
select col_not_null('public', 'profiles', 'preferred_language', 'preferred_language is NOT NULL');
select col_default_is(
  'public', 'profiles', 'preferred_language', 'fr',
  'preferred_language defaults to fr'
);
select has_column('public', 'profiles', 'created_at', 'has created_at');

-- ── RLS is enabled ────────────────────────────────────────────────────────────
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'row level security is enabled on profiles'
);

-- ── Trigger wiring ────────────────────────────────────────────────────────────
select has_function('public', 'handle_new_user', 'handle_new_user() exists');
select trigger_is(
  'auth', 'users', 'on_auth_user_created',
  'public', 'handle_new_user',
  'on_auth_user_created fires public.handle_new_user'
);

-- ── preferred_language CHECK rejects values outside ('fr','en') ────────────────
-- Insert directly (bypassing the auth flow) to isolate the CHECK constraint.
select throws_ok(
  $$insert into public.profiles (id, nametag, preferred_language)
    values (gen_random_uuid(), 'badlang', 'es')$$,
  '23514',
  null,
  'preferred_language CHECK rejects a value outside (fr,en)'
);

-- ── Duplicate nametag raises 23505 ────────────────────────────────────────────
-- profiles.id is FK → auth.users, so seed two users first. Their inserts also fire
-- the trigger, which creates one profile per user; the second user's metadata
-- reuses 'dupe' as its nametag, so it is the *trigger's* insert that must collide.
insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000001',
  'dupe1@example.com',
  '{"nametag":"dupe","preferred_language":"fr"}'::jsonb
);
select is(
  (select nametag from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'dupe',
  'first user with nametag "dupe" gets a profile via the trigger'
);
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000002', 'dupe2@example.com',
            '{"nametag":"dupe","preferred_language":"en"}'::jsonb)$$,
  '23505',
  null,
  'a second user reusing the nametag raises unique_violation (23505) from the trigger'
);

select * from finish();
rollback;
