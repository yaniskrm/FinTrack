import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "FinTrack",
  slug: "fintrack",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fintrack",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#6366F1",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.fintrack.app",
    infoPlist: {
      // Block screenshots on sensitive screens
      UIScreenCaptureEnabled: false,
      NSFaceIDUsageDescription: "FinTrack uses Face ID to secure your financial data.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#6366F1",
    },
    package: "com.fintrack.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Allow FinTrack to use Face ID to authenticate you.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#6366F1",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "YOUR_EAS_PROJECT_ID",
    },
  },
};

export default config;
