-- profiles: the public, app-readable face of an auth.users row (story 86ba9tpxg).
--
-- Signup calls supabase.auth.signUp({ email, password, options: { data: {
-- nametag, preferred_language } } }). The handle_new_user() trigger below copies
-- those metadata fields into one profiles row so the app never writes here on the
-- happy path — the trigger owns creation, the app only reads/updates.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- The unique constraint is the source of truth for "nametag taken": a duplicate
  -- surfaces as Postgres 23505, which the signup screen maps to its inline error.
  nametag text unique not null,
  email text,
  preferred_language text not null default 'fr'
    check (preferred_language in ('fr', 'en')),
  created_at timestamptz not null default now()
);

-- RLS denies by default; the policies below are owner-only. The signup INSERT is
-- done by the trigger (security definer, below), not by the client, so there is
-- deliberately no insert policy for authenticated users.
alter table public.profiles enable row level security;

-- Postgres has no "create policy if not exists", so drop-then-create keeps the
-- migration idempotent when re-applied against the shared local container.
drop policy if exists "profiles owner select" on public.profiles;
create policy "profiles owner select"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Runs on every auth.users insert. security definer + an empty search_path so it
-- executes as the owner (bypassing RLS to seed the row) while staying immune to
-- search_path hijacking; that's why every object below is schema-qualified.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nametag, email, preferred_language)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nametag',
    new.email,
    -- Fall back to the column default 'fr' when signup omits the language.
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
