import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';

import { AuthProvider, useAuth } from '../lib/auth';
import { I18nProvider } from '../lib/i18n';
import { gateDecision } from '../lib/gate';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AuthGate />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
