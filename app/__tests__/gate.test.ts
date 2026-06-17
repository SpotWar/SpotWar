import type { Session } from '@supabase/supabase-js';

import { gateDecision, isEmailVerified, ROUTES } from '../lib/gate';

// Minimal session stubs — gateDecision only reads user.email_confirmed_at.
const verified = {
  user: { email_confirmed_at: '2026-01-01T00:00:00Z' },
} as unknown as Session;
const unverified = { user: { email_confirmed_at: null } } as unknown as Session;

describe('isEmailVerified', () => {
  it('is false without a session', () => {
    expect(isEmailVerified(null)).toBe(false);
  });
  it('is false when email is unconfirmed', () => {
    expect(isEmailVerified(unverified)).toBe(false);
  });
  it('is true when email is confirmed', () => {
    expect(isEmailVerified(verified)).toBe(true);
  });
});

describe('gateDecision', () => {
  it('sends an unauthenticated user outside the auth group to welcome', () => {
    expect(gateDecision({ session: null, inAuthGroup: false })).toBe(
      ROUTES.welcome,
    );
  });

  it('leaves an unauthenticated user already in the auth group alone', () => {
    expect(gateDecision({ session: null, inAuthGroup: true })).toBeNull();
  });

  it('routes an unverified user to verify-email regardless of group', () => {
    expect(gateDecision({ session: unverified, inAuthGroup: true })).toBe(
      ROUTES.verify,
    );
    expect(gateDecision({ session: unverified, inAuthGroup: false })).toBe(
      ROUTES.verify,
    );
  });

  it('moves a verified user out of the auth group into the app', () => {
    expect(gateDecision({ session: verified, inAuthGroup: true })).toBe(
      ROUTES.app,
    );
  });

  it('leaves a verified user already in the app alone', () => {
    expect(gateDecision({ session: verified, inAuthGroup: false })).toBeNull();
  });
});
