import { Stack } from 'expo-router';

/**
 * The unauthenticated route group: welcome, language, sign-up, login,
 * verify-email, forgot-password. Headers are hidden here — subtask 03's screens
 * render the Nightfall chrome themselves.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
