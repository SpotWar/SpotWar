import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Builds the redirect URLs we hand to Supabase Auth for the email links
 * (verification and password-reset). The target must be allow-listed in subtask
 * 01's `additional_redirect_urls`.
 *
 * Per platform:
 *  - **web:** an absolute URL on the current origin (e.g.
 *    `https://app.spotwar.run/reset-password`) so the link reopens the running
 *    web app at that route, where `detectSessionInUrl` parses the tokens.
 *  - **native:** an `expo-linking` deep link (e.g. `spotwar://reset-password`)
 *    so tapping the link in the mail app deep-links back into the installed app.
 *
 * `path` is a leading-slash route (`'/reset-password'`, `'/'`).
 */
function redirectUrl(path: string): string {
  if (Platform.OS === 'web') {
    // `window.location.origin` is undefined in SSR/non-browser web bundles; fall
    // back to expo-linking, which still yields a usable URL there.
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${path}`;
    }
  }
  // createURL turns a path into the app's scheme-based deep link on native, and
  // an origin-relative URL on web when window isn't available.
  return Linking.createURL(path);
}

/** Where the password-reset email link should land. */
export function resetPasswordRedirect(): string {
  return redirectUrl('/reset-password');
}

/**
 * Where the email-verification link should land. We send it to the app root and
 * let the auth gate route from there (a confirmed session → into the app), so we
 * don't need a dedicated verify-landing route.
 */
export function verifyEmailRedirect(): string {
  return redirectUrl('/');
}
