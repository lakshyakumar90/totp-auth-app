---
name: Expo SecureStore web preview
description: Browser previews can fail during SecureStore hydration even though native SecureStore is the correct production vault.
---

Use a Platform.OS === 'web' storage adapter for browser preview compatibility, while keeping expo-secure-store as the native iOS/Android implementation for tokens and TOTP secrets.

**Why:** The browser preview does not consistently implement Expo SecureStore's native keychain methods and can leave the app stuck before first render.

**How to apply:** Keep the adapter boundary in the vault/persistence module; never replace native secure storage with AsyncStorage for authentication tokens or secrets.