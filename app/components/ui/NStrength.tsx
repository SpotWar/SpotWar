import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme/tokens';
import { useI18n } from '../../lib/i18n';
import type { PasswordStrength } from '../../lib/validation';

/**
 * The 3-segment password-strength meter. `level` comes straight from
 * `passwordStrength()`:
 *  - 0 → nothing lit (used before the user types),
 *  - 1 Weak (accent), 2 Fair (warn), 3 Strong (ok).
 *
 * The fill color is the color of the *current* level (so a Fair meter lights two
 * warn-colored segments), matching the handoff's `NStrength`.
 */
export function NStrength({ level }: { level: PasswordStrength }) {
  const { t } = useI18n();
  const palette = [colors.accent, colors.warn, colors.ok];
  const labels = [t('auth.strength.weak'), t('auth.strength.fair'), t('auth.strength.strong')];

  const fill = level > 0 ? palette[level - 1] : colors.surface2;
  const label = level > 0 ? labels[level - 1] : '';

  return (
    <View style={styles.row} accessibilityRole="progressbar" testID="password-strength">
      <View style={styles.track}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < level ? fill : colors.surface2 },
            ]}
          />
        ))}
      </View>
      {label !== '' && <Text style={[styles.label, { color: fill }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  track: { flexDirection: 'row', gap: 5, flex: 1 },
  segment: { height: 4, flex: 1, borderRadius: 2 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.14,
    textTransform: 'uppercase',
  },
});
