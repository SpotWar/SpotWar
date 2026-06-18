import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, rgba } from '../../theme/tokens';

/**
 * Inline pill: a 5px dot + uppercase mono label. The background is the tag color
 * at 14% and the border at ~27% (the handoff's `${color}44`). Defaults to the
 * accent; pass `color` (e.g. `colors.blue`, `colors.ok`) for the variants.
 */
export function NTag({
  label,
  color = colors.accent,
}: {
  label: string;
  color?: string;
}) {
  // Accept either a hex or an rgba; derive the tint only when it's a hex.
  const bg = color.startsWith('#') ? rgba(color, 0.14) : color;
  const border = color.startsWith('#') ? rgba(color, 0.27) : color;
  return (
    <View
      style={[styles.tag, { backgroundColor: bg, borderColor: border }]}
      accessibilityRole="text"
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.18,
    textTransform: 'uppercase',
  },
});
