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
} from '../lib/i18n';
import { persistedStore } from '../lib/storage';
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

describe('I18nProvider', () => {
  beforeEach(async () => {
    await persistedStore.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it('defaults to FR then switches and persists to EN', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

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
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    // Nothing persisted, so the (absent) value resolves to the device default EN.
    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('en'));
    expect(screen.getByTestId('title')).toHaveTextContent('Log in');
  });

  it('lets a persisted choice win over the device locale', async () => {
    // Device says EN but the user previously chose FR — the stored choice wins.
    setDeviceLocales([{ languageCode: 'en' }]);
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('fr'));
    expect(screen.getByTestId('title')).toHaveTextContent('Se connecter');
  });

  it('restores a previously persisted language', async () => {
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, 'en');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Log in'),
    );
  });
});
