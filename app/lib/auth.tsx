import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

import { supabase } from './supabase';
import {
  authReducer,
  initialAuthState,
  type Profile,
} from './auth-state';

// Re-export so existing consumers keep importing `Profile` from here.
export type { Profile } from './auth-state';

export type SignUpInput = {
  email: string;
  password: string;
  nametag: string;
  preferred_language: 'fr' | 'en';
};

/** Uniform result so screens branch on `error` without try/catch around await. */
export type AuthResult = { error: AuthError | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /**
   * True until the first `onAuthStateChange` fires. The router gate must hold
   * until this clears, otherwise on a cold start it sees `session === null`
   * before the persisted session restores and flickers the user to the auth
   * stack before bouncing them back.
   */
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Fetch the caller's profile row. Returns null (never throws) when the table is
 * absent or the row hasn't been created yet, so a missing migration degrades to
 * "no profile" rather than crashing the provider.
 */
async function fetchProfile(
  client: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, nametag, email, preferred_language')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return (data as Profile | null) ?? null;
}

export function AuthProvider({
  children,
  // The supabase client is injectable so tests can drive `onAuthStateChange`
  // with a fake — mocking the module instead breaks RTL's renderer in this
  // Expo/jest setup (a hoisted jest.mock loads react-native untransformed).
  client = supabase,
}: {
  children: React.ReactNode;
  client?: SupabaseClient;
}) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const { session, profile, loading } = state;

  useEffect(() => {
    let active = true;

    // onAuthStateChange fires synchronously with the restored (or null) session
    // right after subscribing, which is what flips `loading` off — so we don't
    // also call getSession(); that would race a second resolution path.
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      dispatch({ type: 'authEvent', session: nextSession });

      const userId = nextSession?.user?.id;
      if (userId) {
        // Fire-and-forget: don't block the gate on the profile read. The reducer
        // ignores a stale response whose user no longer matches the session.
        fetchProfile(client, userId).then((p) => {
          if (active) dispatch({ type: 'profileResolved', userId, profile: p });
        });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signUp: async ({ email, password, nametag, preferred_language }) => {
        // nametag + preferred_language ride along as user metadata; subtask 01's
        // handle_new_user() trigger reads them to seed the profiles row.
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { data: { nametag, preferred_language } },
        });
        return { error };
      },
      signIn: async (email, password) => {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        return { error };
      },
      signOut: async () => {
        const { error } = await client.auth.signOut();
        return { error };
      },
      resetPassword: async (email) => {
        const { error } = await client.auth.resetPasswordForEmail(email);
        return { error };
      },
    };
  }, [client, session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
