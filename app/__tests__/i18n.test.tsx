import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import {
  I18nProvider,
  useI18n,
  translate,
  deviceDefaultLanguage,
  LANGUAGE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
  type Language,
} from '../lib/i18n';
import { AuthProvider } from '../lib/auth';
import { persistedStore } from '../lib/storage';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';
import { getLocales } from 'expo-localization';

// `expo-localization` is stubbed globally in jest.setup.js (French device by
// default). Here we drive `getLocales()` per-test to exercise other locales.
const mockGetLocales = getLocales as jest.MockedFunction<typeof getLocales>;

function setDeviceLocales(locales: Array<{ languageCode: string | null }>) {
  mockGetLocales.mockReturnValue(locales as ReturnType<typeof getLocales>);
}

beforeEach(() => {
  setDeviceLocales([{ languageCode: 'fr' }]);
});

describe('translate (pure)', () => {
  it('resolves a key in FR and EN', () => {
    expect(translate('fr', 'auth.login.submit')).toBe('Se connecter');
    expect(translate('en', 'auth.login.submit')).toBe('Log in');
  });

  it('defaults to French', () => {
    expect(DEFAULT_LANGUAGE).toBe('fr');
  });
});

describe('deviceDefaultLanguage', () => {
  it('returns EN for an English device', () => {
    setDeviceLocales([{ languageCode: 'en' }]);
    expect(deviceDefaultLanguage()).toBe('en');
  });

  it('returns FR for a French device', () => {
    setDeviceLocales([{ languageCode: 'fr' }]);
    expect(deviceDefaultLanguage()).toBe('fr');
  });

  it('reads the bare languageCode, not the locale tag', () => {
    // languageCode is already the bare lang; a 'fr-CA' tag still reports 'fr'.
    setDeviceLocales([{ languageCode: 'fr' }]);
    expect(deviceDefaultLanguage()).toBe('fr');
  });

  it('falls back to FR for an unsupported language', () => {
    setDeviceLocales([{ languageCode: 'de' }]);
    expect(deviceDefaultLanguage()).toBe('fr');
  });

  it('falls back to FR when no locale is resolvable', () => {
    setDeviceLocales([]);
    expect(deviceDefaultLanguage()).toBe('fr');
  });
});

function Probe() {
  const { t, language, setLanguage, loading } = useI18n();
  return (
    <>
      <Text testID="lang">{loading ? 'loading' : language}</Text>
      <Text testID="title">{t('auth.login.submit')}</Text>
      <Pressable testID="to-en" onPress={() => setLanguage('en')}>
        <Text>en</Text>
      </Pressable>
    </>
  );
}

// A signed-in session shaped just enough for `AuthProvider` (it reads
// `session.user.id`); the rest of the Session surface is never touched here.
const SESSION = { user: { id: 'user-1' } } as never;

/**
 * Render the probe inside an AuthProvider (subtask 02 made I18nProvider read
 * `useAuth()`, so it can't mount bare anymore). `opts` drives the fake client —
 * `initialSession` to be signed in, `profileRow` for the profile the provider
 * adopts. The returned `client` exposes `updateCalls` for write-back assertions.
 */
function renderProbe(opts: Parameters<typeof makeFakeAuthClient>[0] = {}) {
  const client = makeFakeAuthClient(opts);
  render(
    <AuthProvider client={client as never}>
      <I18nProvider>
        <Probe />
      </I18nProvider>
    </AuthProvider>,
  );
  return client;
}

describe('I18nProvider', () => {
  beforeEach(async () => {
    await persistedStore.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it('defaults to FR then switches and persists to EN', async () => {
    renderProbe();

    // Resolves to FR once the (absent) persisted value loads.
    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('fr'));
    expect(screen.getByTestId('title')).toHaveTextContent('Se connecter');

    fireEvent.press(screen.getByTestId('to-en'));

    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
    // The choice was written to the shared store.
    expect(await persistedStore.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('seeds the language from the device locale on first launch (EN device)', async () => {
    setDeviceLocales([{ languageCode: 'en' }]);
    renderProbe();
    // Nothing persisted, so the (absent) value resolves to the device default EN.
    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('en'));
    expect(screen.getByTestId('title')).toHaveTextContent('Log in');
  });

  it('lets a persisted choice win over the device locale', async () => {
    // Device says EN but the user previously chose FR — the stored choice wins.
    setDeviceLocales([{ languageCode: 'en' }]);
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('fr'));
    expect(screen.getByTestId('title')).toHaveTextContent('Se connecter');
  });

  it('restores a previously persisted language', async () => {
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, 'en');
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
  });
});

describe('I18nProvider · profile sync (subtask 02)', () => {
  beforeEach(async () => {
    await persistedStore.removeItem(LANGUAGE_STORAGE_KEY);
    // A French device, so any EN we observe came from the profile, not the locale.
    setDeviceLocales([{ languageCode: 'fr' }]);
  });

  it("adopts the signed-in profile's language over the device default", async () => {
    // FR device, nothing persisted, but the profile says EN → profile wins.
    renderProbe({
      initialSession: SESSION,
      profileRow: { id: 'user-1', preferred_language: 'en' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
  });

  it('adopts the profile language over a device-local persisted choice', async () => {
    // The user previously chose FR locally, but their account says EN — the
    // profile (cross-device) out-ranks the device-local copy when signed in.
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    renderProbe({
      initialSession: SESSION,
      profileRow: { id: 'user-1', preferred_language: 'en' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
  });

  it('writes the change back to the profile when signed in', async () => {
    const client = renderProbe({
      initialSession: SESSION,
      profileRow: { id: 'user-1', preferred_language: 'fr' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('lang')).toHaveTextContent('fr'),
    );

    fireEvent.press(screen.getByTestId('to-en'));

    // UI flips immediately…
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
    // …and the choice is mirrored onto the caller's profile row.
    await waitFor(() => expect(client.updateCalls).toHaveLength(1));
    expect(client.updateCalls[0]).toMatchObject({
      table: 'profiles',
      values: { preferred_language: 'en' as Language },
      eqColumn: 'id',
      eqValue: 'user-1',
    });
    // The device-local copy is still written too (works offline / after logout).
    expect(await persistedStore.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('does not clobber a language the user changed after login', async () => {
    // Adopt FR from the profile, then the user switches to EN in-session. The
    // profile object is now stale (we don't refetch) — re-rendering must not
    // snap the language back to the adopted FR. We assert the switch sticks.
    const client = renderProbe({
      initialSession: SESSION,
      profileRow: { id: 'user-1', preferred_language: 'fr' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('lang')).toHaveTextContent('fr'),
    );

    fireEvent.press(screen.getByTestId('to-en'));
    await waitFor(() =>
      expect(screen.getByTestId('lang')).toHaveTextContent('en'),
    );
    // Give the adoption effect any chance to re-run; the language stays EN.
    await waitFor(() => expect(client.updateCalls).toHaveLength(1));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });

  it('skips the profile write for a logged-out user', async () => {
    const client = renderProbe(); // no session
    await waitFor(() =>
      expect(screen.getByTestId('lang')).toHaveTextContent('fr'),
    );
    fireEvent.press(screen.getByTestId('to-en'));
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
    // No session → no profile write, but the device-local copy is still saved.
    expect(client.updateCalls).toHaveLength(0);
    expect(await persistedStore.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
