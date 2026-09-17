module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Vision Camera frame processors (worklets-core).
      // Reanimated 4 / react-native-worklets plugin is auto-added by babel-preset-expo — do not list it again.
      "react-native-worklets-core/plugin",
    ],
  };
};
