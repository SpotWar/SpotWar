import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';

import { AuthProvider, useAuth } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import { gateDecision } from '../lib/gate';
import { useNightfallFonts } from '../theme/fonts';
import { colors } from '../theme/tokens';

/**
 * Root gate. Runs the pure `gateDecision` against the live auth state on every
 * change and redirects accordingly. Kept thin: all the routing rules live in
 * `lib/gate.ts` so they can be unit-tested without a router.
 */
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hold every redirect until the first auth event resolved the persisted
    // session, else a cold start bounces verified users through the auth stack.
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const target = gateDecision({ session, inAuthGroup });
    if (target) router.replace(target);
  }, [session, loading, segments, router]);

  // While the session restores, show a spinner rather than a screen from the
  // wrong group — the gate would otherwise flash it before redirecting.
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  // Load the Nightfall typefaces. We render regardless of `fontsLoaded` — text
  // falls back to the system font for a frame rather than blocking the gate —
  // but kicking the load off here warms them before the first screen paints.
  useNightfallFonts();

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AuthGate />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
