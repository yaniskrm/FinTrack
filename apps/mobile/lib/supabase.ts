import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createFinTrackClient } from "@fintrack/api-client";

/**
 * Supabase storage adapter backed by Keychain/Keystore (expo-secure-store).
 * JWT tokens are NEVER stored in AsyncStorage — security requirement.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = Constants.expoConfig?.extra?.["supabaseUrl"] as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.["supabaseAnonKey"] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createFinTrackClient(supabaseUrl, supabaseAnonKey);

// Override auth storage to use SecureStore
// @ts-expect-error — internal storage override
supabase.auth.storage = ExpoSecureStoreAdapter;
