import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme/tokens';
import { Icon } from './Icon';

/**
 * Top chrome for the auth screens: an optional 40px back button (left), an
 * optional centered `STEP n / 6` mono label, and an optional right-aligned text
 * action (e.g. SKIP — unused in auth, kept for the walkthrough). Empty 40px
 * spacers keep the center label centered when a side is absent.
 */
export function NTopBar({
  onBack,
  stepLabel,
  rightLabel,
  onRight,
}: {
  onBack?: () => void;
  stepLabel?: string;
  rightLabel?: string;
  onRight?: () => void;
}) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Icon name="back" size={19} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      {stepLabel ? <Text style={styles.step}>{stepLabel}</Text> : null}

      {rightLabel ? (
        <Pressable onPress={onRight} accessibilityRole="button">
          <Text style={styles.right}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 40 },
  step: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  right: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.muted,
  },
});
