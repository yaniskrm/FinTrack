import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useLockStore } from "@/stores/lock.store";
import { useBiometrics } from "./useBiometrics";

const BIOMETRICS_ENABLED_KEY = "fintrack:biometrics_enabled";
// Lock app after 5 minutes in background
const LOCK_AFTER_MS = 5 * 60 * 1000;

export function useAppLock() {
  const { isLocked, biometricsEnabled, lock, unlock, setBiometricsEnabled } = useLockStore();
  const { isAvailable, isEnrolled, authenticate } = useBiometrics();
  const backgroundTimestamp = useRef<number | null>(null);

  // Restore biometrics preference from SecureStore on mount
  useEffect(() => {
    void (async () => {
      const stored = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      setBiometricsEnabled(stored === "true");
    })();
  }, [setBiometricsEnabled]);

  // Lock when app goes to background, unlock prompt when it comes back
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "background" || nextState === "inactive") {
          backgroundTimestamp.current = Date.now();
        }

        if (nextState === "active" && biometricsEnabled) {
          const elapsed = backgroundTimestamp.current
            ? Date.now() - backgroundTimestamp.current
            : Infinity;

          if (elapsed >= LOCK_AFTER_MS) {
            lock();
          }
          backgroundTimestamp.current = null;
        }
      },
    );

    return () => subscription.remove();
  }, [biometricsEnabled, lock]);

  const promptUnlock = useCallback(async (): Promise<boolean> => {
    if (!isLocked) return true;
    const success = await authenticate("Déverrouillez FinTrack pour continuer");
    if (success) unlock();
    return success;
  }, [isLocked, authenticate, unlock]);

  const enableBiometrics = useCallback(
    async (enable: boolean): Promise<boolean> => {
      if (enable) {
        // Require a successful auth before enabling
        const success = await authenticate(
          "Authentifiez-vous pour activer le verrouillage biométrique",
        );
        if (!success) return false;
      }
      await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, String(enable));
      setBiometricsEnabled(enable);
      return true;
    },
    [authenticate, setBiometricsEnabled],
  );

  return {
    isLocked,
    biometricsEnabled,
    biometricsAvailable: isAvailable && isEnrolled,
    promptUnlock,
    enableBiometrics,
  };
}
