import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme/tokens';
import { useI18n } from '../../lib/i18n';
import { heading } from '../../theme/typography';
import { TopoBackground } from './TopoBackground';
import { Wordmark } from './Wordmark';
import { NTag } from './NTag';

/**
 * The left brand panel of the web split-screen shell: topo backdrop, a wordmark
 * + season tag up top, the big Anton headline + caption in the middle, and the
 * runner-cluster + count at the bottom. Mounted only on wide viewports (the
 * phone layout never shows it), so it doesn't carry its own breakpoint logic.
 */
export function BrandPanel() {
  const { t } = useI18n();
  return (
    <View style={styles.panel}>
      <TopoBackground />
      <View style={styles.fade} pointerEvents="none" />

      <View style={styles.top}>
        <Wordmark size={30} />
        <NTag label={t('common.season')} />
      </View>

      <View style={styles.middle}>
        <Text style={[heading(56), styles.headline]}>{t('auth.welcome.title')}</Text>
        <Text style={styles.caption}>{t('auth.welcome.body')}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.cluster}>
          {[colors.accent, colors.blue, colors.ok].map((c, i) => (
            <View
              key={c}
              style={[
                styles.avatar,
                { backgroundColor: c, marginLeft: i ? -9 : 0 },
              ]}
            />
          ))}
        </View>
        <Text style={styles.count}>{t('auth.welcome.runnersCount')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 560,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
    padding: 56,
  },
  fade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 16, 20, 0.55)',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  middle: { gap: 22 },
  headline: { maxWidth: 470 },
  caption: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 17 * 1.5,
    color: colors.muted,
    maxWidth: 400,
  },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cluster: { flexDirection: 'row' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.faint,
  },
});
