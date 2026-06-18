import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useI18n, SUPPORTED_LANGUAGES, type Language } from '../../lib/i18n';

/**
 * Language selector. This placeholder already wires the real i18n contract —
 * tapping a language persists it via `setLanguage` — because subtask 03's visual
 * pass only restyles it; the behavior (persist + apply globally) lives here.
 */
export default function LanguageScreen() {
  const { language, setLanguage, t } = useI18n();
  const router = useRouter();

  const choose = async (next: Language) => {
    await setLanguage(next);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('language.title')}</Text>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Pressable
          key={lang}
          onPress={() => choose(lang)}
          style={[styles.option, lang === language && styles.optionActive]}
        >
          <Text>{lang === 'fr' ? t('language.french') : t('language.english')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 26,
  },
  title: { fontSize: 24, fontWeight: '700' },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.16)',
  },
  optionActive: { borderColor: '#9DAE3C', borderWidth: 2 },
});
