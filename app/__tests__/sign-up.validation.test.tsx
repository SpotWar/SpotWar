import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SignUp from '../app/(auth)/sign-up';
import { AuthProvider } from '../lib/auth';
import { Providers, waitForTestId } from '../test-utils/render';
import { makeFakeAuthClient } from '../test-utils/fake-supabase';

/**
 * Screen-level proof that a field error renders through `NField` (one render per
 * file — see the note in `sign-up.screen.test.tsx`). The email-format error is
 * synchronous (no awaited promise), so it commits reliably and exercises the
 * exact `NField error` rendering path the async errors also use. FR default.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

it('shows the email-format error on the email field after blur', async () => {
  render(
    <Providers>
      <AuthProvider client={makeFakeAuthClient() as never}>
        <SignUp />
      </AuthProvider>
    </Providers>,
  );

  const email = await waitForTestId('signup-email');
  fireEvent.changeText(email, 'max@spot'); // malformed
  fireEvent(email, 'blur'); // mark touched → error surfaces

  expect(await waitForTestId('signup-email-error')).toHaveTextContent(
    'Cet e-mail ne semble pas valide',
  );
});
