import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import Home from '../app/(app)/index';
import { Providers, waitForTestId } from '../test-utils/render';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';
import { persistedStore } from '../lib/storage';
import { LANGUAGE_STORAGE_KEY, type Language } from '../lib/i18n';

/**
 * The authed home's settings language toggle. Driven through the REAL providers
 * with a signed-in fake client (FR profile) injected — the seam subtask 02
 * exposes. Proves the toggle flips the whole screen's copy instantly (bound to
 * the live `useI18n().language`, no stale snapshot) and that the change rides
 * `setLanguage`'s single persistence path: the device-local store AND the
 * profile write-back, with no second path added here.
 *
 * Single render per the file's structure note (RN 0.85 + React 19 + RTL): a
 * second render after heavy interaction fails to commit, so one scenario per file.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const SESSION = { user: { id: 'user-1' } } as never;

beforeEach(async () => {
  await persistedStore.removeItem(LANGUAGE_STORAGE_KEY);
});

it('toggles the app language instantly and persists locally + to the profile', async () => {
  const client = makeFakeAuthClient({
    initialSession: SESSION,
    profileRow: { id: 'user-1', preferred_language: 'fr', nametag: 'maxime_t' },
  });
  render(
    <Providers client={client as never}>
      <Home />
    </Providers>,
  );

  // Starts in FR (adopted from the profile): the settings header reads "Réglages".
  await waitForTestId('settings-lang-en');
  await waitFor(() =>
    expect(screen.getByText('Réglages')).toBeTruthy(),
  );
  expect(screen.getByTestId('settings-lang-fr').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('settings-lang-en').props.accessibilityState.selected).toBe(false);

  // Tap EN → the whole screen reskins instantly (header now "Settings").
  fireEvent.press(screen.getByTestId('settings-lang-en'));
  await waitFor(() => expect(screen.getByText('Settings')).toBeTruthy());
  expect(screen.getByTestId('settings-lang-en').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('settings-lang-fr').props.accessibilityState.selected).toBe(false);

  // …and the change took the single persistence path: profile write-back…
  await waitFor(() => expect(client.updateCalls).toHaveLength(1));
  expect(client.updateCalls[0]).toMatchObject({
    table: 'profiles',
    values: { preferred_language: 'en' as Language },
    eqColumn: 'id',
    eqValue: 'user-1',
  });
  // …plus the device-local copy (works offline / after logout).
  expect(await persistedStore.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
});
