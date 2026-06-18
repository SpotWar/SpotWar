import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts } from '../../theme/tokens';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { isValidEmail } from '../../lib/validation';
import {
  AuthShell,
  NButton,
  NField,
  NTopBar,
  Icon,
  Heading,
  Body,
} from '../../components/ui';

/**
 * Request a password-reset email via `useAuth().resetPassword`. On success we
 * show an inline confirmation rather than navigating, so the user knows the mail
 * is on its way (it lands in Mailpit locally). We confirm even on error to avoid
 * leaking which emails are registered — Supabase returns 200 regardless, so the
 * only error path here is a transport failure, which we still treat as "sent".
 */
export default function ForgotPassword() {
  const { t } = useI18n();
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = isValidEmail(email);
  const emailError = useMemo(
    () => (email.length > 0 && !canSubmit ? t('auth.error.invalidEmail') : null),
    [email, canSubmit, t],
  );

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await resetPassword(email.trim());
    setSubmitting(false);
    setSent(true);
  };

  return (
    <AuthShell>
      <NTopBar onBack={() => router.back()} />
      <View style={styles.tile}>
        <Icon name="lock" size={28} color={colors.accent} />
      </View>
      <Heading style={styles.title}>{t('auth.forgot.title')}</Heading>
      <Body style={styles.body}>{t('auth.forgot.body')}</Body>

      <NField
        testID="forgot-email"
        label={t('auth.forgot.email')}
        icon="mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (sent) setSent(false);
        }}
        placeholder={t('auth.forgot.emailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        error={emailError}
      />
      {sent && (
        <Text style={styles.sent} testID="forgot-sent">
          {t('auth.forgot.sent')}
        </Text>
      )}

      <View style={styles.spacer} />

      <NButton
        testID="forgot-submit"
        label={submitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
        icon="arrow"
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.forgot.footer')} </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.footerLink}>{t('auth.forgot.footerLink')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { marginBottom: 10 },
  body: { marginBottom: 28, maxWidth: 300 },
  sent: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ok, marginTop: 12 },
  spacer: { flexGrow: 1, minHeight: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
});
