import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { colors, fonts, radius, CONTROL_HEIGHT } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';

/**
 * The Nightfall text field. Renders the four documented states:
 *  - default: surface bg, hairline border, muted leading icon + label;
 *  - focused: accent border + accent focus ring (a subtle outer border on
 *    native, the design's `0 0 0 3px` ring on web), accent icon;
 *  - error: accent border, error-tint bg, accent label, trailing alert icon,
 *    helper row below;
 *  - valid: trailing green check.
 *
 * Focus is tracked internally (the design's caret/ring follow focus), but error
 * and valid are owned by the parent — they reflect submit/validation results,
 * not keystrokes. `secureTextEntry` adds a working eye toggle in the trailing
 * slot (the password-reveal interaction).
 */
export function NField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  valid = false,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  testID,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: IconName;
  /** When set, the field is in its error state and this string is shown below. */
  error?: string | null;
  valid?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  testID?: string;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  const hasError = Boolean(error);
  const borderColor = hasError || focused ? colors.accent : colors.line;
  const iconColor = hasError || focused ? colors.accent : colors.muted;
  const labelColor = hasError ? colors.accent : colors.muted;

  return (
    <View>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: hasError ? colors.accentErrBg : colors.surface,
          },
          focused && !hasError && styles.focusRing,
        ]}
      >
        {icon && <Icon name={icon} size={19} color={iconColor} />}
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          accessibilityLabel={label}
        />
        {secureTextEntry && (
          <Pressable
            testID={testID ? `${testID}-eye` : undefined}
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
          >
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={19} color={colors.muted} />
          </Pressable>
        )}
        {!secureTextEntry && valid && !hasError && (
          <Icon name="check" size={18} color={colors.ok} />
        )}
        {!secureTextEntry && hasError && (
          <Icon name="alert" size={18} color={colors.accent} />
        )}
      </View>
      {hasError && (
        <View style={styles.helperRow}>
          <Icon name="alert" size={13} color={colors.accent} />
          <Text style={styles.helperText} testID={testID ? `${testID}-error` : undefined}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.22,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: CONTROL_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  // The design's `0 0 0 3px redDim` focus ring. RN 0.85 supports `boxShadow`
  // cross-platform (a 3px spread, no blur), so the ring renders the same on web
  // and native without a separate shadow* fallback.
  focusRing: {
    boxShadow: `0 0 0 3px ${colors.accentDim}`,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.body,
    fontSize: 15.5,
    color: colors.text,
    // Strip Android's default vertical padding so the value centers in the 54px row.
    paddingVertical: 0,
    // react-native-web renders the input as a DOM <input>; kill the browser's
    // blue focus outline so only the design's green ring shows.
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  helperText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.04,
    color: colors.accent,
    flex: 1,
  },
});
