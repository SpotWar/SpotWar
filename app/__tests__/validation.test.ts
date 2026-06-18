import {
  isValidEmail,
  isValidNametag,
  passwordChecks,
  isPasswordValid,
  passwordStrength,
  PASSWORD_MIN_LENGTH,
} from '../lib/validation';

describe('isValidEmail', () => {
  it.each([
    'max@spotwar.run',
    'a.b+tag@sub.domain.co',
    'x@y.io',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    'max@spot', // no TLD dot
    'maxspotwar.run', // no @
    '@spotwar.run', // empty local
    'max@.run', // empty domain label before dot
    'has space@x.io',
    '',
  ])('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidEmail('  max@spotwar.run  ')).toBe(true);
  });
});

describe('passwordChecks / isPasswordValid', () => {
  it('requires min length, lower, upper, digit AND symbol (the server policy)', () => {
    // The exact policy from subtask 01: lower_upper_letters_digits_symbols, min 8.
    expect(isPasswordValid('Sw-test-123!')).toBe(true);
  });

  it('rejects a password missing an UPPERCASE letter (the easy-to-miss class)', () => {
    // Looks fine under a "number + symbol" rule, but the server rejects it.
    const checks = passwordChecks('sw-test-123!');
    expect(checks.upper).toBe(false);
    expect(isPasswordValid('sw-test-123!')).toBe(false);
  });

  it('rejects a password missing a symbol', () => {
    expect(isPasswordValid('SwTest1234')).toBe(false);
    expect(passwordChecks('SwTest1234').symbol).toBe(false);
  });

  it('rejects a password missing a digit', () => {
    expect(isPasswordValid('Sw-test-abc!')).toBe(false);
  });

  it(`rejects a password shorter than ${PASSWORD_MIN_LENGTH}`, () => {
    expect(isPasswordValid('Sw-1!aA')).toBe(false); // 7 chars
    expect(passwordChecks('Sw-1!aA').length).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('is 0 (empty) for an empty string', () => {
    expect(passwordStrength('')).toBe(0);
  });

  it('is 1 (weak) for a short single-class password', () => {
    expect(passwordStrength('abc')).toBe(1);
  });

  it('is 2 (fair) when most-but-not-all requirements are met', () => {
    // length + lower + digit (3 of 5) but no upper, no symbol → not valid, fair.
    expect(passwordStrength('abcdef12')).toBe(2);
  });

  it('is 3 (strong) only when the full server policy passes', () => {
    expect(passwordStrength('Sw-test-123!')).toBe(3);
  });
});

describe('isValidNametag', () => {
  it('accepts any non-empty trimmed value', () => {
    expect(isValidNametag('maxime_t')).toBe(true);
  });

  it('rejects empty / whitespace-only', () => {
    expect(isValidNametag('')).toBe(false);
    expect(isValidNametag('   ')).toBe(false);
  });
});
