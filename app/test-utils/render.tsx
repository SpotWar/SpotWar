import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { I18nProvider } from '../lib/i18n';

/**
 * Fixed safe-area metrics for the test renderer — `SafeAreaProvider` otherwise
 * waits for an onLayout that never fires under jest and `useSafeAreaInsets()`
 * throws. A 390×844 frame (the design's phone) with a status-bar/home inset.
 */
const TEST_METRICS = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Wrap `ui` in the providers every auth screen needs (safe-area + i18n). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={TEST_METRICS}>
      <I18nProvider>{children}</I18nProvider>
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

/** Render `ui` wrapped in the i18n provider (FR default). */
export function renderWithI18n(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

/** Render a screen wrapped in the safe-area + i18n providers it expects. */
export function renderScreen(ui: ReactElement) {
  return render(<Providers>{ui}</Providers>);
}
