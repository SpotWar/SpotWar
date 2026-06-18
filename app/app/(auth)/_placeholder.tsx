import { StyleSheet, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';

import { useI18n, type TranslationKey } from '../../lib/i18n';

/**
 * A minimal placeholder shell every `(auth)` screen reuses until subtask 03
 * replaces each with the real Nightfall screen. It exists only to prove the
 * route resolves and the i18n/router contract holds: it renders a translated
 * title and any "go to next screen" links so the navigation graph is walkable
 * end to end before the visual layer lands.
 */
export function AuthPlaceholder({
  titleKey,
  links = [],
}: {
  titleKey: TranslationKey;
  links?: { labelKey: TranslationKey; href: Href }[];
}) {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      {links.map((link) => (
        <Link key={String(link.href)} href={link.href} style={styles.link}>
          {t(link.labelKey)}
        </Link>
      ))}
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
  link: { fontSize: 16, color: '#3D7BFF' },
});
