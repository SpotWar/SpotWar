import type { Session } from '@supabase/supabase-js';

import {
  authReducer,
  initialAuthState,
  type AuthState,
  type Profile,
} from '../lib/auth-state';

// Type-only import of Session has no runtime cost, so this suite never pulls
// supabase-js into the bundle — which is why it can run (importing the runtime
// supabase client corrupts the test renderer in this Expo/jest setup).

const sessionFor = (userId: string): Session =>
  ({ user: { id: userId, email: `${userId}@x.co` } }) as unknown as Session;

const profileFor = (userId: string): Profile => ({
  id: userId,
  nametag: `tag_${userId}`,
  email: `${userId}@x.co`,
  preferred_language: 'fr',
});

describe('authReducer', () => {
  it('starts loading with no session or profile', () => {
    expect(initialAuthState).toEqual({
      session: null,
      profile: null,
      loading: true,
    });
  });

  it('signed-out → signed-in: sets session and clears loading', () => {
    const next = authReducer(initialAuthState, {
      type: 'authEvent',
      session: sessionFor('u1'),
    });
    expect(next.loading).toBe(false);
    expect(next.session?.user?.id).toBe('u1');
    expect(next.profile).toBeNull();
  });

  it('clears loading even when the restored session is null', () => {
    const next = authReducer(initialAuthState, {
      type: 'authEvent',
      session: null,
    });
    expect(next.loading).toBe(false);
    expect(next.session).toBeNull();
  });

  it('signed-in → signed-out: clears session and profile', () => {
    const signedIn: AuthState = {
      session: sessionFor('u1'),
      profile: profileFor('u1'),
      loading: false,
    };
    const next = authReducer(signedIn, { type: 'authEvent', session: null });
    expect(next.session).toBeNull();
    expect(next.profile).toBeNull();
  });

  it('keeps the profile across a same-user auth refresh', () => {
    const signedIn: AuthState = {
      session: sessionFor('u1'),
      profile: profileFor('u1'),
      loading: false,
    };
    const next = authReducer(signedIn, {
      type: 'authEvent',
      session: sessionFor('u1'),
    });
    expect(next.profile).toEqual(profileFor('u1'));
  });

  it('drops a stale profile when the user changes', () => {
    const signedIn: AuthState = {
      session: sessionFor('u1'),
      profile: profileFor('u1'),
      loading: false,
    };
    const next = authReducer(signedIn, {
      type: 'authEvent',
      session: sessionFor('u2'),
    });
    expect(next.profile).toBeNull();
    expect(next.session?.user?.id).toBe('u2');
  });

  it('applies a profileResolved that matches the current user', () => {
    const signedIn: AuthState = {
      session: sessionFor('u1'),
      profile: null,
      loading: false,
    };
    const next = authReducer(signedIn, {
      type: 'profileResolved',
      userId: 'u1',
      profile: profileFor('u1'),
    });
    expect(next.profile).toEqual(profileFor('u1'));
  });

  it('ignores a late profileResolved for a previous user', () => {
    const signedIn: AuthState = {
      session: sessionFor('u2'),
      profile: null,
      loading: false,
    };
    const next = authReducer(signedIn, {
      type: 'profileResolved',
      userId: 'u1', // resolved after the user already switched to u2
      profile: profileFor('u1'),
    });
    expect(next).toBe(signedIn);
  });
});
