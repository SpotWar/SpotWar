import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, CONTROL_HEIGHT } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';

export type NButtonVariant = 'primary' | 'ghost' | 'dark' | 'strava';

/**
 * The Nightfall button. Variants: `primary` (accent fill, dark text), `ghost`
 * (transparent + strong hairline), `dark` (surface2), `strava` (fixed orange —
 * NOT the accent). Height 54, radius 10 (NOT pill), Archivo-700 uppercase label.
 *
 * `loading` swaps the leading icon for a spinner, dims to 0.7, and disables
 * press — the screens use this in-place rather than a separate spinner screen
 * (pitfall). `disabled` dims further and blocks press.
 */
export function NButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  testID,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: NButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const isInactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        loading && styles.loading,
        disabled && styles.disabled,
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        icon && <Icon name={icon} size={19} color={v.fg} />
      )}
      <Text style={[styles.label, { color: v.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const VARIANTS: Record<
  NButtonVariant,
  { container: ViewStyle; fg: string }
> = {
  primary: {
    container: { backgroundColor: colors.accent },
    fg: colors.onAccent,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.lineStrong,
    },
    fg: colors.text,
  },
  dark: {
    container: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
    },
    fg: colors.text,
  },
  strava: {
    container: { backgroundColor: colors.strava },
    fg: colors.onStrava,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    width: '100%',
    height: CONTROL_HEIGHT,
    borderRadius: radius.control,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    letterSpacing: 15.5 * 0.04,
    textTransform: 'uppercase',
  },
  loading: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
