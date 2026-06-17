// Default Expo Metro config. expo-router's require.context support is enabled by
// `babel-preset-expo`, so the stock config is enough — this file exists because
// expo-router expects a project-level metro.config.js to be present.
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = getDefaultConfig(__dirname);
