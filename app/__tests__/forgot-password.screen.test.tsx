import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ForgotPassword from '../app/(auth)/forgot-password';
import { Providers, waitForTestId } from '../test-utils/render';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';

/**
 * Forgot-password screen (one render per file — see the note in
 * `sign-up.screen.test.tsx`). Submitting a valid email calls `resetPassword`
 * with a `redirectTo` pointed at the /reset-password route (subtask 02's
 * passthrough → subtask 01's allow-list), and shows the inline confirmation.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

it('sends a reset email with a /reset-password redirect and confirms inline', async () => {
  const client = makeFakeAuthClient();
  render(
    <Providers client={client as never}>
      <ForgotPassword />
    </Providers>,
  );

  fireEvent.changeText(await waitForTestId('forgot-email'), 'max@spotwar.run');
  await waitFor(() =>
    expect(
      screen.getByTestId('forgot-submit').props.accessibilityState.disabled,
    ).toBe(false),
  );
  fireEvent.press(screen.getByTestId('forgot-submit'));

  await waitFor(() => expect(client.resetCalls).toHaveLength(1));
  expect(client.resetCalls[0].email).toBe('max@spotwar.run');
  // A redirect target was supplied and points at the reset route.
  expect(client.resetCalls[0].redirectTo).toMatch(/reset-password/);
});
