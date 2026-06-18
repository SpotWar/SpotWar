import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../theme/tokens';

/**
 * The faint topographic-grid backdrop used on Welcome and the web brand panel.
 * The handoff layers radial accent/blue glows, a 26px grid, and a bottom fade
 * over near-black.
 *
 * RN's `StyleSheet` can't express CSS `radial-gradient` / `background-image`, so
 * we approximate: a thin grid drawn with cheap absolutely-positioned hairlines,
 * plus two soft glow blobs. It reads as the same texture at the opacities used
 * here without pulling in a gradient/SVG dependency for a decorative layer.
 */
export function TopoBackground({
  style,
  cellSize = 26,
}: {
  style?: StyleProp<ViewStyle>;
  cellSize?: number;
}) {
  // A fixed, generous count of lines covers the largest screens we render on;
  // overflow is clipped by the parent's `overflow: hidden`.
  const lines = 32;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      <View
        style={[
          styles.glow,
          { top: '8%', left: '10%', backgroundColor: colors.accentDim },
        ]}
      />
      <View
        style={[
          styles.glow,
          { bottom: '12%', right: '8%', backgroundColor: colors.blueDim },
        ]}
      />
      {Array.from({ length: lines }, (_, i) => (
        <View key={`h${i}`} style={[styles.hLine, { top: i * cellSize }]} />
      ))}
      {Array.from({ length: lines }, (_, i) => (
        <View key={`v${i}`} style={[styles.vLine, { left: i * cellSize }]} />
      ))}
    </View>
  );
}

const GRID = 'rgba(255, 255, 255, 0.035)';

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GRID },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: GRID },
});
