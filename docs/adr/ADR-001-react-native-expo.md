# ADR-001 — React Native + Expo (vs Flutter, PWA)

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack needs iOS-first mobile delivery, with Android and potential Web support from a single codebase.

## Decision

Use **React Native + Expo SDK 52** with Expo Router for file-based navigation.

## Reasoning

| Criterion | React Native + Expo | Flutter | PWA only |
|---|---|---|---|
| iOS push notifications | Native (APNs) | Native | Limited |
| Biometrics (Face ID) | `expo-local-authentication` | `local_auth` | Not available |
| Secure token storage | `expo-secure-store` → Keychain | `flutter_secure_storage` | Not available |
| JS ecosystem | Full access | Dart ecosystem | Full access |
| Expo EAS | Build + OTA + Submit | Manual | N/A |
| Dev experience | Hot reload, web preview | Hot reload | Fast iteration |

Key factors:
- **JS/TS ecosystem** — team expertise, shared types with backend
- **Expo EAS** — zero-config CI/CD, OTA updates, App Store submission
- **Native security APIs** — Keychain/Keystore for JWT storage (requirement)

## Consequences

- Metro bundler for development
- `babel-preset-expo` for transpilation
- Reanimated + Gesture Handler for smooth animations
- EAS Build for CI/CD (replaces manual Xcode/Gradle)
