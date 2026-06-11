import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { isSupabaseConfigured } from '../lib/supabase';

/**
 * RootScreen is the single top-level screen of the SpotWar app.
 *
 * It renders a small status panel for the "hello world" slice: 86badf566 wires
 * the Supabase client and shows whether its env config resolved; 86badf56w
 * renders a ping round-trip below it. Keep this the one place the app tree hangs
 * off of so those changes have a stable seam to plug into.
 */
export default function RootScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotWar — hello</Text>
      <Text style={isSupabaseConfigured ? styles.ok : styles.warn}>
        {isSupabaseConfigured
          ? 'Supabase: configured'
          : 'Supabase: not configured (copy app/.env.example to app/.env)'}
      </Text>
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
});
