// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// NOTE: The Tamagui Metro plugin was removed. The app does not use Tamagui —
// UI primitives (YStack/XStack/Text) are implemented directly on React Native
// in src/shared/ui/primitives/Stacks.tsx. The plugin referenced an uninstalled
// `tamagui` package and a missing `tamagui.config.ts`, which corrupted the
// Metro config used by the Android JS bundling step.
module.exports = config;
