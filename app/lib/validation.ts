/**
 * Pure form-validation helpers for the auth screens. No React, no Supabase — so
 * they unit-test trivially and the screens stay declarative.
 *
 * Password policy is dictated by subtask 01's Supabase config:
 * `password_requirements = lower_upper_letters_digits_symbols`, min length 8.
 * That means the server rejects a password that is missing ANY of
 * lower / upper / digit / symbol — including uppercase, which an earlier "number
 * + symbol" wording omitted. The client MUST mirror that exactly, otherwise a
 * password that looks valid here gets a 422 from the server (see pitfalls).
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Email format check. Deliberately a pragmatic single-pass pattern, not RFC
 * 5322: one `@`, a non-empty local part, a domain with at least one dot and a
 * 2+ char TLD. Supabase does its own validation server-side; this is only to
 * give immediate feedback ("That doesn't look like a valid email").
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** The individual character-class requirements, surfaced for live UI hints. */
export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
};

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    // Anything that isn't a letter, digit, or whitespace counts as a symbol.
    symbol: /[^A-Za-z0-9\s]/.test(password),
  };
}

/**
 * True only when EVERY server-required class is present and the length minimum
 * is met. This is the gate the submit button respects — it matches the server's
 * `lower_upper_letters_digits_symbols` policy 1:1.
 */
export function isPasswordValid(password: string): boolean {
  const c = passwordChecks(password);
  return c.length && c.lower && c.upper && c.digit && c.symbol;
}

export type PasswordStrength = 0 | 1 | 2 | 3;

/**
 * Strength for the 3-segment meter:
 *  - 0  → empty (no segments lit; used before the user types),
 *  - 1  → Weak  (red)   — has fewer than 3 satisfied requirements,
 *  - 2  → Fair  (warn)  — 3–4 requirements satisfied but not the full policy,
 *  - 3  → Strong (ok)   — meets the full server policy (length + all classes).
 *
 * Only level 3 is actually accept-able by the backend; Weak/Fair are guidance.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;
  if (isPasswordValid(password)) return 3;

  const c = passwordChecks(password);
  const satisfied =
    (c.length ? 1 : 0) +
    (c.lower ? 1 : 0) +
    (c.upper ? 1 : 0) +
    (c.digit ? 1 : 0) +
    (c.symbol ? 1 : 0);

  // 3+ of the 5 sub-requirements reads as "Fair"; below that, "Weak".
  return satisfied >= 3 ? 2 : 1;
}

/** A non-empty nametag is the only client-side nametag rule; uniqueness is the DB's. */
export function isValidNametag(nametag: string): boolean {
  return nametag.trim().length > 0;
}
