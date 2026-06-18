import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme/tokens';

/**
 * The "SPOTWAR" wordmark. The middle **O** is replaced by a territory marker: a
 * ring (accent-colored border) with a centered solid dot, rendered inline as
 * `SP [marker] TWAR`. The marker diameter is 0.78× the cap height and the dot is
 * 0.34× the ring, matching the handoff's `Wordmark`.
 *
 * Accessibility: the marker is decorative, so the whole mark reads as "SPOTWAR".
 */
export function Wordmark({
  size = 34,
  color = colors.text,
  accent = colors.accent,
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  const ring = size * 0.78;
  const dot = ring * 0.34;
  const border = Math.max(2, size * 0.085);

  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel="SPOTWAR"
    >
      <Text style={[styles.text, { fontSize: size, color }]}>SP</Text>
      <View
        style={[
          styles.marker,
          { width: ring, height: ring, marginHorizontal: size * 0.02 },
        ]}
      >
        <View
          style={[
            styles.ring,
            { borderRadius: ring / 2, borderWidth: border, borderColor: accent },
          ]}
        />
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: accent,
          }}
        />
      </View>
      <Text style={[styles.text, { fontSize: size, color }]}>TWAR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: {
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  marker: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
