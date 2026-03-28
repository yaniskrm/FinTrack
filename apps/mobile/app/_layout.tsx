import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth.store";
import { useLockStore } from "@/stores/lock.store";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const segments = useSegments();
  const { session, isInitialized, setSession, setInitialized } = useAuthStore();
  const { isLocked } = useLockStore();

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!isInitialized) {
          setInitialized();
          void SplashScreen.hideAsync();
        }
      },
    );

    // Get initial session
    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setInitialized();
      void SplashScreen.hideAsync();
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route guard — runs after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onLockScreen = segments[0] === "lock";

    if (!session && !inAuthGroup) {
      // Not signed in → send to sign-in
      router.replace("/(auth)/sign-in");
    } else if (session && isLocked && !onLockScreen) {
      // Signed in but locked → send to lock screen
      router.replace("/lock");
    } else if (session && !isLocked && (inAuthGroup || onLockScreen)) {
      // Signed in and unlocked → send to app
      router.replace("/(tabs)");
    }
  }, [session, isInitialized, isLocked, segments]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGuard />
    </QueryClientProvider>
  );
}
