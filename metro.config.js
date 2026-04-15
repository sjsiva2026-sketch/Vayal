const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure firebase modules resolve correctly in native builds
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
