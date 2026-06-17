import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

/**
 * Where the gate parks an authenticated-but-unverified user. The "sign out"
 * escape hatch is wired now so a tester isn't stuck here; subtask 03 adds the
 * resend-with-countdown UI.
 */
export default function VerifyEmail() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.verify.title')}</Text>
      <Text style={styles.body}>{t('auth.verify.body')}</Text>
      <Pressable onPress={() => signOut()}>
        <Text style={styles.link}>{t('common.back')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 26,
  },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 15, textAlign: 'center', color: '#5C616C' },
  link: { fontSize: 16, color: '#3D7BFF' },
});
