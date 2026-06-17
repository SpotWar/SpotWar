import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { persistedStore } from './storage';

/**
 * The app-wide Supabase client.
 *
 * Configuration is read from EXPO_PUBLIC_* env so the same bundle points at the
 * local stack in dev and a hosted project later — nothing is hardcoded. Expo
 * only inlines env vars prefixed `EXPO_PUBLIC_` into the client bundle, so those
 * are the names we read (see app/.env.example for the local defaults).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when both env vars are present. Surfaced so a missing/misnamed `.env` is
 * visible at a glance rather than failing only once the first query runs.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Warn rather than throw: the app should still boot so the misconfiguration is
  // observable. Copy app/.env.example to app/.env to fix.
  console.warn(
    'Supabase env not set — copy app/.env.example to app/.env ' +
      '(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).',
  );
}

/**
 * Storage adapter supabase-js uses to persist the session — the same
 * cross-platform store i18n uses (SecureStore on native, localStorage on web),
 * so a session written here survives an app restart (an acceptance criterion of
 * the auth story).
 */
const authStorage = {
  getItem: (key: string) => persistedStore.getItem(key),
  setItem: (key: string, value: string) => persistedStore.setItem(key, value),
  removeItem: (key: string) => persistedStore.removeItem(key),
};

// `detectSessionInUrl` is web-only: it parses the auth tokens supabase appends
// to the redirect URL after email-verify / password-reset links. On native the
// redirect arrives via a deep link, not the URL bar, so leave it off there.
const isWeb = Platform.OS === 'web';

export const supabase = createClient(
  // Fall back to non-empty placeholders, not '' — createClient throws
  // "supabaseUrl is required." on an empty string, which would crash at module
  // load. Callers guard real queries behind isSupabaseConfigured.
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'anon-key-missing',
  {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isWeb,
    },
  },
);
