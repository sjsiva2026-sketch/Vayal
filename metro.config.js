// metro.config.js
// Expo SDK 52 / React Native 0.76 / Firebase 10.x
//
// Key fixes:
// 1. sourceExts includes 'cjs' — required for Firebase modular SDK tree-shaking
// 2. unstable_enablePackageExports = false — Firebase 10.x has package.json
//    exports that conflict with Metro 0.81 on RN 0.76; disabling avoids
//    "could not be found" resolution errors for firebase/auth, firebase/firestore, etc.
//    See: https://github.com/expo/expo/issues/36551

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve Firebase's CommonJS bundles
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
];

// Disable package.json exports resolution — Firebase 10.x incompatible with Metro's impl
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
