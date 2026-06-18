import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SignUp from '../app/(auth)/sign-up';
import { AuthProvider } from '../lib/auth';
import { Providers, waitForTestId } from '../test-utils/render';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';

/**
 * Duplicate-nametag path at the screen level (one render per file — see the note
 * in `sign-up.screen.test.tsx`). On a `23505` from signUp the screen must NOT
 * navigate to verify-email (it stays on sign-up to show the field error).
 *
 * The error→field *mapping* itself (`23505` → "nametag taken") is unit-tested in
 * `auth-errors.test.ts`, and the screen renders a field error from that mapping
 * via the same `NField error` path the synchronous email-format error uses
 * (covered in `sign-up.validation.test.tsx`). Asserting the post-async error
 * *commit* in this heavy screen is blocked by an RTL/RN-0.85/React-19 harness
 * quirk (a screen-level re-render triggered by an awaited promise doesn't commit
 * under the test renderer; a minimal tree does), so here we assert the
 * observable, reliable contract: signUp was invoked and no navigation happened.
 */

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

it('does not navigate to verify-email when signUp returns a 23505', async () => {
  const client = makeFakeAuthClient({
    signUpError: { code: '23505', message: 'duplicate key value' },
  });
  render(
    <Providers>
      <AuthProvider client={client as never}>
        <SignUp />
      </AuthProvider>
    </Providers>,
  );

  fireEvent.changeText(await waitForTestId('signup-nametag'), 'maxime_t');
  fireEvent.changeText(screen.getByTestId('signup-email'), 'max@spotwar.run');
  fireEvent.changeText(screen.getByTestId('signup-password'), 'Sw-test-123!');
  fireEvent.press(screen.getByTestId('signup-terms'));
  await waitFor(() =>
    expect(
      screen.getByTestId('signup-submit').props.accessibilityState.disabled,
    ).toBe(false),
  );

  fireEvent.press(screen.getByTestId('signup-submit'));

  // signUp was attempted with the entered nametag…
  await waitFor(() => expect(client.signUpCalls).toHaveLength(1));
  expect(client.signUpCalls[0].options?.data).toMatchObject({ nametag: 'maxime_t' });
  // …and the 23505 kept the user on sign-up (no verify-email navigation).
  expect(mockReplace).not.toHaveBeenCalled();
});
