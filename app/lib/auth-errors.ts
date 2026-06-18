/**
 * Maps a Supabase signUp/signIn error into a structured, screen-friendly shape:
 * which field (if any) the error belongs to, plus an i18n key for the message.
 *
 * The headline case is the duplicate nametag. The `profiles.nametag` column has
 * a UNIQUE constraint (subtask 01); when `handle_new_user()` tries to insert a
 * row whose nametag already exists, Postgres raises SQLSTATE `23505`
 * (unique_violation). That surfaces through `auth.signUp` as a 500-ish error
 * whose payload carries the `23505` code somewhere in its text — it is NOT a
 * client-side check and only arrives AFTER submit (see pitfalls). We sniff for
 * `23505` to attribute it to the nametag field.
 */
import type { TranslationKey } from './i18n';

/**
 * The minimal error shape we read — works for AuthError and PostgrestError alike.
 * Kept structural (no index signature) so a Supabase `AuthError` assigns to it
 * directly; the duplicate-nametag scan stringifies the value to reach codes that
 * Supabase nests under version-specific keys.
 */
export type SupabaseLikeError = {
  message?: string;
  code?: string;
} | null;

export type MappedAuthError = {
  /** The form field to attach the error to, or `null` for a form-level error. */
  field: 'nametag' | 'email' | 'password' | null;
  /** i18n key for the user-facing message. */
  messageKey: TranslationKey;
};

/**
 * True when the error is the unique-violation a taken nametag produces.
 *
 * Two shapes, both seen against a live local stack:
 *  - the raw Postgres SQLSTATE `23505` (top-level `code`, or buried in the
 *    serialized error) — what a direct PostgREST insert returns; and
 *  - `AuthApiError: "Database error saving new user"` (status 500) — what
 *    `auth.signUp` ACTUALLY returns when our `handle_new_user()` trigger hits the
 *    unique index. The GoTrue auth API swallows the SQLSTATE and only reports a
 *    generic "database error saving new user", so we must match that string too,
 *    otherwise a real duplicate falls through to the generic error. (Verified in
 *    `signup-e2e.integration.test.ts`.) The only DB error the signup trigger can
 *    raise is the nametag unique violation, so attributing this message to the
 *    nametag field is safe here.
 */
export function isDuplicateNametag(error: SupabaseLikeError): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('database error saving new user')) return true;
  // The SQLSTATE often only appears in the serialized message/details, so scan
  // the whole error for the token as a last resort.
  try {
    return JSON.stringify(error).includes('23505');
  } catch {
    return false;
  }
}

/** True when the message indicates the account/email already exists. */
function isEmailAlreadyRegistered(error: SupabaseLikeError): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return m.includes('already registered') || m.includes('user already');
}

/**
 * Map a signUp error to a field + message key. Falls back to a generic form-level
 * key for anything we don't specifically recognize.
 */
export function mapSignUpError(error: SupabaseLikeError): MappedAuthError {
  if (isDuplicateNametag(error)) {
    return { field: 'nametag', messageKey: 'auth.error.nametagTaken' };
  }
  if (isEmailAlreadyRegistered(error)) {
    return { field: 'email', messageKey: 'auth.error.emailTaken' };
  }
  return { field: null, messageKey: 'auth.error.generic' };
}

/** Map a signIn error — bad credentials is by far the common case. */
export function mapSignInError(error: SupabaseLikeError): MappedAuthError {
  const m = error?.message?.toLowerCase() ?? '';
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return { field: null, messageKey: 'auth.error.invalidCredentials' };
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return { field: null, messageKey: 'auth.error.emailNotConfirmed' };
  }
  return { field: null, messageKey: 'auth.error.generic' };
}
