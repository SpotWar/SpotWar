import type { SupabaseClient } from '@supabase/supabase-js';

import { makeAuthActions } from '../lib/auth';

// makeAuthActions is a plain factory (no React render), so importing supabase-js
// here is safe — the renderer-corruption issue only affects RTL's render(), not
// direct calls. We assert the request shaping, especially the redirect
// passthroughs the reset/verify email links depend on.
function makeSpyClient() {
  const signUp = jest.fn(async () => ({ data: {}, error: null }));
  const signInWithPassword = jest.fn(async () => ({ data: {}, error: null }));
  const signOut = jest.fn(async () => ({ error: null }));
  const resetPasswordForEmail = jest.fn(async () => ({ data: {}, error: null }));
  const client = {
    auth: { signUp, signInWithPassword, signOut, resetPasswordForEmail },
  } as unknown as SupabaseClient;
  return { client, signUp, signInWithPassword, signOut, resetPasswordForEmail };
}

describe('makeAuthActions', () => {
  it('signUp forwards metadata and emailRedirectTo', async () => {
    const { client, signUp } = makeSpyClient();
    await makeAuthActions(client).signUp({
      email: 'a@b.co',
      password: 'pw',
      nametag: 'spotter',
      preferred_language: 'fr',
      emailRedirectTo: 'spotwar://verify',
    });
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'pw',
      options: {
        data: { nametag: 'spotter', preferred_language: 'fr' },
        emailRedirectTo: 'spotwar://verify',
      },
    });
  });

  it('signUp omits emailRedirectTo when not given (passes undefined)', async () => {
    const { client, signUp } = makeSpyClient();
    await makeAuthActions(client).signUp({
      email: 'a@b.co',
      password: 'pw',
      nametag: 'spotter',
      preferred_language: 'en',
    });
    const arg = (signUp.mock.calls[0] as unknown[])[0] as {
      options: { emailRedirectTo?: string };
    };
    expect(arg.options.emailRedirectTo).toBeUndefined();
  });

  it('resetPassword forwards redirectTo', async () => {
    const { client, resetPasswordForEmail } = makeSpyClient();
    await makeAuthActions(client).resetPassword(
      'a@b.co',
      'https://app.spotwar/reset-password',
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: 'https://app.spotwar/reset-password',
    });
  });

  it('resetPassword passes undefined redirectTo when omitted', async () => {
    const { client, resetPasswordForEmail } = makeSpyClient();
    await makeAuthActions(client).resetPassword('a@b.co');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: undefined,
    });
  });

  it('signIn and signOut forward to the client', async () => {
    const { client, signInWithPassword, signOut } = makeSpyClient();
    const actions = makeAuthActions(client);
    await actions.signIn('a@b.co', 'pw');
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'pw',
    });
    await actions.signOut();
    expect(signOut).toHaveBeenCalled();
  });
});
