import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

/**
 * RootScreen is the single top-level screen of the SpotWar app.
 *
 * Today it renders a placeholder; later subtasks (86badf566 wires the Supabase
 * client, 86badf56w renders a ping round-trip) mount a status panel here. Keep
 * this the one place the app tree hangs off of so those changes have a stable
 * seam to plug into.
 */
export default function RootScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotWar — hello</Text>
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
});
