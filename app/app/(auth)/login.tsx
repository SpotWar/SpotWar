import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts } from '../../theme/tokens';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { isValidEmail } from '../../lib/validation';
import { mapSignInError } from '../../lib/auth-errors';
import {
  AuthShell,
  NButton,
  NField,
  NTopBar,
  Wordmark,
  Heading,
  Body,
} from '../../components/ui';

/**
 * Returning-user login. On success the root gate takes over: a verified user is
 * routed into the app, an unverified one to verify-email — so this screen only
 * needs to call `signIn` and surface a form-level error. The submit button shows
 * its own loading state (no spinner screen). "Forgot password?" → forgot-password.
 */
export default function Login() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = isValidEmail(email) && password.length > 0;

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setFormError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setFormError(t(mapSignInError(error).messageKey));
    }
    // On success the gate redirects; nothing to do here.
  };

  // Show the email format hint only once there's input and it's malformed.
  const emailError = useMemo(
    () => (email.length > 0 && !isValidEmail(email) ? t('auth.error.invalidEmail') : null),
    [email, t],
  );

  return (
    <AuthShell>
      <NTopBar onBack={() => router.back()} />
      <View style={styles.wordmark}>
        <Wordmark size={30} />
      </View>
      <Heading size={38} style={styles.title}>
        {t('auth.login.title')}
      </Heading>
      <Body size={14.5} style={styles.subtitle}>
        {t('auth.login.subtitle')}
      </Body>

      <View style={styles.fields}>
        <NField
          testID="login-email"
          label={t('auth.login.email')}
          icon="mail"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (formError) setFormError(null);
          }}
          placeholder={t('auth.login.emailPlaceholder')}
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
        />
        <NField
          testID="login-password"
          label={t('auth.login.password')}
          icon="lock"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (formError) setFormError(null);
          }}
          secureTextEntry
          autoComplete="password"
          error={formError}
        />
      </View>

      <Pressable
        style={styles.forgotRow}
        onPress={() => router.push('/(auth)/forgot-password')}
      >
        <Text style={styles.forgot}>{t('auth.login.forgot')}</Text>
      </Pressable>

      <View style={styles.spacer} />

      <NButton
        testID="login-submit"
        label={submitting ? t('auth.login.submitting') : t('auth.login.submit')}
        icon="arrow"
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.login.footer')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
          <Text style={styles.footerLink}>{t('auth.login.footerLink')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  wordmark: { marginBottom: 30, alignSelf: 'flex-start' },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 28 },
  fields: { gap: 16 },
  forgotRow: { alignSelf: 'flex-end', marginTop: 14 },
  forgot: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.accent },
  spacer: { flexGrow: 1, minHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
});
