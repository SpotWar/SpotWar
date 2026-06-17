import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { isSupabaseConfigured } from '../lib/supabase';
import { pingRoundTrip, type Ping } from '../lib/ping';

/**
 * RootScreen is the single top-level screen of the SpotWar app.
 *
 * It renders a small status panel for the "hello world" slice: 86badf566 wires
 * the Supabase client and shows whether its env config resolved; 86badf56w
 * renders a ping round-trip below it. Keep this the one place the app tree hangs
 * off of so those changes have a stable seam to plug into.
 */
export default function RootScreen() {
  // The ping round-trip (86badf56w): write one row then read the latest back,
  // proving the Expo ↔ Supabase wiring. State machine is loading → ok | error.
  const [ping, setPing] = useState<Ping | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  useEffect(() => {
    // Skip the round-trip when the client has no config — it would only fail
    // with a network error, which the status line above already explains.
    if (!isSupabaseConfigured) {
      return;
    }
    let cancelled = false;
    pingRoundTrip()
      .then((row) => {
        if (!cancelled) {
          setPing(row);
          setPingError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPingError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotWar — hello</Text>
      <Text style={isSupabaseConfigured ? styles.ok : styles.warn}>
        {isSupabaseConfigured
          ? 'Supabase: configured'
          : 'Supabase: not configured (copy app/.env.example to app/.env)'}
      </Text>
      {isSupabaseConfigured && (
        <Text style={pingError ? styles.warn : styles.ping}>
          {pingError
            ? `ping failed: ${pingError}`
            : ping
              ? `last ping: ${ping.id} @ ${ping.created_at}`
              : 'ping: …'}
        </Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  ok: {
    marginTop: 8,
    fontSize: 14,
    color: '#1a7f37',
  },
  warn: {
    marginTop: 8,
    fontSize: 14,
    color: '#bf4400',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  ping: {
    marginTop: 8,
    fontSize: 13,
    color: '#57606a',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
