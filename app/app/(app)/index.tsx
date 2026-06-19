import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '../../theme/tokens';
import { useAuth } from '../../lib/auth';
import { useI18n, SUPPORTED_LANGUAGES } from '../../lib/i18n';
import { Heading, Mono, NButton } from '../../components/ui';

/**
 * Placeholder authenticated home — proof the gate lets a verified user in.
 * Replaced by the real app shell in a later epic; for now it shows who is signed
 * in (nametag from the profile when present), a settings surface with an FR/EN
 * language toggle, and sign-out.
 */
export default function Home() {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Heading style={styles.title}>{t('common.appName')}</Heading>
      <Text style={styles.who}>{profile?.nametag ?? user?.email ?? '—'}</Text>

      <View style={styles.settings}>
        <Mono style={styles.settingsTitle}>{t('settings.title')}</Mono>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <LanguageToggle />
      </View>

      <NButton
        variant="ghost"
        label={t('common.back')}
        onPress={() => signOut()}
        testID="home-sign-out"
      />
    </View>
  );
}

/**
 * FR/EN segmented control. The selection is read live from `useI18n().language`
 * (never snapshotted into local state) so the whole app reskins instantly on tap;
 * `setLanguage` owns both the local and profile persistence after subtask 02.
 */
function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <View style={styles.segment}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const on = language === lang;
        return (
          <Pressable
            key={lang}
            testID={`settings-lang-${lang}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setLanguage(lang)}
            style={[styles.option, on && styles.optionOn]}
          >
            <Text style={[styles.optionText, on && styles.optionTextOn]}>
              {lang.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xxl,
    backgroundColor: colors.bg,
  },
  title: { marginBottom: 2 },
  who: { fontSize: 16, color: colors.faint, fontFamily: fonts.body },
  settings: {
    width: '100%',
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  settingsTitle: { color: colors.muted },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    gap: space.xs,
  },
  option: {
    flex: 1,
    paddingVertical: space.sm,
    alignItems: 'center',
    borderRadius: radius.control,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  optionOn: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  optionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.muted,
  },
  optionTextOn: { color: colors.accent },
});
