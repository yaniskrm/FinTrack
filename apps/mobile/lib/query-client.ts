import { QueryClient } from "@tanstack/react-query";
import { storage } from "./mmkv";

/**
 * Custom MMKV-backed storage for TanStack Query persistence.
 * Replaces AsyncStorage — synchronous reads, no I/O latency on startup.
 */
export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min — data stays fresh
      gcTime: 1000 * 60 * 60 * 24, // 24h — kept in MMKV cache
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});
