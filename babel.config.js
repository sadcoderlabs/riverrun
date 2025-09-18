// This file is required by reown AppKit
// https://docs.reown.com/appkit/react-native/core/installation#create-babel-config-js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
