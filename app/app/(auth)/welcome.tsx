import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, SCREEN_PADDING } from '../../theme/tokens';
import { useI18n } from '../../lib/i18n';
import {
  AuthShell,
  NButton,
  NTag,
  Wordmark,
  TopoBackground,
  Heading,
  Body,
  Mono,
  useIsWide,
} from '../../components/ui';

/**
 * Entry/splash. Full-bleed dark with the topo texture; content is bottom-aligned.
 * Primary "Create account" → sign-up, ghost "I already have an account" → login.
 *
 * On wide viewports the shared `AuthShell` renders the brand art in its left
 * panel and centers these CTAs in the form column, so we skip Welcome's own
 * full-bleed background there to avoid doubling the art.
 */
export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();

  const content = (
    <>
      <View style={styles.hero}>
        <NTag label={t('auth.welcome.tag')} />
        <Wordmark size={64} />
        <Heading size={40} style={styles.title}>
          {t('auth.welcome.title')}
        </Heading>
        <Body style={styles.body}>{t('auth.welcome.body')}</Body>
      </View>

      <View style={styles.actions}>
        <NButton
          label={t('auth.welcome.create')}
          icon="bolt"
          onPress={() => router.push('/(auth)/sign-up')}
          testID="welcome-create"
        />
        <NButton
          label={t('auth.welcome.haveAccount')}
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
          testID="welcome-login"
        />
        <View style={styles.runners}>
          <View style={styles.cluster}>
            {[colors.accent, colors.blue, colors.ok].map((c, i) => (
              <View
                key={c}
                style={[styles.avatar, { backgroundColor: c, marginLeft: i ? -8 : 0 }]}
              />
            ))}
          </View>
          <Mono>{t('auth.welcome.runnersCount')}</Mono>
        </View>
      </View>
    </>
  );

  if (isWide) {
    return <AuthShell scroll={false}>{content}</AuthShell>;
  }

  return (
    <View style={styles.phoneRoot}>
      <TopoBackground />
      <View
        style={[
          styles.phoneContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 },
        ]}
      >
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneRoot: { flex: 1, backgroundColor: colors.bg },
  phoneContent: {
    flex: 1,
    width: '100%',
    // Cap the column on wider-than-phone web windows (below the 900px split
    // breakpoint) so content stays phone-sized and centered instead of sprawling.
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: SCREEN_PADDING,
    justifyContent: 'flex-end',
  },
  hero: { flex: 1, justifyContent: 'center', gap: 18 },
  title: { maxWidth: 300 },
  body: { maxWidth: 300 },
  // Guaranteed separation from the hero block: the hero is flex:1 and centers
  // its content, so without this the body text can sit right on the buttons when
  // the viewport is short (e.g. web windows).
  actions: { gap: 12, marginTop: 32 },
  runners: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  cluster: { flexDirection: 'row' },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
