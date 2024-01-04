// eslint-disable-next-line strict
const webpack = require('webpack');

module.exports = function override(config) {
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  config.module.rules.push(
    {
      test: /\.js$/,
      enforce: "pre",
      use: ["source-map-loader"],
    }
  );
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};
