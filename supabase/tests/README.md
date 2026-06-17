# Supabase tests

## pgTAP (unit / schema)

`*_test.sql` files here are pgTAP tests run by the Supabase CLI inside a
rolled-back transaction (nothing persists to the shared local DB):

```sh
supabase test db
```

- `profiles_test.sql` — table structure, the `preferred_language` CHECK, the
  duplicate-`nametag` `23505`, RLS enabled, and trigger wiring.
- `profiles_rls_test.sql` — the `handle_new_user` trigger populating `profiles`
  from `raw_user_meta_data`, and owner-only RLS (a user sees/edits only its row).

## Integration (live stack)

`integration/` drives the running local stack with `@supabase/supabase-js` and the
service-role key — the real signup → verify → confirm → sign-in → reset path:

```sh
supabase start            # stack must be up; needs enable_confirmations from config.toml
cd supabase/tests/integration
npm install
npm test
```

It SKIPS gracefully if the stack is unreachable. The keys it falls back to are the
well-known Supabase local-dev demo keys (not secrets); override with `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INBUCKET_URL` if needed.

> The "no usable session before confirmation" assertion requires the auth service
> to be running with `enable_confirmations = true` (config.toml). After editing
> `config.toml`, restart the stack (`supabase stop && supabase start`) so the
> running container picks up the change.
