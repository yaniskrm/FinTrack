import { useCallback, useEffect } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppLock } from "@/hooks/useAppLock";
import { signOut } from "@/lib/auth";

export default function LockScreen() {
  const { promptUnlock } = useAppLock();

  // Auto-trigger biometric prompt when screen appears
  useEffect(() => {
    void handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = useCallback(async () => {
    const success = await promptUnlock();
    if (success) {
      router.replace("/(tabs)");
    }
  }, [promptUnlock]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      "Se déconnecter",
      "Vous serez redirigé vers l'écran de connexion.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            await signOut();
            // Root layout handles redirect to (auth)
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🔒</Text>
        </View>

        <Text style={styles.title}>FinTrack verrouillé</Text>
        <Text style={styles.subtitle}>
          Authentifiez-vous pour accéder à vos finances
        </Text>

        <Pressable style={styles.button} onPress={handleUnlock}>
          <ActivityIndicator color="#fff" style={{ display: "none" }} />
          <Text style={styles.buttonText}>Déverrouiller</Text>
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    color: "#EF4444",
  },
});
