import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import {
  I18nProvider,
  useI18n,
  translate,
  LANGUAGE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
} from '../lib/i18n';
import { persistedStore } from '../lib/storage';

describe('translate (pure)', () => {
  it('resolves a key in FR and EN', () => {
    expect(translate('fr', 'auth.login.submit')).toBe('Se connecter');
    expect(translate('en', 'auth.login.submit')).toBe('Log in');
  });

  it('defaults to French', () => {
    expect(DEFAULT_LANGUAGE).toBe('fr');
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
