import {
  isDuplicateNametag,
  mapSignUpError,
  mapSignInError,
} from '../lib/auth-errors';

describe('isDuplicateNametag', () => {
  it('matches a top-level 23505 code', () => {
    expect(isDuplicateNametag({ code: '23505' })).toBe(true);
  });

  it('matches the auth API\'s wrapped "Database error saving new user" (status 500)', () => {
    // What auth.signUp ACTUALLY returns when the handle_new_user() trigger hits
    // the nametag unique index — the raw 23505 is swallowed by GoTrue.
    const err = {
      name: 'AuthApiError',
      message: 'Database error saving new user',
      status: 500,
    } as never;
    expect(isDuplicateNametag(err)).toBe(true);
  });

  it('matches 23505 buried in the serialized error (nested under any key)', () => {
    const err = {
      message: 'Database error saving new user',
      // Supabase nests the original db error; the SQLSTATE lives deep inside.
      cause: { details: 'duplicate key value violates unique constraint',
        original: 'ERROR: 23505' },
    } as never;
    expect(isDuplicateNametag(err)).toBe(true);
  });

  it('does not match an unrelated error', () => {
    expect(isDuplicateNametag({ message: 'rate limited', code: '429' })).toBe(false);
    expect(isDuplicateNametag(null)).toBe(false);
  });
});

describe('mapSignUpError', () => {
  it('maps a 23505 onto the nametag field → "nametag taken"', () => {
    const mapped = mapSignUpError({ code: '23505', message: 'unique violation' });
    expect(mapped.field).toBe('nametag');
    expect(mapped.messageKey).toBe('auth.error.nametagTaken');
  });

  it('maps an already-registered email onto the email field', () => {
    const mapped = mapSignUpError({ message: 'User already registered' });
    expect(mapped.field).toBe('email');
    expect(mapped.messageKey).toBe('auth.error.emailTaken');
  });

  it('falls back to a generic form-level error otherwise', () => {
    const mapped = mapSignUpError({ message: 'network error' });
    expect(mapped.field).toBeNull();
    expect(mapped.messageKey).toBe('auth.error.generic');
  });
});

describe('mapSignInError', () => {
  it('maps invalid credentials', () => {
    expect(mapSignInError({ message: 'Invalid login credentials' }).messageKey).toBe(
      'auth.error.invalidCredentials',
    );
  });

  it('maps email-not-confirmed', () => {
    expect(mapSignInError({ message: 'Email not confirmed' }).messageKey).toBe(
      'auth.error.emailNotConfirmed',
    );
  });

  it('falls back to generic', () => {
    expect(mapSignInError({ message: 'boom' }).messageKey).toBe('auth.error.generic');
  });
});
