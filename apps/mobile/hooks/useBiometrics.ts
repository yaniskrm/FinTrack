import { useCallback, useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

interface BiometricsState {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

interface UseBiometricsReturn extends BiometricsState {
  authenticate: (reason?: string) => Promise<boolean>;
}

function mapBiometricType(
  types: LocalAuthentication.AuthenticationType[],
): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "facial";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "none";
}

export function useBiometrics(): UseBiometricsReturn {
  const [state, setState] = useState<BiometricsState>({
    isAvailable: false,
    biometricType: "none",
    isEnrolled: false,
  });

  useEffect(() => {
    void (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setState({
        isAvailable: hasHardware,
        isEnrolled,
        biometricType: mapBiometricType(supportedTypes),
      });
    })();
  }, []);

  const authenticate = useCallback(
    async (reason = "Confirmez votre identité pour accéder à FinTrack") => {
      if (!state.isAvailable || !state.isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: "Annuler",
        disableDeviceFallback: false,
      });

      return result.success;
    },
    [state.isAvailable, state.isEnrolled],
  );

  return { ...state, authenticate };
}
