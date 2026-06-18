import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/tokens';

/**
 * The walkthrough-style progress bars: a row of `total` flex segments; the one
 * at `active` (1-based) is the accent, the rest are `lineStrong`. The auth flow
 * itself doesn't paginate, but Language/Sign-up sit at steps 1–2 of a 6-step
 * onboarding, so this is here for those and the deferred walkthrough.
 */
export function NStepDots({
  active,
  total = 6,
}: {
  active: number;
  total?: number;
}) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: i === active ? colors.accent : colors.lineStrong },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  bar: { height: 4, flex: 1, borderRadius: 2 },
});
