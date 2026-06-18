import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SignUp from '../app/(auth)/sign-up';
import { AuthProvider } from '../lib/auth';
import { Providers, waitForTestId } from '../test-utils/render';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';

/**
 * Sign-up happy path, driven through the REAL `AuthProvider` with a fake
 * supabase client injected (the seam 02 exposes) and a mocked router.
 *
 * NOTE ON STRUCTURE: this file renders ONCE. Under RN 0.85 + React 19 + RTL 14
 * in this jest-expo setup, a second `render()` in the same file after a
 * heavy-interaction first render fails to commit (a renderer/concurrent-root
 * quirk — reproducible with two bare TextInputs toggling a conditional child).
 * So each scenario that needs its own render lives in its own file; the
 * duplicate-nametag path is in `sign-up.duplicate.test.tsx`.
 *
 * This single render proves: submit gated on valid + terms, the uppercase
 * policy is enforced client-side, and a confirm-required success routes to
 * verify-email forwarding nametag + preferred_language as metadata.
 */

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

function submitState() {
  return screen.getByTestId('signup-submit').props.accessibilityState;
}

it('gates submit on valid+terms, enforces the uppercase policy, and routes to verify on success', async () => {
  const client = makeFakeAuthClient(); // success, no session (confirmations on)
  render(
    <Providers>
      <AuthProvider client={client as never}>
        <SignUp />
      </AuthProvider>
    </Providers>,
  );

  // Initially disabled.
  await waitForTestId('signup-submit');
  expect(submitState().disabled).toBe(true);

  // A password missing uppercase keeps submit disabled even with everything else
  // filled + terms (the server policy requires upper/lower/digit/symbol).
  fireEvent.changeText(screen.getByTestId('signup-nametag'), 'maxime_t');
  fireEvent.changeText(screen.getByTestId('signup-email'), 'max@spotwar.run');
  fireEvent.changeText(screen.getByTestId('signup-password'), 'sw-test-123!');
  fireEvent.press(screen.getByTestId('signup-terms'));
  await waitFor(() => expect(submitState().disabled).toBe(true));

  // Fix the password to satisfy the full policy → submit enables.
  fireEvent.changeText(screen.getByTestId('signup-password'), 'Sw-test-123!');
  await waitFor(() => expect(submitState().disabled).toBe(false));

  // Submit → confirm-required success routes to verify-email with the email,
  // and the call forwarded the nametag + language as user metadata.
  fireEvent.press(screen.getByTestId('signup-submit'));
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/verify-email',
      params: { email: 'max@spotwar.run' },
    }),
  );
  expect(client.signUpCalls[0].options?.data).toMatchObject({
    nametag: 'maxime_t',
    preferred_language: 'fr',
  });
});
