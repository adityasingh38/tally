module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'transform-inline-environment-variables',
      // worklets plugin must be last (Reanimated 4 moved the plugin here)
      'react-native-worklets/plugin',
    ],
  };
};
