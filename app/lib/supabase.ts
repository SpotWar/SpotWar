import { createClient } from '@supabase/supabase-js';

/**
 * The app-wide Supabase client for the EPIC 8 "hello world" slice.
 *
 * Configuration is read from EXPO_PUBLIC_* env so the same bundle points at the
 * local stack in dev and a hosted project later — nothing is hardcoded. Expo
 * only inlines env vars prefixed `EXPO_PUBLIC_` into the client bundle, so those
 * are the names we read (see app/.env.example for the local defaults).
 *
 * No queries live here — this is just the configured client. 86badf56w consumes
 * the exported `supabase` to read/write the ping row.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when both env vars are present. The root screen surfaces this so a
 * missing/misnamed `.env` is visible at a glance rather than failing only once
 * the first query runs.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Warn rather than throw: the app should still boot so the indicator can show
  // the misconfiguration. Copy app/.env.example to app/.env to fix.
  console.warn(
    'Supabase env not set — copy app/.env.example to app/.env ' +
      '(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).',
  );
}

// Fall back to non-empty placeholders, not '' — createClient throws
// "supabaseUrl is required." on an empty string, which would crash at module
// load and white-screen the app before RootScreen can render the "not
// configured" indicator. RootScreen guards every query behind
// isSupabaseConfigured, so this placeholder client is constructed but never
// actually queried.
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'anon-key-missing',
);
