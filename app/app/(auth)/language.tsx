import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts, radius } from '../../theme/tokens';
import { useI18n, SUPPORTED_LANGUAGES, type Language } from '../../lib/i18n';
import {
  AuthShell,
  NButton,
  NTopBar,
  Icon,
  Heading,
  Mono,
} from '../../components/ui';

/**
 * Language selection (onboarding step 1/6). Two selectable cards (FR default).
 * The choice is staged locally and only persisted via `setLanguage` on Continue,
 * so the screen previews the pick (the whole app reskins its strings) without
 * committing until the user advances — then routes on to sign-up.
 */
export default function LanguageScreen() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<Language>(language);

  const meta: Record<Language, { code: string; name: string; region: string }> = {
    fr: {
      code: 'FR',
      name: t('language.french'),
      region: t('language.frenchRegion'),
    },
    en: {
      code: 'EN',
      name: t('language.english'),
      region: t('language.englishRegion'),
    },
  };

  const onContinue = async () => {
    await setLanguage(selected);
    router.push('/(auth)/sign-up');
  };

  return (
    <AuthShell>
      <NTopBar stepLabel={t('language.step')} />
      <Heading style={styles.title}>{t('language.title')}</Heading>
      <Mono style={styles.subtitle}>{t('language.subtitle')}</Mono>

      <View style={styles.cards}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const on = selected === lang;
          const m = meta[lang];
          return (
            <Pressable
              key={lang}
              testID={`lang-${lang}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(lang)}
              style={[styles.card, on && styles.cardActive]}
            >
              <View style={styles.codeTile}>
                <Text style={[styles.code, { color: on ? colors.accent : colors.text }]}>
                  {m.code}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{m.name}</Text>
                <Mono style={styles.cardRegion}>{m.region}</Mono>
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>
                {on && <Icon name="check" size={14} color={colors.onAccent} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />
      <NButton
        label={t('common.continue')}
        icon="arrow"
        onPress={onContinue}
        testID="language-continue"
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 6 },
  subtitle: { marginBottom: 26 },
  cards: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  cardActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  codeTile: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { fontFamily: fonts.display, fontSize: 18 },
  cardBody: { flex: 1 },
  cardName: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  cardRegion: { marginTop: 3, color: colors.muted },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  spacer: { flexGrow: 1, minHeight: 24 },
});
