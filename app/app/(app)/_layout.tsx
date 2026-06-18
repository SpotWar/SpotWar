import { Stack } from 'expo-router';

/**
 * The authenticated route group. Only the placeholder home lives here for now;
 * the real app shell (map, teams, profile) arrives in later epics.
 */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
