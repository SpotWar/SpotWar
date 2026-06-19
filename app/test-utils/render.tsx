import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, waitFor } from '@testing-library/react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { I18nProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/auth';
import { makeFakeAuthClient } from './fake-supabase';

/**
 * Fixed safe-area metrics for the test renderer — `SafeAreaProvider` otherwise
 * waits for an onLayout that never fires under jest and `useSafeAreaInsets()`
 * throws. A 390×844 frame (the design's phone) with a status-bar/home inset.
 */
const TEST_METRICS = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Wrap `ui` in the providers every auth screen needs (safe-area + auth + i18n).
 * Auth wraps i18n to mirror the app's `_layout` order (subtask 02): `I18nProvider`
 * reads `useAuth()`, so it must mount inside an `AuthProvider`. The default
 * client is a logged-out fake; pass `client` to drive a signed-in scenario.
 *
 * Screens that need a specific auth outcome should inject their fake here rather
 * than nesting their own `AuthProvider` — a nested one would sit BELOW this
 * `I18nProvider`, so i18n would read this default (logged-out) provider instead.
 */
export function Providers({
  children,
  client = makeFakeAuthClient() as unknown as SupabaseClient,
}: {
  children: React.ReactNode;
  client?: SupabaseClient;
}) {
  return (
    <SafeAreaProvider initialMetrics={TEST_METRICS}>
      <AuthProvider client={client}>
        <I18nProvider>{children}</I18nProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Test helpers shared across the screen/component suites.
 *
 * Two harness quirks they paper over (both rooted in React 19 + RTL under
 * jest-expo):
 *  - `render()` commits asynchronously, and `screen.findBy*` is not wired here
 *    (it returns the "render has not been called" stub). The reliable pattern is
 *    to poll a synchronous `getByTestId` inside `waitFor`, which `waitForTestId`
 *    wraps so each test's first query isn't boilerplate.
 *  - screens read `useI18n()`, so they must mount inside an `I18nProvider`;
 *    `renderWithI18n` supplies one.
 */

/** Wait for the first commit, then return the node for `testId`. */
export async function waitForTestId(testId: string) {
  await waitFor(() => expect(screen.getByTestId(testId)).toBeTruthy());
  return screen.getByTestId(testId);
}

/** Render `ui` wrapped in the auth + i18n providers (FR default, logged out). */
export function renderWithI18n(ui: ReactElement) {
  return render(
    <AuthProvider client={makeFakeAuthClient() as never}>
      <I18nProvider>{ui}</I18nProvider>
    </AuthProvider>,
  );
}

/** Render a screen wrapped in the safe-area + i18n providers it expects. */
export function renderScreen(ui: ReactElement) {
  return render(<Providers>{ui}</Providers>);
}
