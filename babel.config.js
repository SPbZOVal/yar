// babel-preset-expo (SDK 56) bundles the Reanimated/Worklets plugin, so no manual plugin entry.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
