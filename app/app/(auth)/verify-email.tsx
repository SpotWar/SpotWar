import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { colors, fonts } from '../../theme/tokens';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { verifyEmailRedirect } from '../../lib/redirects';
import {
  AuthShell,
  NButton,
  Icon,
  Heading,
  Body,
  Mono,
} from '../../components/ui';

/** Resend cooldown, seconds — matches the design's "0:42" countdown. */
const RESEND_COOLDOWN = 42;

/**
 * Where the root gate parks an authenticated-but-unverified user (and where
 * sign-up routes after submit). Centered mail icon, "check your inbox" copy
 * naming the address, "Open mail app", and a "Resend link" button that counts
 * down before it can be pressed again.
 *
 * The address comes from the route param on the sign-up hand-off; if the user
 * landed here from a cold start (gate redirect) we fall back to the session
 * email. Resend uses `supabase.auth.resend` directly — subtask 02's AuthProvider
 * doesn't expose a resend, and adding one isn't our contract to change. "Change
 * it" signs out so the user can re-enter sign-up with a different email.
 */
export default function VerifyEmail() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const email = params.email ?? user?.email ?? '';
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN);
  const [resent, setResent] = useState(false);

  // Tick the cooldown down to 0; the resend button is disabled until it hits 0.
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const onResend = async () => {
    if (seconds > 0 || !email) return;
    setResent(false);
    // Resend the same verification link, pointed at the same redirect target as
    // the original signUp so a tapped link routes back into the app.
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: verifyEmailRedirect() },
    });
    setResent(true);
    setSeconds(RESEND_COOLDOWN);
  };

  const onOpenMail = () => {
    // Best-effort: open the default mail client. No-op if none is registered.
    const url = Platform.OS === 'web' ? 'https://mail.google.com' : 'message:';
    Linking.openURL(url).catch(() => {});
  };

  const resendLabel =
    seconds > 0
      ? t('auth.verify.resendIn', { seconds: formatCountdown(seconds) })
      : t('auth.verify.resend');

  return (
    <AuthShell>
      <View style={styles.center}>
        <View style={styles.ring}>
          <View style={styles.disc}>
            <Icon name="mail" size={40} color={colors.accent} />
          </View>
        </View>
        <Mono style={styles.tag}>{t('auth.verify.tag')}</Mono>
        <Heading size={33} style={styles.title}>
          {t('auth.verify.title')}
        </Heading>
        <Body style={styles.body}>
          {t('auth.verify.body', { email: email || '…' })}
        </Body>
        {resent && (
          <Text style={styles.resent} testID="verify-resent">
            {t('auth.verify.resent')}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <NButton
          testID="verify-open-mail"
          label={t('auth.verify.openMail')}
          icon="mail"
          onPress={onOpenMail}
        />
        <NButton
          testID="verify-resend"
          label={resendLabel}
          variant="ghost"
          icon="refresh"
          disabled={seconds > 0}
          onPress={onResend}
        />
        <Pressable style={styles.changeRow} onPress={() => signOut()}>
          <Mono>
            {t('auth.verify.changeAddress')}{' '}
            <Text style={styles.changeLink}>{t('auth.verify.changeAddressLink')}</Text>
          </Mono>
        </Pressable>
      </View>
    </AuthShell>
  );
}

/** `42` → `0:42`, `5` → `0:05`. */
function formatCountdown(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  ring: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  disc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { color: colors.accent },
  title: { marginVertical: 8, textAlign: 'center' },
  body: { textAlign: 'center', maxWidth: 290 },
  resent: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ok, marginTop: 10 },
  actions: { gap: 12 },
  changeRow: { alignItems: 'center', marginTop: 4 },
  changeLink: { color: colors.text },
});
