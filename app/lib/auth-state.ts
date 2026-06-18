import type { Session } from '@supabase/supabase-js';

/**
 * The AuthProvider's state machine, factored out of the React component as a
 * pure reducer. This is the part worth unit-testing — the signed-out → signed-in
 * → signed-out transitions and the `loading` lifecycle — and keeping it free of
 * any runtime supabase import lets it be tested without pulling supabase-js into
 * the renderer (which corrupts RTL in this Expo/jest setup). The component is a
 * thin shell over this reducer plus the live `onAuthStateChange` subscription.
 */

export type Profile = {
  id: string;
  nametag: string;
  email: string | null;
  preferred_language: 'fr' | 'en';
};

export type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True until the first auth event resolves the restored session. */
  loading: boolean;
};

export type AuthAction =
  // The first (or any) onAuthStateChange event: sets the session and, crucially,
  // clears `loading`. A new session with a different/absent user drops the stale
  // profile so it can't leak across sign-outs.
  | { type: 'authEvent'; session: Session | null }
  // A resolved profile fetch — applied only if it still matches the live user,
  // so a late response from a previous session can't clobber the current one.
  | { type: 'profileResolved'; userId: string; profile: Profile | null };

export const initialAuthState: AuthState = {
  session: null,
  profile: null,
  loading: true,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'authEvent': {
      const nextUserId = action.session?.user?.id ?? null;
      const sameUser = nextUserId === (state.session?.user?.id ?? null);
      return {
        session: action.session,
        // Keep the profile only while the user is unchanged; otherwise clear it
        // (a fresh fetch is dispatched by the provider for the new user).
        profile: sameUser ? state.profile : null,
        loading: false,
      };
    }
    case 'profileResolved': {
      if (action.userId !== (state.session?.user?.id ?? null)) return state;
      return { ...state, profile: action.profile };
    }
    default:
      return state;
  }
}
