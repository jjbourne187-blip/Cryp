---
name: Expo 54 package version constraints
description: Compatible package versions for expo@~54.0.x in this project
---

## Rule
When adding Expo ecosystem packages to this project (expo@~54.0.x), always pin to the SDK-54-compatible version. The default `pnpm add` will often resolve the latest major version which requires a newer SDK and crashes at runtime.

**Why:** expo-camera@56 was installed when latest was requested but the project uses expo@~54. The error `createPermissionHook is not a function` appeared because the newer package references SDK 56 internals. Downgrading to expo-camera@~16.0.18 fixed it.

**How to apply:** For any new `expo-*` package, check the Expo SDK 54 changelog or use `expo install` equivalent version. General rule: SDK 54 → package major ~16.x for camera, ~15.x for others. When in doubt, check `node_modules/expo/package.json` for `"version"` and match the ecosystem package to that SDK release.

## Known safe versions for Expo SDK 54
- expo-camera: ~16.0.18
- expo-haptics: ~15.0.8 (already installed)
- expo-blur: ~15.0.8 (already installed)
- expo-image-picker: ~17.0.9 (already installed)
