import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, SCREEN_PADDING } from '../../theme/tokens';
import { BrandPanel } from './BrandPanel';
import { useIsWide } from './useResponsive';

/**
 * The layout every auth screen renders inside. Two modes, switched on viewport
 * width (`react-native-web` breakpoint via `useIsWide`):
 *
 *  - **Phone:** a full-bleed dark, safe-area-padded, keyboard-avoiding scroll
 *    view; the screen's content fills the column with 26px side padding.
 *  - **Wide (web):** a two-column split — the `BrandPanel` on the left, the same
 *    content centered in a max-400 form column on the right with a hairline
 *    divider. Reuses the identical children, so a screen never branches on
 *    platform itself.
 *
 * `contentStyle` lets a screen tune the inner padding (e.g. Welcome bleeds its
 * background to the edges).
 */
export function AuthShell({
  children,
  scroll = true,
  edges = true,
}: {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default). Welcome opts out for a fixed layout. */
  scroll?: boolean;
  /** Apply top/bottom safe-area padding (default). */
  edges?: boolean;
}) {
  const isWide = useIsWide();
  const insets = useSafeAreaInsets();

  if (isWide) {
    return (
      <View style={styles.wideRoot}>
        <BrandPanel />
        <View style={styles.formColumn}>
          <View style={styles.formInner}>{children}</View>
        </View>
      </View>
    );
  }

  const padded = (
    <View
      style={[
        styles.phoneContent,
        edges && { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 22 },
      ]}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.phoneRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {padded}
        </ScrollView>
      ) : (
        padded
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  phoneRoot: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  phoneContent: {
    flex: 1,
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
  },
  wideRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  formColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 80,
    paddingVertical: 64,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  formInner: { width: '100%', maxWidth: 400, alignSelf: 'center' },
});
