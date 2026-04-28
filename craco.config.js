const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // face-api.js references Node-only modules (fs, path, crypto, etc.) for its
      // env detection. In a browser build these must be stubbed out, otherwise
      // webpack 5 fails with "Can't resolve 'fs'". Setting them to `false` tells
      // webpack to ship an empty module in their place.
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...(webpackConfig.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
        stream: false,
        util: false,
      };

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) =>
          typeof warning?.message === "string" &&
          warning.message.includes("Failed to parse source map") &&
          warning.message.includes(
            `${path.sep}node_modules${path.sep}face-api.js${path.sep}`
          ),
      ];

      return webpackConfig;
    },
  },
};
