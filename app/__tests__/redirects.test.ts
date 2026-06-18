import { resetPasswordRedirect, verifyEmailRedirect } from '../lib/redirects';

/**
 * The redirect helpers must always produce a non-empty URL ending in the right
 * route, on whichever platform the test runs (jest-expo defaults to native, so
 * these resolve to `expo-linking` deep links). The exact scheme/host varies by
 * config, so we assert the route suffix, not the prefix.
 */
describe('redirect helpers', () => {
  it('reset-password redirect targets the /reset-password route', () => {
    const url = resetPasswordRedirect();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(url).toMatch(/reset-password\/?$/);
  });

  it('verify-email redirect is a non-empty URL', () => {
    const url = verifyEmailRedirect();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
