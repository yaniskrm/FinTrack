import { Redirect } from "expo-router";

/**
 * Root index — the AuthGuard in _layout.tsx handles all routing logic.
 * This redirect is just a fallback for deep link resolution.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
