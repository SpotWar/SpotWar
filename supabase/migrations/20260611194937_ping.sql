-- ping: the smoke-test table for the EPIC 8 "hello world" slice (86badf56w).
--
-- The app inserts one row then selects the latest back to prove the
-- Expo ↔ Supabase read/write round-trip. No feature data lives here.

create table if not exists public.ping (
  id uuid primary key default gen_random_uuid(),
  note text,
  created_at timestamptz not null default now()
);

-- RLS denies by default. Without permissive policies the anon round-trip
-- silently returns empty rows, so enable RLS and grant anon insert + select.
-- These are deliberately open for LOCAL DEV ONLY — tighten before any real
-- deployment.
alter table public.ping enable row level security;

create policy "ping anon insert (local dev)"
  on public.ping
  for insert
  to anon
  with check (true);

create policy "ping anon select (local dev)"
  on public.ping
  for select
  to anon
  using (true);
