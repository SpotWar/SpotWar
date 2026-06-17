import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

/**
 * Placeholder authenticated home — proof the gate lets a verified user in.
 * Replaced by the real app shell in a later epic; for now it shows who is signed
 * in (nametag from the profile when present) and offers sign-out.
 */
export default function Home() {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.who}>{profile?.nametag ?? user?.email ?? '—'}</Text>
      <Pressable onPress={() => signOut()} style={styles.button}>
        <Text style={styles.buttonText}>{t('common.back')}</Text>
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
  title: { fontSize: 28, fontWeight: '800' },
  who: { fontSize: 16, color: '#5C616C' },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#9DAE3C',
  },
  buttonText: { color: '#140A07', fontWeight: '700' },
});
