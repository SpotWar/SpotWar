import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts } from '../../theme/tokens';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import {
  isValidEmail,
  isValidNametag,
  isPasswordValid,
  passwordStrength,
} from '../../lib/validation';
import { mapSignUpError } from '../../lib/auth-errors';
import { verifyEmailRedirect } from '../../lib/redirects';
import {
  AuthShell,
  NButton,
  NField,
  NStrength,
  NTopBar,
  Icon,
  Heading,
  Body,
} from '../../components/ui';

/**
 * Sign up (onboarding step 2/6). Wires `useAuth().signUp`, which forwards
 * `{ nametag, preferred_language }` as user metadata for subtask 01's
 * `handle_new_user()` trigger.
 *
 * Validation model:
 *  - email / password are validated locally and surfaced as field errors only
 *    AFTER a blur or submit (not on every keystroke), so the field doesn't flash
 *    red while typing;
 *  - the submit button is disabled until nametag + valid email + policy-passing
 *    password + terms accepted (pitfall);
 *  - the duplicate-nametag error is NOT a client check — it comes back from the
 *    DB as `23505` on submit and is mapped onto the nametag field;
 *  - on success the stack runs with confirmations on, so `signUp` returns no
 *    usable session — we route to verify-email rather than assuming a session.
 */
export default function SignUp() {
  const { t, language } = useI18n();
  const { signUp } = useAuth();
  const router = useRouter();

  const [nametag, setNametag] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Which fields have been "touched" (blurred or submit-attempted) — gates when
  // we show an error so the field isn't red mid-typing.
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  // Server-returned field error (e.g. nametag 23505). Cleared as the user edits.
  const [serverError, setServerError] = useState<{
    field: 'nametag' | 'email' | 'password' | null;
    message: string;
  } | null>(null);

  const emailOk = isValidEmail(email);
  const passwordOk = isPasswordValid(password);
  const nametagOk = isValidNametag(nametag);
  const strength = passwordStrength(password);

  const formValid = nametagOk && emailOk && passwordOk && terms;

  const emailError = useMemo(() => {
    if (serverError?.field === 'email') return serverError.message;
    if (touched.email && email.length > 0 && !emailOk)
      return t('auth.error.invalidEmail');
    return null;
  }, [serverError, touched.email, email, emailOk, t]);

  const passwordError = useMemo(() => {
    if (serverError?.field === 'password') return serverError.message;
    if (touched.password && password.length > 0 && !passwordOk)
      return t('auth.error.passwordWeak');
    return null;
  }, [serverError, touched.password, password, passwordOk, t]);

  const nametagError =
    serverError?.field === 'nametag' ? serverError.message : null;

  const onSubmit = async () => {
    if (!formValid || submitting) return;
    setServerError(null);
    setSubmitting(true);
    const { error } = await signUp({
      email: email.trim(),
      password,
      nametag: nametag.trim(),
      preferred_language: language,
      // Point the verification link back at the app so the gate routes the
      // now-confirmed user in (01 allow-lists this URL).
      emailRedirectTo: verifyEmailRedirect(),
    });
    setSubmitting(false);

    if (error) {
      const mapped = mapSignUpError(error);
      setServerError({ field: mapped.field, message: t(mapped.messageKey) });
      return;
    }
    // Confirm-required: no session yet. Hand off to verify-email with the address
    // so the screen can name it; the root gate also parks unverified users here.
    router.replace({
      pathname: '/(auth)/verify-email',
      params: { email: email.trim() },
    });
  };

  return (
    <AuthShell>
      <NTopBar onBack={() => router.back()} stepLabel={t('auth.signUp.step')} />
      <Heading size={36} style={styles.title}>
        {t('auth.signUp.title')}
      </Heading>
      <Body size={14.5} style={styles.subtitle}>
        {t('auth.signUp.subtitle')}
      </Body>

      <View style={styles.fields}>
        <NField
          testID="signup-nametag"
          label={t('auth.signUp.nametag')}
          icon="user"
          value={nametag}
          onChangeText={(v) => {
            setNametag(v);
            if (serverError?.field === 'nametag') setServerError(null);
          }}
          placeholder={t('auth.signUp.nametagPlaceholder')}
          error={nametagError}
          valid={nametagOk && !nametagError}
        />

        <NField
          testID="signup-email"
          label={t('auth.signUp.email')}
          icon="mail"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (serverError?.field === 'email') setServerError(null);
          }}
          onBlur={() => setTouched((s) => ({ ...s, email: true }))}
          placeholder={t('auth.signUp.emailPlaceholder')}
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
          valid={emailOk && !emailError}
        />

        <View>
          <NField
            testID="signup-password"
            label={t('auth.signUp.password')}
            icon="lock"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (serverError?.field === 'password') setServerError(null);
            }}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            secureTextEntry
            autoComplete="password-new"
            error={passwordError}
          />
          {password.length > 0 && <NStrength level={strength} />}
          <Text style={styles.rule}>{t('auth.signUp.passwordRule')}</Text>
        </View>
      </View>

      <Pressable
        testID="signup-terms"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        onPress={() => setTerms((v) => !v)}
        style={styles.termsRow}
      >
        <View style={[styles.checkbox, terms && styles.checkboxOn]}>
          {terms && <Icon name="check" size={13} color={colors.onAccent} />}
        </View>
        <Text style={styles.termsText}>{t('auth.signUp.terms')}</Text>
      </Pressable>

      <View style={styles.spacer} />

      <NButton
        testID="signup-submit"
        label={submitting ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
        icon="bolt"
        loading={submitting}
        disabled={!formValid}
        onPress={onSubmit}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.signUp.footer')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.footerLink}>{t('auth.signUp.footerLink')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 24 },
  fields: { gap: 16 },
  rule: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.04,
    color: colors.muted,
    marginTop: 8,
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  termsText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: colors.muted,
  },
  spacer: { flexGrow: 1, minHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
});
