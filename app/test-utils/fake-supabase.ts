/**
 * A minimal fake of the supabase client surface the `AuthProvider` (subtask 02)
 * and the auth screens touch. Injected via `AuthProvider`'s `client` prop — the
 * same seam 02 uses — so screen tests drive auth outcomes deterministically
 * without a network or the real client.
 *
 * It implements just enough: `auth.onAuthStateChange` (fires once with the
 * configured session, like the real one), `signUp` / `signInWithPassword` /
 * `signOut` / `resetPasswordForEmail`, a `from().select().eq().maybeSingle()`
 * chain for the profile read, and a `from().update().eq()` chain for the
 * preferred-language write-back. Calls are recorded for assertions.
 */

type AuthErrorLike = { message?: string; code?: string } | null;

export type FakeAuthOptions = {
  /** Error returned from signUp (e.g. a 23505). Default: success. */
  signUpError?: AuthErrorLike;
  /** Session returned from signUp. Default: null (confirm-required flow). */
  signUpSession?: unknown;
  /** Error returned from signInWithPassword. Default: success. */
  signInError?: AuthErrorLike;
  /** The session the provider restores on mount via onAuthStateChange. */
  initialSession?: unknown;
  /** Profile row the `from('profiles').select()...maybeSingle()` read returns. */
  profileRow?: unknown;
  /** Error returned from the profile update (write-back). Default: success. */
  updateError?: AuthErrorLike;
};

export type SignUpCall = {
  email: string;
  password: string;
  // `data` carries the user metadata; `emailRedirectTo` is the verify-link target
  // 03 supplies (subtask 02 forwards it under `options`).
  options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
};

export type ResetCall = { email: string; redirectTo?: string };

/** A recorded `from(table).update(values).eq(column, value)` write. */
export type UpdateCall = {
  table: string;
  values: Record<string, unknown>;
  eqColumn: string;
  eqValue: unknown;
};

export type FakeAuthClient = {
  auth: {
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      data: { subscription: { unsubscribe: () => void } };
    };
    signUp: (args: SignUpCall) => Promise<{ data: { user: unknown; session: unknown }; error: AuthErrorLike }>;
    signInWithPassword: (args: { email: string; password: string }) => Promise<{ error: AuthErrorLike }>;
    signOut: () => Promise<{ error: null }>;
    resetPasswordForEmail: (
      email: string,
      options?: { redirectTo?: string },
    ) => Promise<{ error: null }>;
  };
  from: (table: string) => {
    select: () => {
      eq: () => { maybeSingle: () => Promise<{ data: unknown; error: null }> };
    };
    update: (values: Record<string, unknown>) => {
      eq: (
        column: string,
        value: unknown,
      ) => Promise<{ data: null; error: AuthErrorLike }>;
    };
  };
  /** Recorded signUp invocations. */
  signUpCalls: SignUpCall[];
  /** Recorded reset-password requests (email + redirectTo). */
  resetCalls: ResetCall[];
  /** Recorded profile update (write-back) invocations. */
  updateCalls: UpdateCall[];
};

export function makeFakeAuthClient(opts: FakeAuthOptions = {}): FakeAuthClient {
  const signUpCalls: SignUpCall[] = [];
  const resetCalls: ResetCall[] = [];
  const updateCalls: UpdateCall[] = [];

  return {
    signUpCalls,
    resetCalls,
    updateCalls,
    auth: {
      onAuthStateChange: (cb) => {
        // Fire synchronously with the restored session (the real client emits an
        // INITIAL_SESSION right after subscribe). Synchronous — not setTimeout —
        // so the provider's `loading` clears within the render act() and no async
        // callback lingers to collide with the next test.
        cb('INITIAL_SESSION', opts.initialSession ?? null);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signUp: async (args) => {
        signUpCalls.push(args);
        return {
          data: {
            user: opts.signUpError ? null : { id: 'fake-user', email: args.email },
            session: opts.signUpSession ?? null,
          },
          error: opts.signUpError ?? null,
        };
      },
      signInWithPassword: async () => ({ error: opts.signInError ?? null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async (email, options) => {
        resetCalls.push({ email, redirectTo: options?.redirectTo });
        return { error: null };
      },
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: opts.profileRow ?? null, error: null }),
        }),
      }),
      update: (values) => ({
        eq: async (column, value) => {
          updateCalls.push({ table, values, eqColumn: column, eqValue: value });
          return { data: null, error: opts.updateError ?? null };
        },
      }),
    }),
  };
}
