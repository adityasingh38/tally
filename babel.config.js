module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'transform-inline-environment-variables',
      // reanimated must be last
      'react-native-reanimated/plugin',
    ],
  };
};
