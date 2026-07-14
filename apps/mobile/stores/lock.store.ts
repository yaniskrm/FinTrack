import { create } from "zustand";

interface LockState {
  isLocked: boolean;
  biometricsEnabled: boolean;

  // Actions
  lock: () => void;
  unlock: () => void;
  setBiometricsEnabled: (enabled: boolean) => void;
}

export const useLockStore = create<LockState>((set) => ({
  isLocked: false,
  biometricsEnabled: false,

  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
}));
