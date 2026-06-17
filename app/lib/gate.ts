import type { Session } from '@supabase/supabase-js';

/**
 * The auth-routing decision, extracted as a pure function so the redirect logic
 * is unit-testable without a router or a live Supabase session. The root layout
 * (`app/_layout.tsx`) calls this on every auth change and redirects to the
 * returned route; `null` means "stay where you are".
 *
 * Email verification is the gate's central rule: Supabase issues a session the
 * moment a user signs up even before they confirm their email, so "has a
 * session" is not enough to enter the app. We treat `email_confirmed_at` as the
 * source of truth and route an unverified user to the verify screen.
 */
export const ROUTES = {
  /** Authenticated + verified users live under here. */
  app: '/(app)',
  /** Unauthenticated entry point. */
  welcome: '/(auth)/welcome',
  /** Authenticated but email not yet confirmed. */
  verify: '/(auth)/verify-email',
} as const;

export type GateRoute = (typeof ROUTES)[keyof typeof ROUTES];

export type GateInput = {
  session: Session | null;
  /**
   * Whether the current route is already inside the `(auth)` group. Used to
   * avoid redirect loops: a verified user sitting on a `(auth)` screen should be
   * pushed into the app, but one already inside `(app)` should be left alone.
   */
  inAuthGroup: boolean;
};

/** True when the session's user has a confirmed email. */
export function isEmailVerified(session: Session | null): boolean {
  return Boolean(session?.user?.email_confirmed_at);
}

/**
 * Decide where to send the user, or `null` to leave them put.
 *
 * - No session anywhere outside `(auth)` → welcome.
 * - Session but unverified → verify-email (regardless of where they are).
 * - Verified but still parked in `(auth)` → into the app.
 * - Otherwise (verified & already in app, or unauthed & already in auth) → null.
 */
export function gateDecision({
  session,
  inAuthGroup,
}: GateInput): GateRoute | null {
  if (!session) {
    return inAuthGroup ? null : ROUTES.welcome;
  }
  if (!isEmailVerified(session)) {
    return ROUTES.verify;
  }
  return inAuthGroup ? ROUTES.app : null;
}
