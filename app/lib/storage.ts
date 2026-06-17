import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * One persisted key/value store shared by the Supabase session store and i18n,
 * so the chosen language and the auth session live in the same place and the
 * same platform fallback rules apply to both.
 *
 * `expo-secure-store` is native-only (it has no web implementation and importing
 * its native module on web throws), so on web we fall back to `localStorage`.
 * The fallback also covers SSR / non-browser web bundles where `localStorage`
 * is undefined — there we no-op, which is fine because the only web target that
 * needs persistence is the browser, and an unconfigured value just re-resolves
 * to its default.
 */
export type PersistedStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const webStore: PersistedStore = {
  async getItem(key) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

const secureStore: PersistedStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  // SecureStore rejects keys with characters outside [A-Za-z0-9._-]; the keys we
  // pass (supabase session key, language key) all satisfy that, so no sanitizing.
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * The active store for this platform. Selected once at module load — `Platform.OS`
 * is constant for the lifetime of the bundle, so there is nothing to recompute.
 */
export const persistedStore: PersistedStore =
  Platform.OS === 'web' ? webStore : secureStore;
