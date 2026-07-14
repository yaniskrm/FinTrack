export const colors = {
  // Brand
  primary: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },

  // Semantic
  success: {
    light: "#D1FAE5",
    default: "#10B981",
    dark: "#065F46",
  },
  warning: {
    light: "#FEF3C7",
    default: "#F59E0B",
    dark: "#92400E",
  },
  danger: {
    light: "#FEE2E2",
    default: "#EF4444",
    dark: "#991B1B",
  },

  // Neutrals
  neutral: {
    0: "#FFFFFF",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712",
  },

  // Transaction types
  income: "#10B981",
  expense: "#EF4444",
  transfer: "#6366F1",
} as const;

export type Colors = typeof colors;
