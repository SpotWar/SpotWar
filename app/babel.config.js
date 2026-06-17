module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo bundles the expo-router plugin (require.context + route
  // typing), so no separate plugin entry is needed.
  return {
    presets: ['babel-preset-expo'],
  };
};
