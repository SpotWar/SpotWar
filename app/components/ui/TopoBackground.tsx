import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { colors, rgba } from '../../theme/tokens';

/**
 * The SpotWar tactical-war-room backdrop (Welcome + web brand panel). A full-bleed
 * stack of layers over base `#0E1014`, bottom-to-top:
 *
 *  1. Grid+map  — a faint 24px SVG grid plus a handful of %-positioned territory
 *                 tiles (team accent / blue / neutral, low opacity): the abstract
 *                 "map of contested neighbourhoods."
 *  2. Scrim     — a vertical fade to solid `#0E1014` so headline + CTAs stay legible.
 *
 * The "red" team uses the single `accent` token (via `rgba(colors.accent, …)`),
 * so the whole scene reskins army-green ⇄ ember-red from one place. `blue` and
 * the neutral white are fixed, non-themeable team colors.
 */

const CELL = 24;
const GRID_LINE = 'rgba(255, 255, 255, 0.035)';

// Contested-neighbourhood tiles. Positions/sizes are viewport %s so they scale
// with the panel; `team` picks the tint, `op` the per-tile strength.
const TILES = [
  { left: '6%', top: '10%', width: '24%', height: '16%', team: 'accent', op: 0.16 },
  { left: '64%', top: '8%', width: '26%', height: '20%', team: 'blue', op: 0.16 },
  { left: '38%', top: '30%', width: '22%', height: '15%', team: 'neutral', op: 0.05 },
  { left: '8%', top: '52%', width: '26%', height: '18%', team: 'blue', op: 0.12 },
  { left: '60%', top: '60%', width: '28%', height: '16%', team: 'accent', op: 0.14 },
  { left: '34%', top: '74%', width: '24%', height: '14%', team: 'accent', op: 0.1 },
] as const;

function tileColor(team: 'accent' | 'blue' | 'neutral', op: number): string {
  if (team === 'accent') return rgba(colors.accent, op);
  if (team === 'blue') return rgba(colors.blue, op);
  return `rgba(255, 255, 255, ${op})`;
}

export function TopoBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      {/* Grid + territory tiles */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <Path d={`M${CELL} 0 H0 V${CELL}`} stroke={GRID_LINE} strokeWidth={1} fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>
      {TILES.map((tile, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: tile.width,
            height: tile.height,
            backgroundColor: tileColor(tile.team, tile.op),
          }}
        />
      ))}

      {/* Legibility scrim */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['rgba(14, 16, 20, 0.5)', 'rgba(14, 16, 20, 0.2)', colors.bg]}
        locations={[0, 0.4, 0.88]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, overflow: 'hidden' },
});
